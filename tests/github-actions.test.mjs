import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ci = readOptionalWorkflow("ci.yml");
const release = readOptionalWorkflow("desktop-release.yml");

test("CI runs read-only quality gates on main, pull requests, and Windows", () => {
  assert.ok(ci, "ci.yml must exist");
  assert.match(ci, /pull_request:/);
  assert.match(ci, /push:[\s\S]*branches:[\s\S]*main/);
  assert.match(ci, /permissions:[\s\S]*contents: read/);
  assert.match(ci, /cancel-in-progress: true/);
  assert.match(ci, /ubuntu-latest/);
  assert.match(ci, /windows-latest/);
  assert.match(ci, /node-version: "24\.11\.1"/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run check/);
  assert.match(ci, /npm run build[\s\S]*mkdir -p src-tauri\/sidecar-node[\s\S]*cargo check/);
});

test("desktop release builds all native targets before publishing", () => {
  assert.ok(release, "desktop-release.yml must exist");
  assert.match(release, /tags:[\s\S]*"v\*"/);
  assert.match(release, /workflow_dispatch:/);
  assert.match(release, /permissions:[\s\S]*contents: write/);
  assert.match(release, /macos-arm64/);
  assert.match(release, /windows-x64/);
  assert.match(release, /windows-arm64/);
  assert.match(release, /windows-11-arm/);
  assert.match(release, /aarch64-apple-darwin/);
  assert.match(release, /x86_64-pc-windows-msvc/);
  assert.match(release, /aarch64-pc-windows-msvc/);
  assert.match(release, /expected_tag="v\$\{package_version\}"/);
  assert.match(release, /needs: \[prepare, build\]/);
  assert.match(release, /actions\/upload-artifact@/);
  assert.match(release, /actions\/download-artifact@/);
  assert.match(release, /Agent-SMC-\$\{version\}-macos-arm64\.dmg/);
  assert.match(release, /Agent-SMC-\$\{version\}-windows-x64-setup\.exe/);
  assert.match(release, /Agent-SMC-\$\{version\}-windows-arm64-setup\.exe/);
  assert.match(release, /SHA256SUMS\.txt/);
  assert.match(release, /--draft=false/);

  const buildJob = release.match(/\n  build:[\s\S]*?\n  publish:/)?.[0] || "";
  assert.doesNotMatch(buildJob, /gh release upload/);
  assert.doesNotMatch(buildJob, /mapfile/);
});

function readOptionalWorkflow(fileName) {
  const fileUrl = new URL(`../.github/workflows/${fileName}`, import.meta.url);
  return fs.existsSync(fileUrl) ? fs.readFileSync(fileUrl, "utf8") : "";
}