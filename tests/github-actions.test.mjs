import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ci = readOptionalWorkflow("ci.yml");
const release = readOptionalWorkflow("desktop-release.yml");
const yaml = await import("yaml").catch(() => null);

test("CI runs read-only quality gates on main, pull requests, macOS, and Windows", () => {
  assert.ok(ci, "ci.yml must exist");
  assert.match(ci, /pull_request:/);
  assert.match(ci, /push:[\s\S]*branches:[\s\S]*main/);
  assert.match(ci, /permissions:[\s\S]*contents: read/);
  assert.match(ci, /cancel-in-progress: true/);
  assert.match(ci, /macos-14/);
  assert.match(ci, /windows-latest/);
  assert.doesNotMatch(ci, /ubuntu-latest|Tauri Linux prerequisites|webkit2gtk/);
  assert.match(ci, /node-version: "24\.11\.1"/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run check/);
  assert.match(ci, /npm run build[\s\S]*rustup target add aarch64-apple-darwin[\s\S]*cargo check .*--target aarch64-apple-darwin/);
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
  assert.match(release, /concurrency:/);
  assert.match(release, /hdiutil attach[\s\S]*codesign --verify --deep --strict[\s\S]*Agent SMC\.app/);
  assert.doesNotMatch(release, /codesign --verify[^\n]*bundle\/macos\/Agent SMC\.app/);
  assert.match(release, /gh release view "\$TAG" --json isDraft,targetCommitish,tagName/);
  assert.match(release, /Validate draft release before upload/);
  assert.match(release, /Remove stale draft assets/);
  assert.match(release, /gh release delete-asset "\$TAG" "\$asset" --yes/);

  const buildJob = release.match(/\n  build:[\s\S]*?\n  publish:/)?.[0] || "";
  assert.doesNotMatch(buildJob, /gh release upload/);
  assert.doesNotMatch(buildJob, /mapfile/);
});

test("workflow YAML parses into the expected job and permission structure", () => {
  assert.ok(yaml, "the yaml parser must be installed for structured workflow validation");
  const ciConfig = yaml.parse(ci);
  const releaseConfig = yaml.parse(release);

  assert.deepEqual(ciConfig.on.push.branches, ["main"]);
  assert.equal(ciConfig.permissions.contents, "read");
  assert.equal(ciConfig.jobs.quality["runs-on"], "macos-14");
  assert.equal(ciConfig.jobs["windows-paths"]["runs-on"], "windows-latest");
  assert.equal(releaseConfig.permissions.contents, "read");
  assert.equal(releaseConfig.jobs.prepare.permissions.contents, "write");
  assert.equal(releaseConfig.jobs.publish.permissions.contents, "write");
  assert.deepEqual(releaseConfig.jobs.publish.needs, ["prepare", "build"]);
  assert.equal(releaseConfig.jobs.build.strategy["fail-fast"], false);
  assert.equal(releaseConfig.jobs.build.strategy.matrix.include.length, 3);
});

function readOptionalWorkflow(fileName) {
  const fileUrl = new URL(`../.github/workflows/${fileName}`, import.meta.url);
  return fs.existsSync(fileUrl) ? fs.readFileSync(fileUrl, "utf8") : "";
}