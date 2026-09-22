import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { expandHomePath, normalizeScanPath, resolveProjectPath } from "../core/utils/paths.js";

test("expandHomePath expands tilde paths with the provided home directory", () => {
  assert.equal(expandHomePath("~/skills", "/Users/example", path.posix), "/Users/example/skills");
  assert.equal(expandHomePath("/tmp/skills", "/Users/example", path.posix), "/tmp/skills");
});

test("resolveProjectPath keeps absolute paths and resolves relative paths from cwd", () => {
  const options = { cwd: "/workspace/app", homeDir: "/Users/example", pathApi: path.posix };
  assert.equal(resolveProjectPath("data/analysis.sqlite", options), "/workspace/app/data/analysis.sqlite");
  assert.equal(resolveProjectPath("~/analysis.sqlite", options), "/Users/example/analysis.sqlite");
});

test("normalizeScanPath preserves browser roots and normalizes server paths", () => {
  const options = { cwd: "/workspace/app", homeDir: "/Users/example", pathApi: path.posix };
  assert.equal(normalizeScanPath("browser://selected", "browser", options), "browser://selected");
  assert.equal(normalizeScanPath("~/skills", "custom", options), "/Users/example/skills");
});

test("Windows paths expand home, preserve drives, and preserve UNC roots", () => {
  const options = {
    cwd: "C:\\work\\agent-smc",
    homeDir: "C:\\Users\\Example",
    pathApi: path.win32
  };

  assert.equal(expandHomePath("~\\skills", options.homeDir, path.win32), "C:\\Users\\Example\\skills");
  assert.equal(resolveProjectPath("D:\\shared\\skills", options), "D:\\shared\\skills");
  assert.equal(resolveProjectPath("\\\\server\\share\\skills", options), "\\\\server\\share\\skills");
  assert.equal(normalizeScanPath("browser://selected", "browser", options), "browser://selected");
});