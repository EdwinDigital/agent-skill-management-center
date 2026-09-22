import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const readText = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const screenshots = [
  "home-workbench.png",
  "skill-analysis.png",
  "skill-document.png",
  "skill-file-tree.png",
  "settings-models.png"
];

const bilingualDocs = [
  "overview",
  "architecture",
  "api-reference",
  "development",
  "desktop-release",
  "troubleshooting"
];

const communityFiles = [
  "LICENSE",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CHANGELOG.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml"
];

test("repository contains the expected open source community files", () => {
  for (const relativePath of communityFiles) {
    assert.equal(fs.existsSync(path.join(projectRoot, relativePath)), true, `${relativePath} must exist`);
  }
  assert.match(readText("LICENSE"), /MIT License/);
  assert.match(readText("SECURITY.md"), /security\/advisories\/new/);
});

test("documentation has complete English and Chinese pairs", () => {
  assert.equal(fs.existsSync(path.join(projectRoot, "docs", "README.md")), true);
  for (const name of bilingualDocs) {
    assert.equal(fs.existsSync(path.join(projectRoot, "docs", `${name}.md`)), true, `${name}.md must exist`);
    assert.equal(fs.existsSync(path.join(projectRoot, "docs", `${name}-CN.md`)), true, `${name}-CN.md must exist`);
  }
});

test("five valid PNG screenshots are referenced by both README files", () => {
  const english = readText("README.md");
  const chinese = readText("README-CN.md");
  for (const fileName of screenshots) {
    const relativePath = path.join("docs", "images", fileName);
    const absolutePath = path.join(projectRoot, relativePath);
    assert.equal(fs.existsSync(absolutePath), true, `${relativePath} must exist`);
    const image = fs.readFileSync(absolutePath);
    assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(image.readUInt32BE(16), 1756, `${relativePath} width must remain stable`);
    assert.equal(image.readUInt32BE(20), 1272, `${relativePath} height must remain stable`);
    assert.ok(image.length >= 100_000 && image.length <= 2_000_000, `${relativePath} file size is unexpected`);
    assert.match(english, new RegExp(`docs/images/${escapeRegex(fileName)}`));
    assert.match(chinese, new RegExp(`docs/images/${escapeRegex(fileName)}`));
  }
});

test("README header uses the application icon and private-repository-safe badges", () => {
  const iconPath = path.join(projectRoot, "docs", "images", "app-icon.png");
  assert.equal(fs.existsSync(iconPath), true, "docs/images/app-icon.png must exist");
  const icon = fs.readFileSync(iconPath);
  assert.deepEqual(icon.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(icon.readUInt32BE(16), 256);
  assert.equal(icon.readUInt32BE(20), 256);

  for (const relativePath of ["README.md", "README-CN.md"]) {
    const content = readText(relativePath);
    assert.match(content, /<img src="docs\/images\/app-icon\.png" width="96"/);
    assert.match(content, /img\.shields\.io\/badge\/release-v1\.0\.0/);
    assert.match(content, /img\.shields\.io\/badge\/CI-macOS%20ARM64%20%7C%20Windows%20passing-16a34a/);
    assert.doesNotMatch(content, /img\.shields\.io\/github\/v\/release/);
    assert.doesNotMatch(content, /actions\/workflows\/ci\.yml\/badge\.svg/);
  }
});

test("README files stay concise and expose release, docs, and community entry points", () => {
  for (const relativePath of ["README.md", "README-CN.md"]) {
    const content = readText(relativePath);
    assert.ok(content.split(/\r?\n/).length <= 180, `${relativePath} should remain concise`);
    assert.match(content, /releases\/tag\/v1\.0\.0/);
    assert.match(content, /docs\/README\.md/);
    assert.match(content, /CONTRIBUTING\.md/);
    assert.match(content, /SECURITY\.md/);
    assert.match(content, /LICENSE/);
    assert.match(content, /Agent-SMC-1\.0\.0-macos-arm64\.dmg/);
    assert.match(content, /Agent-SMC-1\.0\.0-windows-x64-setup\.exe/);
    assert.match(content, /Agent-SMC-1\.0\.0-windows-arm64-setup\.exe/);
    assert.match(content, /SHA256SUMS\.txt/);
  }
});

test("version and package metadata describe the published MIT release", () => {
  const packageJson = JSON.parse(readText("package.json"));
  const packageLock = JSON.parse(readText("package-lock.json"));
  const lockRoot = packageLock.packages[""];
  const tauriConfig = JSON.parse(readText("src-tauri/tauri.conf.json"));
  const cargoToml = readText("src-tauri/Cargo.toml");
  const versionDoc = readText("VERSION.md");

  assert.equal(packageJson.version, "1.0.0");
  assert.equal(packageJson.license, "MIT");
  assert.equal(packageJson.repository.url, "https://github.com/EdwinDigital/agent-skill-management-center.git");
  assert.equal(packageJson.bugs.url, "https://github.com/EdwinDigital/agent-skill-management-center/issues");
  assert.equal(lockRoot.name, packageJson.name);
  assert.equal(lockRoot.version, packageJson.version);
  assert.equal(lockRoot.license, packageJson.license);
  assert.equal(tauriConfig.version, "1.0.0");
  assert.match(cargoToml, /^version = "1\.0\.0"/m);
  assert.match(versionDoc, /Version 1\.0\.0/);
  assert.doesNotMatch(versionDoc, /1\.1\.2/);
});

test("issue forms and config are valid YAML", () => {
  for (const relativePath of [
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/ISSUE_TEMPLATE/config.yml"
  ]) {
    assert.ok(parse(readText(relativePath)), `${relativePath} must parse`);
  }
});

test("local Markdown and HTML image links resolve", () => {
  const markdownFiles = collectFiles(projectRoot, (filePath) => filePath.endsWith(".md"));
  const broken = [];
  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const targets = [
      ...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g),
      ...content.matchAll(/<img[^>]+src=["']([^"']+)["']/g)
    ].map((match) => match[1].trim());
    for (const target of targets) {
      if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue;
      const pathname = decodeURIComponent(target.split("#", 1)[0].split("?", 1)[0]);
      const resolved = path.resolve(path.dirname(filePath), pathname);
      if (!fs.existsSync(resolved)) {
        broken.push(`${path.relative(projectRoot, filePath)} -> ${target}`);
      }
    }
  }
  assert.deepEqual(broken, []);
});

function collectFiles(directory, predicate) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "public", "target", "data"].includes(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath, predicate));
    else if (predicate(entryPath)) files.push(entryPath);
  }
  return files;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}