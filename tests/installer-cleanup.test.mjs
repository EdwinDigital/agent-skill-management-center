import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const executeFile = promisify(execFile);
const scriptPath = fileURLToPath(new URL("../server/stop-desktop-sidecar.ps1", import.meta.url));
const windowsConfig = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.windows.conf.json", import.meta.url), "utf8"));
const baseConfig = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const hooks = fs.readFileSync(new URL("../src-tauri/installer-hooks.nsh", import.meta.url), "utf8");

test("only Windows installers use a directory-scoped sidecar cleanup hook", () => {
  assert.equal(windowsConfig.bundle.windows.nsis.installerHooks, "installer-hooks.nsh");
  assert.equal(baseConfig.bundle.windows, undefined);
  assert.match(hooks, /!macro NSIS_HOOK_PREINSTALL/);
  assert.match(hooks, /!macro NSIS_HOOK_PREUNINSTALL/);
  assert.match(hooks, /-InstallDirectory "\$INSTDIR"/);
  assert.match(hooks, /CheckIfAppIsRunning/);
  assert.match(hooks, /Sysnative/);
  assert.match(hooks, /\$0 != 0[\s\S]*Abort/);
  const script = fs.readFileSync(scriptPath, "utf8");
  assert.match(script, /StartsWith\(\$sidecarPath, \$comparison\)/);
  assert.match(script, /\$process\.Path/);
  assert.match(script, /WaitForExit\(10000\)/);
  assert.doesNotMatch(script + hooks, /taskkill|Stop-Process -Name|Get-Process -Name/);
});

test("Windows cleanup releases only the selected installation and preserves unrelated Node processes", { skip: process.platform !== "win32", timeout: 30_000 }, async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-smc-installer-test-"));
  const installation = path.join(temporaryDirectory, "Agent SMC's \u6280\u80fd");
  const runtimeDirectory = path.join(installation, "sidecar-node", "runtime");
  fs.mkdirSync(runtimeDirectory, { recursive: true });
  const nodePath = path.join(runtimeDirectory, "node.exe");
  fs.copyFileSync(process.execPath, nodePath);
  const children = [];
  t.after(async () => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill();
        await exited;
      }
    }
    const resolved = fs.realpathSync(temporaryDirectory);
    assert.ok(resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep));
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  for (const executable of [nodePath, process.execPath]) {
    const child = spawn(executable, ["-e", "console.log('READY'); setInterval(() => {}, 1000)"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    children.push(child);
    await once(child.stdout, "data");
  }
  const targetExited = once(children[0], "exit");
  const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const args = ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-InstallDirectory", installation];
  await assert.rejects(executeFile(powershell, [...args.slice(0, -1), path.parse(installation).root], { windowsHide: true, timeout: 20_000 }), /Refusing to clean processes for a drive root/);
  assert.equal(children[0].exitCode, null);
  await executeFile(powershell, args, { windowsHide: true, timeout: 20_000 });
  await targetExited;
  assert.equal(children[1].exitCode, null);
  assert.equal(children[1].signalCode, null);
  const descriptor = fs.openSync(nodePath, "r+");
  fs.closeSync(descriptor);
  await executeFile(powershell, args, { windowsHide: true, timeout: 20_000 });
  assert.equal(children[1].exitCode, null);
});
