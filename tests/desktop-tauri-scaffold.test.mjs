import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));

test("package scripts expose Tauri desktop workflows", () => {
  assert.equal(packageJson.scripts["desktop:dev"], "npx @tauri-apps/cli@latest dev");
  assert.equal(packageJson.scripts["desktop:build:mac"], "npx @tauri-apps/cli@latest build --bundles dmg && node scripts/apply-dmg-icon.js");
  assert.equal(fs.existsSync(new URL("../scripts/apply-dmg-icon.js", import.meta.url)), true);
});

test("Tauri desktop scaffold is present", () => {
  assert.equal(fs.existsSync(new URL("../src-tauri/tauri.conf.json", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../src-tauri/Cargo.toml", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../src-tauri/src/main.rs", import.meta.url)), true);
});

test("Tauri desktop app is named Agent SMC", () => {
  assert.equal(tauriConfig.productName, "Agent SMC");
  assert.equal(tauriConfig.app.windows[0].title, "Agent SMC");
});

test("Tauri bundle declares application icons", () => {
  assert.deepEqual(tauriConfig.bundle.icon, [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ]);
});

test("release directory documents macOS DMG publishing", () => {
  const readme = fs.readFileSync(new URL("../release/README.md", import.meta.url), "utf8");

  assert.match(readme, /DMG/);
  assert.match(readme, /Agent SMC/);
  assert.match(readme, /npm run desktop:build:mac/);
  assert.match(readme, /target\/release\/bundle\/dmg/);
});