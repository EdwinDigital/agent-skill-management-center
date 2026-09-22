import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("desktop sidecar reports its random port and protects API routes with a launch token", { timeout: 20_000 }, async (t) => {
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

  t.after(async () => {
    await stopChild(child);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const ready = await waitForReady(child, () => stderr);
  const baseUrl = `http://${ready.host}:${ready.port}`;

  assert.equal((await fetch(`${baseUrl}/api/config`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/config`, {
    headers: { "X-Agent-SMC-Token": "test-token" }
  })).status, 200);
});

test("stored GitHub OAuth without Copilot scope is authenticated but not ready", { timeout: 20_000 }, async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-smc-oauth-test-"));
  const databasePath = path.join(temporaryDirectory, "analysis.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec(fs.readFileSync(path.join(projectRoot, "setup", "schema.sql"), "utf8"));
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO github_oauth_tokens (id, access_token, token_type, scope, login, avatar_url, created_at, updated_at)
    VALUES ('default', 'stored-token', 'bearer', 'read:user', 'example', '', ?, ?)
  `).run(now, now);
  database.close();

  const child = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      AGENT_SMC_SIDECAR: "1",
      AGENT_SMC_TOKEN: "test-token",
      SKILL_ANALYSIS_DB: databasePath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  t.after(async () => {
    await stopChild(child);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const ready = await waitForReady(child, () => stderr);
  const response = await fetch(`http://${ready.host}:${ready.port}/api/auth/github/status`, {
    headers: { "X-Agent-SMC-Token": "test-token" }
  });
  const status = await response.json();

  assert.equal(status.authenticated, true);
  assert.equal(status.needsCopilotScope, true);
  assert.equal(status.ready, false);
  assert.equal(status.authRequired, true);
});

function waitForReady(child, readStderr) {
  return new Promise((resolve, reject) => {
    const lines = readline.createInterface({ input: child.stdout });
    const timeout = setTimeout(() => {
      lines.close();
      reject(new Error(`Timed out waiting for AGENT_SMC_READY. ${readStderr()}`));
    }, 10_000);

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

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await exited;
}