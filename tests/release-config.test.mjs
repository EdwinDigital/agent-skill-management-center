import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const cargoToml = fs.readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const macConfig = readOptionalJson("../src-tauri/tauri.macos.conf.json");
const windowsConfig = readOptionalJson("../src-tauri/tauri.windows.conf.json");

test("release metadata and desktop CLI are deterministic", () => {
  assert.equal(packageJson.version, "1.0.0");
  assert.equal(tauriConfig.version, "1.0.0");
  assert.match(cargoToml, /version = "1\.0\.0"/);
  assert.equal(packageJson.devDependencies["@tauri-apps/cli"], "2.11.4");
  assert.equal(packageJson.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(packageJson.scripts["desktop:build"], "tauri build");
});

test("platform Tauri configs select DMG and per-user NSIS bundles", () => {
  assert.ok(macConfig, "tauri.macos.conf.json must exist");
  assert.ok(windowsConfig, "tauri.windows.conf.json must exist");
  assert.deepEqual(macConfig.bundle.targets, ["dmg"]);
  assert.equal(macConfig.bundle.macOS.signingIdentity, "-");
  assert.deepEqual(windowsConfig.bundle.targets, ["nsis"]);
  assert.equal(windowsConfig.bundle.windows.nsis.installMode, "currentUser");
  assert.deepEqual(tauriConfig.bundle.resources, ["sidecar-node"]);
  assert.equal("targets" in tauriConfig.bundle, false);
  assert.equal("macOS" in tauriConfig.bundle, false);
});

function readOptionalJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  return fs.existsSync(fileUrl) ? JSON.parse(fs.readFileSync(fileUrl, "utf8")) : null;
}