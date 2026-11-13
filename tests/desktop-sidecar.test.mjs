import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

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

test("Windows sidecar disables console creation before spawning while preserving readiness output", () => {
  const startSidecarSource = tauriSource.slice(tauriSource.indexOf("fn start_sidecar("), tauriSource.indexOf("fn resolve_sidecar_dir("));
  assert.match(startSidecarSource, /let mut command = Command::new\(&node_path\);/);
  assert.match(startSidecarSource, /#\[cfg\(target_os = "windows"\)\]\s*\{\s*use std::os::windows::process::CommandExt;/);
  assert.match(startSidecarSource, /const CREATE_NO_WINDOW: u32 = 0x0800_0000;/);
  assert.match(startSidecarSource, /command\.creation_flags\(CREATE_NO_WINDOW\);\s*\}/);
  assert.match(startSidecarSource, /\.stdout\(Stdio::piped\(\)\)/);
  assert.match(startSidecarSource, /let mut child = command\.spawn\(\)\?;/);
  assert.ok(startSidecarSource.indexOf("command.creation_flags(CREATE_NO_WINDOW)") < startSidecarSource.indexOf("command.spawn()"));
  assert.match(startSidecarSource, /AGENT_SMC_READY/);
});

test("Windows-only Rust process APIs are excluded from macOS and other targets", () => {
  const portableSource = tauriSource.replace(/#\[cfg\(target_os = "windows"\)\]\s*\{[^{}]*\}/g, "");
  assert.doesNotMatch(portableSource, /std::os::windows|CREATE_NO_WINDOW|\.creation_flags\(/);
});

test("GitHub CLI background commands hide consoles only on Windows", () => {
  const commands = [...serverSource.matchAll(/execFileAsync\("gh", [^\r\n]+/g)];
  assert.ok(commands.length > 0);
  for (const [command] of commands) {
    const optionsSource = command.match(/(\{[^{}]*\})\);$/)?.[1];
    assert.ok(optionsSource, command);
    for (const platform of ["win32", "darwin", "linux"]) {
      const options = runInNewContext(`(${optionsSource})`, { process: { platform } });
      assert.equal(options.windowsHide, platform === "win32", `${platform}: ${command}`);
      assert.ok(options.timeout > 0);
    }
  }
});

test("desktop API endpoint can be recovered after a webview reload", () => {
  assert.match(tauriSource, /struct DesktopApiEndpoint/);
  assert.match(tauriSource, /struct DesktopApiState/);
  assert.match(tauriSource, /fn get_desktop_api_endpoint\(state: tauri::State<'_, DesktopApiState>\)/);
  assert.match(tauriSource, /tauri::generate_handler!\[\s*set_app_zoom,\s*get_desktop_api_endpoint\s*\]/);
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

test("Rust generates the sidecar token with a cryptographically random UUID", () => {
  assert.match(tauriSource, /Uuid::new_v4\(\)/);
  assert.doesNotMatch(tauriSource, /SystemTime|UNIX_EPOCH/);
});

test("sidecar build targets the current native platform and bundles Node", () => {
  assert.match(sidecarBuildSource, /copyCopilotNativeRuntimeCompat/);
  assert.match(sidecarBuildSource, /const nativeTarget = `\$\{process\.platform\}-\$\{process\.arch\}`/);
  assert.match(sidecarBuildSource, /const nodeRuntimeVersion = "24\.11\.1"/);
  assert.match(sidecarBuildSource, /https:\/\/nodejs\.org\/dist/);
  assert.match(sidecarBuildSource, /SHASUMS256\.txt/);
  assert.doesNotMatch(sidecarBuildSource, /usr\/bin\/env zsh|opt\/homebrew/);
  assert.match(tauriSource, /runtime.*node\.exe/si);
  assert.match(tauriSource, /\.arg\("server\.js"\)/);
});
