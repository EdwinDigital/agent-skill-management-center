import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "src-tauri", "sidecar-node");
const packageRoots = ["express", "@github/copilot-sdk"];
const nativeTarget = `${process.platform}-${process.arch}`;
const nodeRuntimeVersion = "24.11.1";
const nodeRuntimeTargets = {
  "darwin-arm64": {
    archive: `node-v${nodeRuntimeVersion}-darwin-arm64.tar.gz`,
    directory: `node-v${nodeRuntimeVersion}-darwin-arm64`,
    executable: ["bin", "node"]
  },
  "win32-x64": {
    archive: `node-v${nodeRuntimeVersion}-win-x64.zip`,
    directory: `node-v${nodeRuntimeVersion}-win-x64`,
    executable: ["node.exe"]
  },
  "win32-arm64": {
    archive: `node-v${nodeRuntimeVersion}-win-arm64.zip`,
    directory: `node-v${nodeRuntimeVersion}-win-arm64`,
    executable: ["node.exe"]
  }
};

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(outputRoot, "node_modules"), { recursive: true });

copyPath("server.js", "server.js");
copyPath("server", "server");
copyPath("setup", "setup");
copyPath("core", "core");
copyPath("package.json", "package.json");
copyPath("public", "public");

const copiedPackages = new Set();
for (const packageName of packageRoots) {
  copyPackageWithDependencies(packageName);
}
copyCopilotNativeRuntimeCompat();
await copyBundledNodeRuntime();

console.log(`Prepared Agent SMC ${nativeTarget} sidecar runtime with ${copiedPackages.size} npm packages at ${path.relative(projectRoot, outputRoot)}`);

function copyPackageWithDependencies(packageName, parentDir = path.join(projectRoot, "node_modules")) {
  if (copiedPackages.has(packageName)) return;
  const packageDir = resolvePackageDir(packageName, parentDir);
  const destinationDir = path.join(outputRoot, "node_modules", packageName);
  fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
  fs.cpSync(packageDir, destinationDir, {
    recursive: true,
    dereference: true,
    filter: (source) => !shouldSkipPackageFile(source)
  });
  copiedPackages.add(packageName);

  const packageJson = JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"));
  for (const dependencyName of Object.keys(packageJson.dependencies || {})) {
    copyPackageWithDependencies(dependencyName, path.join(packageDir, "node_modules"));
  }
  for (const dependencyName of Object.keys(packageJson.optionalDependencies || {})) {
    if (canResolvePackage(dependencyName, path.join(packageDir, "node_modules"))) {
      copyPackageWithDependencies(dependencyName, path.join(packageDir, "node_modules"));
    }
  }
}

function resolvePackageDir(packageName, parentDir) {
  const candidates = [
    path.join(parentDir, packageName),
    path.join(projectRoot, "node_modules", packageName)
  ];
  const packageDir = candidates.find((candidate) => fs.existsSync(path.join(candidate, "package.json")));
  if (!packageDir) {
    throw new Error(`Unable to resolve npm package for sidecar: ${packageName}`);
  }
  return packageDir;
}

function canResolvePackage(packageName, parentDir) {
  try {
    resolvePackageDir(packageName, parentDir);
    return true;
  } catch {
    return false;
  }
}

function copyPath(from, to) {
  const source = path.join(projectRoot, from);
  const destination = path.join(outputRoot, to);
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, {
    recursive: true,
    dereference: true,
    filter: (entry) => !entry.includes(`${path.sep}dist${path.sep}`) || from === "public"
  });
}

