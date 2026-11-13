import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ci = readOptionalWorkflow("ci.yml");
const release = readOptionalWorkflow("desktop-release.yml");
const windowsArm64Build = readOptionalWorkflow("windows-arm64-build.yml");
const yaml = await import("yaml").catch(() => null);

test("CI runs read-only quality gates on main, pull requests, macOS, and Windows", () => {
  assert.ok(ci, "ci.yml must exist");
  assert.match(ci, /pull_request:/);
  assert.match(ci, /push:[\s\S]*branches:[\s\S]*main/);
  assert.match(ci, /permissions:[\s\S]*contents: read/);
  assert.match(ci, /cancel-in-progress: true/);
  assert.match(ci, /macos-15/);
  assert.doesNotMatch(ci, /macos-14/);
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
  assert.match(release, /os: macos-15/);
  assert.doesNotMatch(release, /macos-14/);
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
  assert.equal(ciConfig.jobs.quality["runs-on"], "macos-15");
  assert.equal(ciConfig.jobs["windows-paths"]["runs-on"], "windows-latest");
  assert.equal(releaseConfig.permissions.contents, "read");
  assert.equal(releaseConfig.jobs.prepare.permissions.contents, "write");
  assert.equal(releaseConfig.jobs.publish.permissions.contents, "write");
  assert.deepEqual(releaseConfig.jobs.publish.needs, ["prepare", "build"]);
  assert.equal(releaseConfig.jobs.build.strategy["fail-fast"], false);
  assert.equal(releaseConfig.jobs.build.strategy.matrix.include.length, 3);
});

test("manual release rebuilds pin the original tag commit and publish only when requested", () => {
  assert.ok(yaml, "the yaml parser must be installed for structured workflow validation");
  const config = yaml.parse(release);
  const inputs = config.on.workflow_dispatch.inputs;
  assert.equal(inputs.release_tag.required, true);
  assert.equal(inputs.release_tag.type, "string");
  assert.equal(inputs.publish.type, "boolean");
  assert.equal(inputs.publish.default, false);
  assert.equal(config.concurrency["cancel-in-progress"], false);
  assert.match(config.concurrency.group, /format\('refs\/tags\/\{0\}', inputs\.release_tag\)/);

  const prepareCheckout = config.jobs.prepare.steps.find((step) => step.uses === "actions/checkout@v4");
  assert.match(prepareCheckout.with.ref, /format\('refs\/tags\/\{0\}', inputs\.release_tag\)/);
  for (const job of [config.jobs.build, config.jobs.publish]) {
    const checkout = job.steps.find((step) => step.uses === "actions/checkout@v4");
    assert.equal(checkout.with.ref, "${{ needs.prepare.outputs.commit }}");
  }
  const validate = config.jobs.prepare.steps.find((step) => step.id === "meta");
  assert.equal(validate.env.RELEASE_TAG, "${{ inputs.release_tag || github.ref_name }}");
  assert.match(validate.run, /git rev-parse --verify "refs\/tags\/\$\{tag\}\^\{commit\}"/);
  assert.match(validate.run, /Release source does not match tag/);
  const publish = config.jobs.publish.steps.find((step) => step.name === "Publish release");
  assert.equal(publish.if, "github.event_name == 'push' || inputs.publish");
});

test("manual Windows ARM64 builds upload commit-specific artifacts without publishing a Release", () => {
  assert.ok(yaml, "the yaml parser must be installed for structured workflow validation");
  assert.ok(windowsArm64Build, "windows-arm64-build.yml must exist");
  const config = yaml.parse(windowsArm64Build);
  assert.deepEqual(Object.keys(config.on), ["workflow_dispatch"]);
  assert.deepEqual(config.permissions, { contents: "read" });
  assert.deepEqual(Object.keys(config.jobs), ["build"]);
  assert.equal(config.concurrency["cancel-in-progress"], false);

  const job = config.jobs.build;
  assert.equal(job["runs-on"], "windows-11-arm");
  assert.equal(job.steps.find((step) => step.uses === "actions/checkout@v4").with.ref, "${{ github.sha }}");
  assert.equal(job.steps.find((step) => step.uses === "actions/setup-node@v4").with.architecture, "arm64");
  const commands = job.steps.map((step) => step.run || "").join("\n");
  assert.match(commands, /npm test/);
  assert.match(commands, /npm run check/);
  assert.match(commands, /npm run desktop:build -- --target aarch64-pc-windows-msvc --bundles nsis/);
  assert.match(commands, /ToUInt16\(\$bytes, \$peOffset \+ 4\) -ne 0xaa64/);
  assert.match(commands, /win32-arm64/);
  assert.match(commands, /SOURCE_COMMIT\.Substring\(0, 7\)/);
  assert.match(commands, /SHA256SUMS\.txt/);
  const upload = job.steps.find((step) => step.uses === "actions/upload-artifact@v4");
  assert.match(upload.with.name, /github\.sha/);
  assert.equal(upload.with["if-no-files-found"], "error");
  assert.doesNotMatch(windowsArm64Build, /contents: write|gh release|git tag|git push|secrets\./);
});

function readOptionalWorkflow(fileName) {
  const fileUrl = new URL(`../.github/workflows/${fileName}`, import.meta.url);
  return fs.existsSync(fileUrl) ? fs.readFileSync(fileUrl, "utf8") : "";
}
