import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("desktop sidecar reports its random port and protects API routes with a launch token", { timeout: 10_000 }, async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-smc-sidecar-test-"));
  const child = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      AGENT_SMC_SIDECAR: "1",
      AGENT_SMC_TOKEN: "test-token",
      SKILL_ANALYSIS_DB: path.join(temporaryDirectory, "analysis.sqlite")
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  t.after(() => {
    child.kill();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  const ready = await waitForReady(child, () => stderr);
  const baseUrl = `http://${ready.host}:${ready.port}`;

  assert.equal((await fetch(`${baseUrl}/api/config`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/config`, {
    headers: { "X-Agent-SMC-Token": "test-token" }
  })).status, 200);
});

function waitForReady(child, readStderr) {
  return new Promise((resolve, reject) => {
    const lines = readline.createInterface({ input: child.stdout });
    const timeout = setTimeout(() => {
      lines.close();
      reject(new Error(`Timed out waiting for AGENT_SMC_READY. ${readStderr()}`));
    }, 3_000);

    lines.on("line", (line) => {
      if (!line.startsWith("AGENT_SMC_READY ")) return;
      clearTimeout(timeout);
      lines.close();
      resolve(JSON.parse(line.slice("AGENT_SMC_READY ".length)));
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(new Error(`Sidecar exited before readiness (code=${code}, signal=${signal}). ${readStderr()}`));
    });
  });
}