function copyCopilotNativeRuntimeCompat() {
  const source = path.join(outputRoot, "node_modules", "@github", "copilot", "prebuilds", nativeTarget, "runtime.node");
  const destination = path.join(outputRoot, "node_modules", "runtime", `runtime.${nativeTarget}.node`);
  if (!fs.existsSync(source)) {
    throw new Error(`Copilot native runtime is missing for ${nativeTarget}: ${source}`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

async function copyBundledNodeRuntime() {
  const runtimeSource = await ensureOfficialNodeRuntime();
  const nodeExecutableName = process.platform === "win32" ? "node.exe" : "node";
  const bundledNodePath = path.join(outputRoot, "runtime", nodeExecutableName);
  fs.mkdirSync(path.dirname(bundledNodePath), { recursive: true });
  fs.copyFileSync(runtimeSource.executable, bundledNodePath);
  fs.copyFileSync(runtimeSource.license, path.join(outputRoot, "runtime", "LICENSE.node.txt"));
  if (process.platform !== "win32") {
    fs.chmodSync(bundledNodePath, 0o755);
  }
}

async function ensureOfficialNodeRuntime() {
  const target = nodeRuntimeTargets[nativeTarget];
  if (!target) {
    throw new Error(`Unsupported desktop runtime target: ${nativeTarget}`);
  }

  const nodeExecutableName = process.platform === "win32" ? "node.exe" : "node";
  const cacheRoot = path.join(projectRoot, "node_modules", ".cache", "agent-smc", "node-runtime", nodeRuntimeVersion, nativeTarget);
  const cachedExecutable = path.join(cacheRoot, nodeExecutableName);
  const cachedLicense = path.join(cacheRoot, "LICENSE.node.txt");
  if (fs.existsSync(cachedExecutable) && fs.existsSync(cachedLicense)) {
    return { executable: cachedExecutable, license: cachedLicense };
  }

  const preparationRoot = `${cacheRoot}.prepare-${process.pid}`;
  const extractionRoot = path.join(preparationRoot, "extracted");
  const archivePath = path.join(preparationRoot, target.archive);
  fs.rmSync(preparationRoot, { recursive: true, force: true });
  fs.mkdirSync(extractionRoot, { recursive: true });

  try {
    const distributionUrl = `https://nodejs.org/dist/v${nodeRuntimeVersion}`;
    const [archive, checksums] = await Promise.all([
      downloadBuffer(`${distributionUrl}/${target.archive}`),
      downloadText(`${distributionUrl}/SHASUMS256.txt`)
    ]);
    verifyArchiveChecksum(archive, checksums, target.archive);
    fs.writeFileSync(archivePath, archive);
    execFileSync("tar", ["-xf", archivePath, "-C", extractionRoot], { stdio: "inherit" });

    const distributionRoot = path.join(extractionRoot, target.directory);
    const sourceExecutable = path.join(distributionRoot, ...target.executable);
    const sourceLicense = path.join(distributionRoot, "LICENSE");
    if (!fs.existsSync(sourceExecutable) || !fs.existsSync(sourceLicense)) {
      throw new Error(`Node ${nodeRuntimeVersion} archive is incomplete for ${nativeTarget}`);
    }

    fs.mkdirSync(cacheRoot, { recursive: true });
    fs.copyFileSync(sourceExecutable, cachedExecutable);
    fs.copyFileSync(sourceLicense, cachedLicense);
    if (process.platform !== "win32") {
      fs.chmodSync(cachedExecutable, 0o755);
    }
    return { executable: cachedExecutable, license: cachedLicense };
  } finally {
    fs.rmSync(preparationRoot, { recursive: true, force: true });
  }
}

async function downloadBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function downloadText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

function verifyArchiveChecksum(archive, checksums, archiveName) {
  const checksumLine = checksums.split(/\r?\n/).find((line) => line.endsWith(`  ${archiveName}`));
  const expected = checksumLine?.trim().split(/\s+/)[0];
  const actual = createHash("sha256").update(archive).digest("hex");
  if (!expected || actual !== expected) {
    throw new Error(`Node runtime checksum mismatch for ${archiveName}`);
  }
}

function shouldSkipPackageFile(source) {
  const parts = source.split(path.sep);
  const skippedNames = new Set(["test", "tests", "__tests__", "docs", "doc", "example", "examples"]);
  const prebuildIndex = parts.findIndex((part) => part === "prebuilds");
  if (prebuildIndex >= 0) {
    const platformPart = parts[prebuildIndex + 1];
    return Boolean(platformPart && platformPart !== nativeTarget);
  }
  return parts.some((part) => skippedNames.has(part));
}