import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tauriConfig = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const serverSource = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
const tauriSource = fs.readFileSync(new URL("../src-tauri/src/lib.rs", import.meta.url), "utf8");
const sidecarBuildSource = fs.readFileSync(new URL("../scripts/build-sidecar-runtime.js", import.meta.url), "utf8");

test("desktop build prepares a Node sidecar runtime before Tauri packaging", () => {
  assert.equal(packageJson.scripts["build:sidecar"], "node scripts/build-sidecar-runtime.js");
  assert.match(tauriConfig.build.beforeBuildCommand, /npm run build:sidecar/);
  assert.equal(fs.existsSync(new URL("../scripts/build-sidecar-runtime.js", import.meta.url)), true);
});

test("Tauri bundles the sidecar runtime as an application resource", () => {
  assert.deepEqual(tauriConfig.bundle.resources, ["sidecar-node"]);
});

test("Rust app starts the sidecar and injects the API endpoint into the webview", () => {
  assert.match(tauriSource, /start_sidecar/);
  assert.match(tauriSource, /__AGENT_SMC_API_BASE_URL__/);
  assert.match(tauriSource, /AGENT_SMC_READY/);
});

test("desktop API endpoint can be recovered after a webview reload", () => {
  assert.match(tauriSource, /struct DesktopApiEndpoint/);
  assert.match(tauriSource, /struct DesktopApiState/);
  assert.match(tauriSource, /fn get_desktop_api_endpoint\(state: tauri::State<'_, DesktopApiState>\)/);
  assert.match(tauriSource, /tauri::generate_handler!\[set_app_zoom, get_desktop_api_endpoint\]/);
  assert.match(appSource, /readDesktopApiEndpointFromTauri/);
  assert.match(appSource, /invoke<DesktopApiEndpoint>\("get_desktop_api_endpoint"\)/);
});

test("Rust app refuses to run directly from a mounted DMG volume", () => {
  assert.match(tauriSource, /ensure_not_running_from_dmg/);
  assert.match(tauriSource, /is_running_from_mounted_volume/);
  assert.match(tauriSource, /\/Volumes\//);
  assert.match(tauriSource, /请先将 Agent SMC 拖到“应用程序”/);
});

test("frontend fetchJson uses the injected desktop API endpoint and token", () => {
  assert.match(appSource, /__AGENT_SMC_API_BASE_URL__/);
  assert.match(appSource, /__AGENT_SMC_API_TOKEN__/);
  assert.match(appSource, /resolveApiUrl/);
  assert.match(appSource, /isDesktopRuntime\(\)/);
  assert.doesNotMatch(appSource, /window\.location\.protocol !== "tauri:"/);
});

test("server supports desktop sidecar host, random port, token, and readiness output", () => {
  assert.match(serverSource, /process\.env\.HOST/);
  assert.match(serverSource, /process\.env\.AGENT_SMC_TOKEN/);
  assert.match(serverSource, /AGENT_SMC_READY/);
});

test("sidecar build preserves Copilot native runtime loader path", () => {
  assert.match(sidecarBuildSource, /copyCopilotNativeRuntimeCompat/);
  assert.match(sidecarBuildSource, /runtime\.darwin-arm64\.node/);
  assert.match(sidecarBuildSource, /prebuilds.*darwin-arm64.*runtime\.node/s);
  assert.match(sidecarBuildSource, /platformPart && platformPart !== "darwin-arm64"/);
});