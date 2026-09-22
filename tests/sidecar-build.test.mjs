import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const nativeTarget = `${process.platform}-${process.arch}`;
const supportedTargets = new Set(["darwin-arm64", "win32-x64", "win32-arm64"]);

test("sidecar build bundles an executable Node runtime and matching Copilot native loader", { skip: !supportedTargets.has(nativeTarget) }, () => {
  execFileSync(process.execPath, ["scripts/build-sidecar-runtime.js"], {
    cwd: projectRoot,
    stdio: "pipe"
  });

  const nodeExecutableName = process.platform === "win32" ? "node.exe" : "node";
  const nodeExecutable = path.join(projectRoot, "src-tauri", "sidecar-node", "runtime", nodeExecutableName);
  const copilotRuntime = path.join(projectRoot, "src-tauri", "sidecar-node", "node_modules", "runtime", `runtime.${nativeTarget}.node`);

  assert.equal(fs.existsSync(nodeExecutable), true);
  assert.equal(execFileSync(nodeExecutable, ["--version"], { encoding: "utf8" }).trim(), "v24.11.1");
  assert.equal(fs.existsSync(copilotRuntime), true);
});