import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const cargoToml = fs.readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const tauriLib = fs.readFileSync(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");

test("package scripts expose Tauri desktop workflows", () => {
  assert.equal(packageJson.scripts["desktop:dev"], "npx @tauri-apps/cli@latest dev");
  assert.equal(packageJson.scripts["desktop:build:mac"], "npx @tauri-apps/cli@latest build --bundles dmg && node scripts/build-dmg-app.js");
  assert.equal(fs.existsSync(new URL("../scripts/build-dmg-app.js", import.meta.url)), true);
});

test("Tauri desktop scaffold is present", () => {
  assert.equal(fs.existsSync(new URL("../src-tauri/tauri.conf.json", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../src-tauri/Cargo.toml", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../src-tauri/src/main.rs", import.meta.url)), true);
});

test("Tauri desktop app uses Agent SMC bundle name and full window title", () => {
  assert.equal(tauriConfig.productName, "Agent SMC");
  assert.equal(tauriConfig.app.windows[0].title, "Agent Skills Management Center-SMC");
  assert.doesNotMatch(tauriConfig.app.windows[0].title, /DEV/);
});

test("Tauri dev build appends DEV to the window title", () => {
  assert.match(tauriLib, /const APP_WINDOW_TITLE: &str = "Agent Skills Management Center-SMC"/);
  assert.match(tauriLib, /const DEV_WINDOW_TITLE: &str = "Agent Skills Management Center-SMC 「DEV」"/);
  assert.match(tauriLib, /cfg!\(debug_assertions\)/);
  assert.match(tauriLib, /window\.set_title\(DEV_WINDOW_TITLE\)/);
});

test("Tauri exposes native WebView zoom for desktop app scaling", () => {
  assert.equal(tauriConfig.app.withGlobalTauri, true);
  assert.match(tauriLib, /#\[tauri::command\]/);
  assert.match(tauriLib, /fn set_app_zoom\(window: WebviewWindow, scale_factor: f64\)/);
  assert.match(tauriLib, /window\.set_zoom\(scale_factor\)/);
  assert.match(tauriLib, /tauri::generate_handler!\[[^\]]*set_app_zoom[^\]]*\]/);
});

test("desktop release version is synchronized across package and Tauri metadata", () => {
  assert.equal(packageJson.version, "1.1.2");
  assert.equal(tauriConfig.version, packageJson.version);
  assert.match(cargoToml, /version = "1\.1\.2"/);
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