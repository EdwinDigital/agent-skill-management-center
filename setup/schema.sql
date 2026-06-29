CREATE TABLE IF NOT EXISTS skill_model_analyses (
  skill_name TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  model TEXT NOT NULL,
  language TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (skill_path, language)
);
DROP INDEX IF EXISTS idx_skill_model_analyses_lookup;
CREATE INDEX IF NOT EXISTS idx_skill_model_analyses_lookup
  ON skill_model_analyses (skill_path, language, updated_at);

CREATE TABLE IF NOT EXISTS skill_markdown_translations (
  skill_name TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  model TEXT NOT NULL,
  language TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  translated_markdown TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (skill_path, language)
);
DROP INDEX IF EXISTS idx_skill_markdown_translations_lookup;
CREATE INDEX IF NOT EXISTS idx_skill_markdown_translations_lookup
  ON skill_markdown_translations (skill_path, language, updated_at);

CREATE TABLE IF NOT EXISTS skill_directory_defaults (
  agent_slug TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  project_path TEXT NOT NULL,
  global_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_directory_scan (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  agent_slug TEXT,
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  expanded_path TEXT NOT NULL,
  exists_on_disk INTEGER NOT NULL DEFAULT 0,
  removable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_directory_scan_expanded_path
  ON skill_directory_scan (expanded_path);

CREATE TABLE IF NOT EXISTS skill_directory_index (
  root_path TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  description_file TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (root_path, skill_path)
);
CREATE INDEX IF NOT EXISTS idx_skill_directory_index_root
  ON skill_directory_index (root_path, skill_name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS app_error_logs (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  level TEXT NOT NULL,
  scope TEXT NOT NULL,
  method TEXT,
  route TEXT,
  status INTEGER,
  message TEXT NOT NULL,
  stack TEXT,
  details_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at
  ON app_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_scope
  ON app_error_logs (scope, created_at DESC);

CREATE TABLE IF NOT EXISTS github_oauth_tokens (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  token_type TEXT,
  scope TEXT,
  login TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
