import assert from "node:assert/strict";
import test from "node:test";

import { expandHomePath, normalizeScanPath, resolveProjectPath } from "../core/utils/paths.js";

test("expandHomePath expands tilde paths with the provided home directory", () => {
  assert.equal(expandHomePath("~/skills", "/Users/example"), "/Users/example/skills");
  assert.equal(expandHomePath("/tmp/skills", "/Users/example"), "/tmp/skills");
});

test("resolveProjectPath keeps absolute paths and resolves relative paths from cwd", () => {
  assert.equal(resolveProjectPath("data/analysis.sqlite", { cwd: "/workspace/app", homeDir: "/Users/example" }), "/workspace/app/data/analysis.sqlite");
  assert.equal(resolveProjectPath("~/analysis.sqlite", { cwd: "/workspace/app", homeDir: "/Users/example" }), "/Users/example/analysis.sqlite");
});

test("normalizeScanPath preserves browser roots and normalizes server paths", () => {
  assert.equal(normalizeScanPath("browser://selected", "browser", { cwd: "/workspace/app", homeDir: "/Users/example" }), "browser://selected");
  assert.equal(normalizeScanPath("~/skills", "custom", { cwd: "/workspace/app", homeDir: "/Users/example" }), "/Users/example/skills");
});