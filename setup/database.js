import { createHash } from "node:crypto";
import fsSync from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { normalizeScanPath } from "../core/utils/paths.js";
import { supportedAgentSkillDirectories } from "./default-skill-directories.js";

const setupDirectory = path.dirname(fileURLToPath(import.meta.url));
// schema.sql 是数据库结构的唯一维护入口，避免在运行时代码里分散硬编码 DDL。
const schemaSql = fsSync.readFileSync(path.join(setupDirectory, "schema.sql"), "utf8");

export function initializeDatabase({ databasePath, defaultSkillRoot, defaultSkillRootDisplayPath }) {
  fsSync.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(schemaSql);
  ensureCompositeSkillCacheTables(db);
  createSkillCacheIndexes(db);
  seedDefaultSkillDirectories(db);
  seedCurrentDefaultSkillRoot(db, { defaultSkillRoot, defaultSkillRootDisplayPath });
  return db;
}

function ensureCompositeSkillCacheTables(db) {
  // 早期缓存表只按 skill_path 做主键；启动时收敛为 skill_path + language，避免多语言缓存互相覆盖。
  ensureCompositeCacheTable(db, {
    tableName: "skill_model_analyses",
    contentColumn: "analysis_json",
    createTableSql: createSkillModelAnalysesTableSql("skill_model_analyses_next")
  });
  ensureCompositeCacheTable(db, {
    tableName: "skill_markdown_translations",
    contentColumn: "translated_markdown",
    createTableSql: createSkillMarkdownTranslationsTableSql("skill_markdown_translations_next")
  });
}

function createSkillModelAnalysesTableSql(tableName) {
  return `
    CREATE TABLE ${tableName} (
      skill_name TEXT NOT NULL,
      skill_path TEXT NOT NULL,
      model TEXT NOT NULL,
      language TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      analysis_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (skill_path, language)
    )
  `;
}

function createSkillMarkdownTranslationsTableSql(tableName) {
  return `
    CREATE TABLE ${tableName} (
      skill_name TEXT NOT NULL,
      skill_path TEXT NOT NULL,
      model TEXT NOT NULL,
      language TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      translated_markdown TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (skill_path, language)
    )
  `;
}

function ensureCompositeCacheTable(db, { tableName, contentColumn, createTableSql }) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const primaryKeyColumns = columns
    .filter((column) => column.pk > 0)
    .sort((left, right) => left.pk - right.pk)
    .map((column) => column.name);
  const hasCompositePrimaryKey = primaryKeyColumns.join("|") === "skill_path|language";
  const hasContentColumn = columns.some((column) => column.name === contentColumn);
  if (hasCompositePrimaryKey && hasContentColumn) {
    return;
  }

  const nextTableName = `${tableName}_next`;
  db.exec(`DROP TABLE IF EXISTS ${nextTableName}; ${createTableSql}; DROP TABLE IF EXISTS ${tableName}; ALTER TABLE ${nextTableName} RENAME TO ${tableName};`);
}

function createSkillCacheIndexes(db) {
  db.exec(`
    DROP INDEX IF EXISTS idx_skill_model_analyses_lookup;
    CREATE INDEX idx_skill_model_analyses_lookup
      ON skill_model_analyses (skill_path, language, updated_at);
    DROP INDEX IF EXISTS idx_skill_markdown_translations_lookup;
    CREATE INDEX idx_skill_markdown_translations_lookup
      ON skill_markdown_translations (skill_path, language, updated_at);
  `);
}

function seedDefaultSkillDirectories(db) {
  const now = new Date().toISOString();
  const statement = db.prepare(`
    INSERT INTO skill_directory_defaults (agent_slug, agent_name, project_path, global_path, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_slug) DO UPDATE SET
      agent_name = excluded.agent_name,
      project_path = excluded.project_path,
      global_path = excluded.global_path,
      updated_at = excluded.updated_at
  `);
  for (const [agentName, agentSlug, projectPath, globalPath] of supportedAgentSkillDirectories) {
    statement.run(agentSlug, agentName, projectPath, globalPath, now, now);
  }
}

export function seedCurrentDefaultSkillRoot(db, { defaultSkillRoot, defaultSkillRootDisplayPath }) {
  if (!directoryExists(defaultSkillRoot)) {
    return;
  }
  // 当前运行环境的默认 Skill 根目录是扫描入口，不属于静态 defaults 清单。
  upsertScannedSkillRoot(db, {
    sourceType: "default",
    agentSlug: "current-default",
    label: "Skills.sh",
    value: defaultSkillRootDisplayPath,
    removable: true
  });
}

function upsertScannedSkillRoot(db, { sourceType, agentSlug, label, value, removable }) {
  const expandedPath = normalizeScanPath(value, sourceType);
  const id = hashText(`${sourceType}:${expandedPath}`).slice(0, 24);
  const now = new Date().toISOString();
  const existsOnDisk = sourceType === "browser" ? 1 : Number(directoryExists(expandedPath));
  db.prepare(`
    INSERT INTO skill_directory_scan (
      id, source_type, agent_slug, label, path, expanded_path, exists_on_disk, removable, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(expanded_path) DO UPDATE SET
      source_type = excluded.source_type,
      agent_slug = excluded.agent_slug,
      label = excluded.label,
      path = excluded.path,
      exists_on_disk = excluded.exists_on_disk,
      removable = excluded.removable,
      updated_at = excluded.updated_at
  `).run(id, sourceType, agentSlug, label, value, expandedPath, existsOnDisk, Number(removable), now, now);
}

function directoryExists(value) {
  try {
    return fsSync.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}
