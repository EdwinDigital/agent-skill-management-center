import os from "node:os";
import path from "node:path";
import { resolveProjectPath } from "../core/utils/paths.js";

const defaultDatabasePath = "data/analysis.sqlite";

export const fallbackModels = [
  { id: "github-default", name: "GitHub default", source: "fallback" }
];

export const analysisSchemaVersion = "logic-map-value-insight-sections-v3";
export const progressTtlMs = 10 * 60 * 1000;
export const maxFileBytes = 220_000;
export const skillManifestFileName = "SKILL.md";
export const skillIndexMaxDepth = 10;
export const inspectedSkillRootCacheTtlMs = 5 * 60 * 1000;
export const descriptionCandidates = [
  "SKILL.md",
  "skill.md",
  "README.md",
  "readme.md",
  "DESCRIPTION.md",
  "description.md",
  "manifest.json",
  "skill.json"
];

export function createServerConfig({ env = process.env, cwd = process.cwd(), homeDir = os.homedir(), pathApi = path } = {}) {
  const defaultSkillRoot = env.SKILL_ROOT
    ? resolveProjectPath(env.SKILL_ROOT, { cwd, homeDir, pathApi })
    : pathApi.join(homeDir, ".agents", "skills");
  return {
    port: Number(env.PORT || 4173),
    defaultSkillRoot,
    defaultSkillRootDisplayPath: env.SKILL_ROOT ? defaultSkillRoot : "~/.agents/skills/",
    databasePath: resolveProjectPath(env.SKILL_ANALYSIS_DB || defaultDatabasePath, { cwd, homeDir, pathApi }),
    analysisSchemaVersion,
    fallbackModels,
    progressTtlMs,
    maxFileBytes,
    skillManifestFileName,
    skillIndexMaxDepth,
    inspectedSkillRootCacheTtlMs,
    descriptionCandidates
  };
}