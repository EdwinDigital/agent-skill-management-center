import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { createServerConfig } from "../server/config.js";

test("createServerConfig resolves web defaults from the project directory", () => {
  const config = createServerConfig({
    env: {},
    cwd: "/workspace/app",
    homeDir: "/Users/example",
    pathApi: path.posix
  });

  assert.equal(config.port, 4173);
  assert.equal(config.defaultSkillRoot, "/Users/example/.agents/skills");
  assert.equal(config.defaultSkillRootDisplayPath, "~/.agents/skills/");
  assert.equal(config.databasePath, "/workspace/app/data/analysis.sqlite");
  assert.equal(config.analysisSchemaVersion, "logic-map-value-insight-sections-v3");
});

test("createServerConfig respects explicit environment overrides", () => {
  const config = createServerConfig({
    env: {
      PORT: "5123",
      SKILL_ROOT: "~/custom-skills",
      SKILL_ANALYSIS_DB: "/tmp/analysis.sqlite"
    },
    cwd: "/workspace/app",
    homeDir: "/Users/example",
    pathApi: path.posix
  });

  assert.equal(config.port, 5123);
  assert.equal(config.defaultSkillRoot, "/Users/example/custom-skills");
  assert.equal(config.defaultSkillRootDisplayPath, "/Users/example/custom-skills");
  assert.equal(config.databasePath, "/tmp/analysis.sqlite");
});

test("createServerConfig initializes the default Skill root with Windows path semantics", () => {
  const config = createServerConfig({
    env: {},
    cwd: "C:\\workspace\\app",
    homeDir: "C:\\Users\\Example",
    pathApi: path.win32
  });

  assert.equal(config.defaultSkillRoot, "C:\\Users\\Example\\.agents\\skills");
  assert.equal(config.databasePath, "C:\\workspace\\app\\data\\analysis.sqlite");
});