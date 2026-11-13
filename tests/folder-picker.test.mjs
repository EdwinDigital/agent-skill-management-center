import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

import { pickLocalSkillRoot } from "../server/folder-picker.js";

test("Windows folder picker uses the built-in STA host without a console and preserves Unicode paths", async () => {
  const selectedPath = "C:\\Users\\example\\\u6280\u80fd\u76ee\u5f55\\Team's skills";
  const calls = [];
  const result = await pickLocalSkillRoot({
    platform: "win32",
    windowsDirectory: "C:\\Windows",
    initialDirectory: selectedPath,
    executeFile: async (...args) => {
      calls.push(args);
      return { stdout: `\uFEFF${selectedPath}\r\n` };
    }
  });

  assert.equal(result, selectedPath);
  assert.equal(calls.length, 1);
  const [executable, args, options] = calls[0];
  assert.equal(executable, "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
  assert.ok(args.includes("-STA"));
  assert.ok(args.includes("-NoProfile"));
  assert.ok(args.includes("-NonInteractive"));
  assert.equal(args[args.indexOf("-WindowStyle") + 1], "Hidden");
  assert.equal(options.windowsHide, true);
  assert.equal(options.encoding, "utf8");
  assert.equal(options.env.AGENT_SMC_FOLDER_PICKER_INITIAL_PATH, selectedPath);
  const script = Buffer.from(args[args.indexOf("-EncodedCommand") + 1], "base64").toString("utf16le");
  assert.match(script, /System\.Windows\.Forms\.FolderBrowserDialog/);
  assert.match(script, /UTF8Encoding/);
  assert.match(script, /finally/);
  assert.match(script, /\.Dispose\(\)/);
  assert.ok(!script.includes(selectedPath));
});

test("Windows folder picker preserves UNC paths and treats an empty result as cancellation", async () => {
  const uncPath = "\\\\server\\share\\team skills";
  assert.equal(await pickLocalSkillRoot({ platform: "win32", executeFile: async () => ({ stdout: uncPath }) }), uncPath);
  assert.equal(await pickLocalSkillRoot({ platform: "win32", executeFile: async () => ({ stdout: "\r\n" }) }), null);
});

test("macOS keeps using the existing AppleScript folder picker", async () => {
  const calls = [];
  const result = await pickLocalSkillRoot({
    platform: "darwin",
    initialDirectory: "/Users/example/skills",
    executeFile: async (...args) => {
      calls.push(args);
      return { stdout: "/Users/example/Team's skills/\n" };
    }
  });
  assert.equal(result, "/Users/example/Team's skills");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "osascript");
  assert.deepEqual(calls[0][1], ["-e", 'POSIX path of (choose folder with prompt "Choose a Skill directory")']);
  assert.equal(calls[0][2].timeout, 120_000);
  assert.equal(calls[0][2].windowsHide, undefined);
  assert.equal(calls[0][2].env, undefined);
});

test("only genuine macOS cancellation is silent; permissions and timeouts remain errors", async () => {
  const cancelled = Object.assign(new Error("osascript failed"), { stderr: "User canceled. (-128)" });
  assert.equal(await pickLocalSkillRoot({ platform: "darwin", executeFile: async () => { throw cancelled; } }), null);

  for (const platform of ["win32", "darwin"]) {
    for (const error of [new Error("Permission denied"), Object.assign(new Error("Timed out"), { signal: "SIGTERM" })]) {
      await assert.rejects(pickLocalSkillRoot({ platform, executeFile: async () => { throw error; } }), (actual) => actual.cause === error && actual.code.startsWith("DIRECTORY_PICKER_"));
    }
  }
});

test("picker errors expose a concise fallback message instead of the encoded command", async () => {
  const cause = Object.assign(new Error("Command failed: powershell.exe -EncodedCommand SECRET-SCRIPT"), { killed: true });
  await assert.rejects(pickLocalSkillRoot({ platform: "win32", language: "zh", executeFile: async () => { throw cause; } }), (error) => {
    assert.equal(error.code, "DIRECTORY_PICKER_TIMEOUT");
    assert.equal(error.cause, cause);
    assert.ok(error.message.length < 100);
    assert.doesNotMatch(error.message, /EncodedCommand|SECRET-SCRIPT/);
    return true;
  });
});

test("unsupported platforms and invalid command output fail before a path can be scanned", async () => {
  await assert.rejects(pickLocalSkillRoot({ platform: "linux", executeFile: async () => assert.fail("must not execute") }), /not supported/i);
  await assert.rejects(pickLocalSkillRoot({ platform: "win32", executeFile: async () => ({ stdout: "unexpected output" }) }), /absolute/i);
});

test("cancelled API requests do not inspect a path or write an error log", async () => {
  const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  const handler = source.match(/app\.post\("\/api\/skill-roots\/pick-local", (async \(request, response\) => \{[\s\S]*?\n\})\);/)?.[1];
  assert.ok(handler);
  let payload;
  const run = runInNewContext(`(${handler})`, {
    pickLocalSkillRoot: async () => null,
    resolveRequestedRoot: () => path.resolve("fixtures", "skills"),
    inspectSkillRoot: () => assert.fail("cancelled selection must not be inspected"),
    normalizeLanguage: () => assert.fail("cancelled selection must return immediately"),
    sendJsonError: () => assert.fail("cancellation must not be logged as an error")
  });
  await run({ body: { language: "zh" } }, { json: (value) => { payload = value; } });
  assert.equal(payload.cancelled, true);
  assert.equal(payload.directory, undefined);
});

