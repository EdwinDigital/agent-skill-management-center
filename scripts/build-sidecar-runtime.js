import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "src-tauri", "sidecar-node");
const packageRoots = ["express", "@github/copilot-sdk"];

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

const sidecarPath = path.join(outputRoot, "agent-smc-sidecar");
fs.writeFileSync(sidecarPath, `#!/usr/bin/env zsh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -x /opt/homebrew/bin/node ]]; then
  NODE_BIN=/opt/homebrew/bin/node
elif [[ -x /usr/local/bin/node ]]; then
  NODE_BIN=/usr/local/bin/node
else
  NODE_BIN=$(command -v node)
fi
exec "$NODE_BIN" "$SCRIPT_DIR/server.js"
`, { mode: 0o755 });
fs.chmodSync(sidecarPath, 0o755);

console.log(`Prepared Agent SMC sidecar runtime with ${copiedPackages.size} npm packages at ${path.relative(projectRoot, outputRoot)}`);

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
  const source = path.join(outputRoot, "node_modules", "@github", "copilot", "prebuilds", "darwin-arm64", "runtime.node");
  const destination = path.join(outputRoot, "node_modules", "runtime", "runtime.darwin-arm64.node");
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function shouldSkipPackageFile(source) {
  const parts = source.split(path.sep);
  const skippedNames = new Set(["test", "tests", "__tests__", "docs", "doc", "example", "examples"]);
  const prebuildIndex = parts.findIndex((part) => part === "prebuilds");
  if (prebuildIndex >= 0) {
    const platformPart = parts[prebuildIndex + 1];
    return Boolean(platformPart && platformPart !== "darwin-arm64");
  }
  return parts.some((part) => skippedNames.has(part));
}