import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const cargoToml = fs.readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");

test("release metadata and desktop CLI are deterministic", () => {
  assert.equal(packageJson.version, "1.0.0");
  assert.equal(tauriConfig.version, "1.0.0");
  assert.match(cargoToml, /version = "1\.0\.0"/);
  assert.equal(packageJson.devDependencies["@tauri-apps/cli"], "2.11.4");
  assert.equal(packageJson.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(packageJson.scripts["desktop:build"], "tauri build");
});