test("sidecar packaging includes the folder picker helper and PowerShell script", () => {
  const source = fs.readFileSync(new URL("../scripts/build-sidecar-runtime.js", import.meta.url), "utf8");
  assert.match(source, /copyPath\("server", "server"\)/);
  assert.equal(fs.existsSync(new URL("../server/folder-picker.ps1", import.meta.url)), true);
});

function createPickerFlow(response) {
  const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const functionSource = source.match(/async function pickLocalDirectory\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(functionSource);
  const calls = [];
  const context = {
    language: "zh",
    selectedRoot: { id: "existing-root" },
    text: { openingDirectoryPicker: "opening", loadedServer: "loaded", defaultPath: "default", directoryNoSkills: "no-skills" },
    fetchJson: async () => response,
    setLoadingRoot: (value) => calls.push(["loading", value]),
    setPathHint: (value) => calls.push(["hint", value]),
    setPendingDirectory: (value) => calls.push(["pending", value]),
    setDirectoryPath: (value) => calls.push(["path", value]),
    setDirectoryName: (value) => calls.push(["name", value]),
    notifyError: (error) => calls.push(["error", error.message]),
    toast: { error: (message) => calls.push(["toast", message]) }
  };
  const run = runInNewContext(`(${functionSource.replace("fetchJson<DirectoryPickerResponse>", "fetchJson")})`, context);
  return { run, calls };
}

test("frontend cancellation is silent and always restores the add-directory button", async () => {
  const flow = createPickerFlow({ cancelled: true });
  await flow.run();
  assert.deepEqual(flow.calls, [["loading", true], ["hint", "opening"], ["hint", "loaded"], ["loading", false]]);
});

test("frontend still previews a valid selection and rejects directories without skills", async () => {
  const directory = { path: path.resolve("fixtures", "skills"), suggestedLabel: "Custom skills", skillCount: 1 };
  const selected = createPickerFlow({ directory });
  await selected.run();
  assert.ok(selected.calls.some(([kind, value]) => kind === "pending" && value === directory));
  assert.ok(selected.calls.some(([kind, value]) => kind === "name" && value === "Custom skills"));
  assert.ok(!selected.calls.some(([kind]) => kind === "error"));
  assert.deepEqual(selected.calls.at(-1), ["loading", false]);

  const empty = createPickerFlow({ directory: { ...directory, skillCount: 0 } });
  await empty.run();
  assert.ok(empty.calls.some(([kind, value]) => kind === "toast" && value === "no-skills"));
  assert.ok(empty.calls.some(([kind, value]) => kind === "path" && value === directory.path));
  assert.deepEqual(empty.calls.at(-1), ["loading", false]);
});

test("opening Add path does not depend on a native picker", () => {
  const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const functionSource = source.match(/function openDirectoryDialog\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(functionSource);
  const calls = [];
  const run = runInNewContext(`(${functionSource})`, {
    text: { directoryPathHint: "manual-path-hint" },
    setDirectoryPath: (value) => calls.push(["path", value]),
    setDirectoryName: (value) => calls.push(["name", value]),
    setPendingDirectory: (value) => calls.push(["pending", value.path, value.message])
  });
  run();
  assert.deepEqual(calls, [["path", ""], ["name", ""], ["pending", "", "manual-path-hint"]]);
  assert.match(source, /onClick=\{openDirectoryDialog\}/);
});

test("manual paths are validated and saved through the existing custom-root API", async () => {
  const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const functionSource = source.match(/async function savePendingDirectory\(\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(functionSource);
  const selectedPath = path.resolve("fixtures", "\u6280\u80fd's skills");
  const calls = [];
  const context = {
    pendingDirectory: { path: "", message: "manual-input" },
    directoryPath: ` ${selectedPath} `,
    directoryName: "",
    language: "zh",
    text: { directorySaved: "saved" },
    fetchJson: async (url, options) => {
      assert.equal(url, "/api/skill-roots/custom");
      const body = JSON.parse(options.body);
      assert.equal(body.value, selectedPath);
      assert.equal(body.label, undefined);
      return { root: { id: "custom-root", label: "Derived label" }, roots: [] };
    },
    setSavingDirectory: (value) => calls.push(["saving", value]),
    setPendingDirectory: (value) => calls.push(["pending", value]),
    setDirectoryPath: (value) => calls.push(["path", value]),
    applyRoots: (_roots, id) => calls.push(["roots", id]),
    loadSkillsFromServer: async (root) => calls.push(["load", root.id]),
    notifyError: (error) => calls.push(["error", error.message]),
    toast: { success: (value) => calls.push(["toast", value]) }
  };
  const run = runInNewContext(`(${functionSource.replace("fetchJson<{ root: SkillRoot; roots: SkillRoot[] }>", "fetchJson")})`, context);
  await run();
  assert.ok(calls.some(([kind, value]) => kind === "roots" && value === "custom-root"));
  assert.ok(calls.some(([kind, value]) => kind === "toast" && value === "saved: Derived label"));
  assert.deepEqual(calls.at(-1), ["saving", false]);

  calls.length = 0;
  context.directoryPath = "   ";
  await run();
  assert.deepEqual(calls, []);
});
