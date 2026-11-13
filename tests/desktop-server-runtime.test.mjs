import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("desktop sidecar reports its random port and protects API routes with a launch token", { timeout: 20_000 }, async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-smc-sidecar-test-"));
  const skillRoot = path.join(temporaryDirectory, ".agents", "skills");
  const skillDirectory = path.join(skillRoot, "desktop-cors-regression");
  fs.mkdirSync(skillDirectory, { recursive: true });
  fs.writeFileSync(path.join(skillDirectory, "SKILL.md"), "---\nname: desktop-cors-regression\ndescription: Verify desktop scanning.\n---\n# Desktop CORS regression\n");
  const emptyDirectory = path.join(temporaryDirectory, "empty-directory");
  fs.mkdirSync(emptyDirectory);
  const pickerProvider = path.join(temporaryDirectory, "picker-provider.mjs");
  const pickerHook = path.join(temporaryDirectory, "picker-hook.mjs");
  // 用固定选择结果替代系统弹窗，验证真实 HTTP/数据库流程且不阻塞 CI。
  fs.writeFileSync(pickerProvider, `const results = ${JSON.stringify([null, emptyDirectory, skillRoot])};\nexport async function pickLocalSkillRoot() { return results.shift() ?? null; }\n`);
  fs.writeFileSync(pickerHook, `import { registerHooks } from "node:module";\nregisterHooks({ resolve(specifier, context, nextResolve) {\n  if (specifier === "./server/folder-picker.js") return { url: ${JSON.stringify(pathToFileURL(pickerProvider).href)}, shortCircuit: true };\n  return nextResolve(specifier, context);\n} });\n`);
  const child = spawn(process.execPath, ["--import", pathToFileURL(pickerHook).href, "server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      AGENT_SMC_SIDECAR: "1",
      AGENT_SMC_TOKEN: "test-token",
      HOME: temporaryDirectory,
      USERPROFILE: temporaryDirectory,
      SKILL_ROOT: skillRoot,
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

  await t.test("desktop and development origins pass preflight and can initialize the app", async () => {
    for (const origin of [
      "http://tauri.localhost",
      "tauri://localhost",
      "https://tauri.localhost",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ]) {
      const preflight = await fetch(`${baseUrl}/api/skill-roots/scan`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,x-agent-smc-token"
        }
      });
      assert.equal(preflight.status, 204, origin);
      assert.equal(preflight.headers.get("access-control-allow-origin"), origin, origin);
      assert.match(preflight.headers.get("vary"), /\bOrigin\b/i);
      assert.match(preflight.headers.get("access-control-allow-methods"), /\bPOST\b/);
      assert.match(preflight.headers.get("access-control-allow-headers"), /\bcontent-type\b/i);
      assert.match(preflight.headers.get("access-control-allow-headers"), /\bx-agent-smc-token\b/i);

      const config = await fetch(`${baseUrl}/api/config`, {
        headers: { Origin: origin, "X-Agent-SMC-Token": "test-token" }
      });
      assert.equal(config.status, 200, origin);
      assert.equal(config.headers.get("access-control-allow-origin"), origin, origin);
      assert.equal((await config.json()).defaultSkillRoot, skillRoot);
    }
  });

  await t.test("untrusted origins do not receive CORS permission", async () => {
    for (const origin of [
      "https://example.com",
      "http://tauri.localhost.evil.example",
      "http://evil.tauri.localhost",
      "http://tauri.localhost:5173",
      "tauri://localhost.evil.example",
      "http://localhost.evil.example:5173",
      "null"
    ]) {
      const response = await fetch(`${baseUrl}/api/skill-roots/scan`, {
        method: "OPTIONS",
        headers: { Origin: origin, "Access-Control-Request-Method": "POST" }
      });
      assert.equal(response.headers.get("access-control-allow-origin"), null, origin);
    }
  });

  await t.test("trusted desktop origins still require the launch token", async () => {
    assert.equal((await fetch(`${baseUrl}/api/config`)).status, 401);
    for (const origin of ["http://tauri.localhost", "tauri://localhost"]) {
      for (const token of [undefined, "wrong-token"]) {
        const headers = { Origin: origin };
        if (token) headers["X-Agent-SMC-Token"] = token;
        const response = await fetch(`${baseUrl}/api/config`, { headers });
        assert.equal(response.status, 401);
        assert.equal(response.headers.get("access-control-allow-origin"), origin);
      }
    }
  });

  for (const [platform, origin] of [["Windows", "http://tauri.localhost"], ["macOS", "tauri://localhost"]]) {
    await t.test(`${platform} desktop can scan and load the discovered skills`, async () => {
      const headers = { Origin: origin, "X-Agent-SMC-Token": "test-token", "Content-Type": "application/json" };
      const scan = await fetch(`${baseUrl}/api/skill-roots/scan`, { method: "POST", headers, body: "{}" });
      assert.equal(scan.status, 200);
      assert.equal(scan.headers.get("access-control-allow-origin"), origin);
      const result = await scan.json();
      assert.ok(result.skillIndex.indexed >= 1);
      assert.ok(result.roots.some((root) => root.expandedPath === skillRoot));

      const skills = await fetch(`${baseUrl}/api/skills?root=${encodeURIComponent(skillRoot)}`, { headers });
      assert.equal(skills.status, 200);
      assert.equal(skills.headers.get("access-control-allow-origin"), origin);
      assert.ok((await skills.json()).skills.some((skill) => skill.name === "desktop-cors-regression"));

      const detail = await fetch(`${baseUrl}/api/skills/desktop-cors-regression?root=${encodeURIComponent(skillRoot)}`, { headers });
      assert.equal(detail.status, 200);
      assert.equal(detail.headers.get("access-control-allow-origin"), origin);
      assert.equal((await detail.json()).skill.name, "desktop-cors-regression");
    });
  }

  await t.test("folder picker API cancels silently, previews directories, and saves only after confirmation", async () => {
    const headers = { "X-Agent-SMC-Token": "test-token", "Content-Type": "application/json" };
    const rootsBefore = await (await fetch(`${baseUrl}/api/skill-roots`, { headers })).json();
    const pick = () => fetch(`${baseUrl}/api/skill-roots/pick-local`, { method: "POST", headers, body: JSON.stringify({ root: skillRoot, language: "zh" }) });

    const cancelled = await pick();
    assert.equal(cancelled.status, 200);
    assert.deepEqual(await cancelled.json(), { cancelled: true });

    const empty = await pick();
    assert.equal(empty.status, 200);
    const emptyPreview = await empty.json();
    assert.equal(emptyPreview.directory.path, emptyDirectory);
    assert.equal(emptyPreview.directory.skillCount, 0);

    const selected = await pick();
    assert.equal(selected.status, 200);
    const preview = await selected.json();
    assert.equal(preview.directory.path, skillRoot);
    assert.equal(preview.directory.skillCount, 1);
    assert.deepEqual(await (await fetch(`${baseUrl}/api/skill-roots`, { headers })).json(), rootsBefore);

    const saved = await fetch(`${baseUrl}/api/skill-roots/custom`, {
      method: "POST",
      headers,
      body: JSON.stringify({ value: preview.directory.path, label: "Picker API root", language: "zh" })
    });
    assert.equal(saved.status, 200);
    const result = await saved.json();
    assert.equal(result.root.label, "Picker API root");
    assert.equal(result.root.expandedPath, skillRoot);
    assert.ok(result.roots.some((root) => root.id === result.root.id));
    const logs = await (await fetch(`${baseUrl}/api/error-logs`, { headers })).json();
    assert.deepEqual(logs.logs, []);
  });
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

test("desktop sidecar exits and releases its database when the parent pipe closes", { timeout: 20_000 }, async (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-smc-parent-pipe-test-"));
  const databasePath = path.join(temporaryDirectory, "analysis.sqlite");
  const child = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      AGENT_SMC_SIDECAR: "1",
      AGENT_SMC_PARENT_PIPE: "1",
      AGENT_SMC_TOKEN: "test-parent-token",
      SKILL_ANALYSIS_DB: databasePath
    },
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  t.after(async () => {
    await stopChild(child);
    const resolved = fs.realpathSync(temporaryDirectory);
    assert.ok(resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep));
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const ready = await waitForReady(child, () => stderr);
  const response = await fetch(`http://${ready.host}:${ready.port}/api/config`, {
    headers: { "X-Agent-SMC-Token": "test-parent-token" }
  });
  assert.equal(response.status, 200);
  const exited = once(child, "exit");
  child.stdin.end();
  assert.deepEqual(await exited, [0, null]);
  const database = new DatabaseSync(databasePath);
  assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  database.close();
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
