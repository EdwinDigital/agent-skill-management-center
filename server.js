import express from "express";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { expandHomePath, normalizeScanPath } from "./core/utils/paths.js";
import { createServerConfig } from "./server/config.js";
import { initializeDatabase, seedCurrentDefaultSkillRoot } from "./setup/database.js";
import { supportedAgentSkillDirectories } from "./setup/default-skill-directories.js";

const app = express();
const execFileAsync = promisify(execFile);
const {
  port,
  defaultSkillRoot,
  defaultSkillRootDisplayPath,
  databasePath,
  analysisSchemaVersion,
  fallbackModels,
  progressTtlMs,
  maxFileBytes,
  skillManifestFileName,
  skillIndexMaxDepth,
  inspectedSkillRootCacheTtlMs,
  descriptionCandidates
} = createServerConfig();
const progressStore = new Map();
const inspectedSkillRootCache = new Map();
const database = initializeDatabase({ databasePath, defaultSkillRoot, defaultSkillRootDisplayPath });

app.use(express.json({ limit: "2mb" }));
app.use((error, request, response, next) => {
  if (error?.type === "entity.too.large") {
    sendJsonError(response, request, 413, error, {
      message: "Skill analysis payload is too large. Try refreshing with a smaller file sample.",
      scope: "request-body"
    });
    return;
  }
  next(error);
});
app.use(express.static(path.join(process.cwd(), "public", "dist")));
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/favicon.ico", (_request, response) => {
  response.type("image/svg+xml").sendFile(path.join(process.cwd(), "public", "favicon.svg"));
});

app.get("/api/config", (_request, response) => {
  response.json({
    defaultSkillRoot,
    languages: [
      { code: "en", label: "English" },
      { code: "zh", label: "中文" }
    ],
    defaultModel: "github-default"
  });
});

app.get("/api/progress/:requestId", (request, response) => {
  const progress = getProgress(request.params.requestId);
  response.json(progress || {
    requestId: request.params.requestId,
    stage: "unknown",
    status: "unknown",
    message: localizeProgressMessage("unknown", normalizeLanguage(request.query.language)),
    updatedAt: new Date().toISOString()
  });
});

app.get("/api/skill-roots", (_request, response) => {
  response.json({ roots: listScannedSkillRoots() });
});

app.post("/api/skill-roots/scan", (_request, response) => {
  const result = scanDefaultSkillRoots();
  const skillIndex = refreshSkillIndexesForKnownRoots();
  response.json({
    ...result,
    skillIndex,
    roots: listScannedSkillRoots()
  });
});

app.post("/api/skill-roots/pick-local", async (request, response) => {
  try {
    const root = await pickLocalSkillRoot();
    const inspection = await inspectSkillRoot(root, normalizeLanguage(request.body?.language));
    response.json({ directory: inspection });
  } catch (error) {
    sendJsonError(response, request, 400, error, { scope: "skill-root-picker" });
  }
});

app.post("/api/skill-roots/custom", (request, response) => {
  const { label, value, type, language } = request.body || {};
  try {
    const root = addCustomSkillRoot({ label, value, type, language: normalizeLanguage(language) });
    response.json({ root, roots: listScannedSkillRoots() });
  } catch (error) {
    sendJsonError(response, request, 400, error, { scope: "skill-root-custom", details: { label, value, type } });
  }
});

app.delete("/api/skill-roots/:id", (request, response) => {
  const removed = deleteScannedSkillRoot(request.params.id);
  response.json({ removed, roots: listScannedSkillRoots() });
});

app.get("/api/skills", async (request, response) => {
  const root = resolveRequestedRoot(request.query.root);
  const language = normalizeLanguage(request.query.language);
  try {
    const skills = await listSkills(root, language);
    response.json({ root, skills });
  } catch (error) {
    sendJsonError(response, request, 400, error, { scope: "skill-list", details: { root }, payload: { root } });
  }
});

app.get("/api/skills/:name", async (request, response) => {
  const root = resolveRequestedRoot(request.query.root);
  const language = normalizeLanguage(request.query.language);
  const skillName = path.basename(request.params.name);
  const skillPath = resolveRequestedSkillPath(root, skillName, request.query.path);

  try {
    const skill = await readSkill(skillPath, path.basename(skillPath), language);
    response.json({ root, skill });
  } catch (error) {
    sendJsonError(response, request, 400, error, { scope: "skill-detail", details: { root, skillName, skillPath }, payload: { root, skillName } });
  }
});

app.get("/api/auth/github/status", async (request, response) => {
  response.json(await getGitHubAuthStatus({ checkCli: request.query.check === "1" }));
});

app.post("/api/auth/github/login", async (_request, response) => {
  const status = await getGitHubAuthStatus({ checkCli: false });
  const guide = buildGitHubAuthGuide(status);
  response.json({
    ok: false,
    ...guide,
    status
  });
});

app.post("/api/auth/github/logout", async (_request, response) => {
  try {
    const status = await getGitHubAuthStatus({ checkCli: true });
    if (status.authenticated) {
      const args = ["auth", "logout", "--hostname", status.hostname || "github.com"];
      if (status.login) {
        args.push("--user", status.login);
      }
      await execFileAsync("gh", args, { timeout: 8000 });
    }
    response.json({ ok: true, status: await getGitHubAuthStatus() });
  } catch (error) {
    sendJsonError(response, _request, 500, error, { scope: "github-logout" });
  }
});

app.get("/api/models", async (request, response) => {
  if (request.query.live !== "1") {
    response.json({
      source: "fallback",
      models: fallbackModels
    });
    return;
  }

  try {
    const { client } = await createCopilotSdkClient();
    try {
      await withTimeout(client.start(), 10_000, "Timed out while starting Copilot SDK runtime.");
      const models = await withTimeout(client.listModels(), 10_000, "Timed out while listing Copilot models.");
      response.json({
        source: "copilot-sdk",
        models: normalizeModels(models)
      });
    } finally {
      await stopCopilotClient(client);
    }
  } catch (error) {
    logServerError(error, { request, status: 200, scope: "models-fallback" });
    const authGuide = error?.authGuide || (isCopilotSdkAuthError(error) ? buildGitHubAuthGuide({ authenticated: false, needsCopilotScope: false, cliInstalled: true, tokenAvailable: false }) : null);
    const authPayload = authGuide ? {
      authRequired: true,
      authCommand: authGuide.command || error.authStatus?.command || "gh auth login --web && gh auth refresh --scopes copilot",
      authHelp: authGuide.message || error.authStatus?.message || "Sign in with GitHub CLI and refresh the Copilot OAuth scope."
    } : {};
    response.json({
      source: "fallback",
      ...authPayload,
      error: error.message,
      models: fallbackModels
    });
  }
});

app.post("/api/analyze-skill", async (request, response) => {
  const { skill, model, language } = request.body || {};
  if (!skill?.name || !skill?.description) {
    sendJsonError(response, request, 400, new Error("A skill with name and description is required."), { scope: "skill-analysis-validation" });
    return;
  }

  try {
    const { approveAll } = await import("@github/copilot-sdk");
    const selectedModel = model && model !== "github-default" ? model : undefined;
    const { client } = await createCopilotSdkClient();
    try {
      await withTimeout(client.start(), 10_000, "Timed out while starting Copilot SDK runtime.");
      const session = await client.createSession({
        onPermissionRequest: approveAll,
        ...(selectedModel ? { model: selectedModel } : {})
      });
      try {
        const reply = await withTimeout(
          session.sendAndWait({
            prompt: buildModelPrompt(skill, normalizeLanguage(language))
          }),
          20_000,
          "Timed out while requesting Copilot SDK analysis."
        );
        response.json({
          source: "copilot-sdk",
          model: selectedModel || "github-default",
          content: reply?.data?.content || "No model response was returned."
        });
      } finally {
        await cleanupCopilotSession(client, session);
      }
    } finally {
      await stopCopilotClient(client);
    }
  } catch (error) {
    sendJsonError(response, request, 503, error, {
      scope: "skill-analysis",
      payload: {
      source: "rules",
      content: localize("Model insight is unavailable. Sign in with GitHub and refresh Copilot scopes to enable SDK-driven analysis.", normalizeLanguage(language))
      }
    });
  }
});

app.post("/api/logic-map/cache", (request, response) => {
  const { skill, model, language } = request.body || {};
  try {
    const normalizedSkill = normalizeSkillPayload(skill);
    const selectedModel = normalizeModelId(model);
    const selectedLanguage = normalizeLanguage(language);
    const cached = getCachedModelAnalysis(normalizedSkill, selectedModel, selectedLanguage);
    response.json({
      cached: Boolean(cached),
      analysis: cached
    });
  } catch (error) {
    sendJsonError(response, request, 400, error, { scope: "logic-map-cache" });
  }
});

app.post("/api/skill-translation/cache", (request, response) => {
  const { skill, model, language } = request.body || {};
  try {
    const normalizedSkill = normalizeSkillPayload(skill);
    const selectedModel = normalizeModelId(model);
    const selectedLanguage = normalizeLanguage(language);
    const skipped = getSkippedSkillTranslation(normalizedSkill, selectedModel, selectedLanguage);
    if (skipped) {
      response.json({ cached: false, translation: skipped });
      return;
    }
    const cached = getCachedSkillTranslation(normalizedSkill, selectedModel, selectedLanguage);
    response.json({
      cached: Boolean(cached),
      translation: cached
    });
  } catch (error) {
    sendJsonError(response, request, 400, error, { scope: "skill-translation-cache" });
  }
});

app.post("/api/skill-translation/generate", async (request, response) => {
  const { skill, model, language, requestId } = request.body || {};
  const selectedLanguage = normalizeLanguage(language);
  updateProgress(requestId, "translation-queued", selectedLanguage);
  try {
    const normalizedSkill = normalizeSkillPayload(skill);
    const selectedModel = normalizeModelId(model);
    const skipped = getSkippedSkillTranslation(normalizedSkill, selectedModel, selectedLanguage, { requestId });
    if (skipped) {
      response.json({ cached: false, translation: skipped });
      return;
    }
    updateProgress(requestId, "translation-cache", selectedLanguage);
    const cached = getCachedSkillTranslation(normalizedSkill, selectedModel, selectedLanguage);
    if (cached) {
      updateProgress(requestId, "translation-cache-hit", selectedLanguage, "completed");
      response.json({ cached: true, translation: cached });
      return;
    }
    const translation = await generateSkillMarkdownTranslation(normalizedSkill, selectedModel, selectedLanguage, { requestId });
    saveSkillTranslation(normalizedSkill, selectedModel, selectedLanguage, translation);
    updateProgress(requestId, "translation-saved", selectedLanguage, "completed");
    response.json({ cached: false, translation });
  } catch (error) {
    updateProgress(requestId, "failed", selectedLanguage, "failed");
    sendJsonError(response, request, 503, error, {
      scope: "skill-translation-generate",
      details: { skillName: skill?.name, model, language }
    });
  }
});

app.post("/api/logic-map/generate", async (request, response) => {
  const { skill, model, language, requestId } = request.body || {};
  const selectedLanguage = normalizeLanguage(language);
  updateProgress(requestId, "queued", selectedLanguage);
  try {
    const normalizedSkill = normalizeSkillPayload(skill);
    const selectedModel = normalizeModelId(model);
    updateProgress(requestId, "cache-check", selectedLanguage);
    const analysis = await generateModelLogicMap(normalizedSkill, selectedModel, selectedLanguage, { requestId });
    updateProgress(requestId, "saving-analysis", selectedLanguage);
    saveModelAnalysis(normalizedSkill, selectedModel, selectedLanguage, analysis);
    let translation = getSkippedSkillTranslation(normalizedSkill, selectedModel, selectedLanguage, { requestId });
    if (!translation) {
      translation = getCachedSkillTranslation(normalizedSkill, selectedModel, selectedLanguage);
    }
    if (!translation && String(normalizedSkill.description || "").length <= 12_000) {
      try {
        translation = await generateSkillMarkdownTranslation(normalizedSkill, selectedModel, selectedLanguage, { requestId });
        updateProgress(requestId, "translation-saved", selectedLanguage);
        saveSkillTranslation(normalizedSkill, selectedModel, selectedLanguage, translation);
      } catch (translationError) {
        logServerError(translationError, {
          request,
          status: 200,
          scope: "skill-translation-during-logic-map",
          details: { skillName: normalizedSkill.name, model: selectedModel, language: selectedLanguage }
        });
      }
    } else if (translation) {
      updateProgress(requestId, "translation-cache-hit", selectedLanguage);
    }
    updateProgress(requestId, "completed", selectedLanguage, "completed");
    response.json({
      cached: false,
      analysis,
      translation
    });
  } catch (error) {
    updateProgress(requestId, "failed", selectedLanguage, "failed");
    sendJsonError(response, request, 503, error, {
      scope: "logic-map-generate",
      details: { skillName: skill?.name, model, language },
      payload: {
      source: "rules",
      content: localize("Model insight is unavailable. Sign in with GitHub and refresh Copilot scopes to enable SDK-driven analysis.", normalizeLanguage(language))
      }
    });
  }
});

app.get("/api/error-logs", (request, response) => {
  const limit = Math.min(Math.max(Number(request.query.limit || 50), 1), 200);
  const logs = database
    .prepare(`
      SELECT id, created_at, level, scope, method, route, status, message, stack, details_json
      FROM app_error_logs
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      level: row.level,
      scope: row.scope,
      method: row.method,
      route: row.route,
      status: row.status,
      message: row.message,
      stack: row.stack,
      details: safeJsonParse(row.details_json)
    }));
  response.json({ logs });
});

function resolveRequestedRoot(root) {
  if (!root || typeof root !== "string") {
    return defaultSkillRoot;
  }

  return normalizeScanPath(root, "custom");
}

function normalizeLanguage(language) {
  return language === "zh" ? "zh" : "en";
}

function normalizeModelId(model) {
  const normalized = model && model !== "github-default" ? String(model) : "github-default";
  return normalized === "gpt-5" ? "github-default" : normalized;
}

function updateProgress(requestId, stage, language = "en", status = "running", detail = {}) {
  if (!requestId) return;
  cleanupProgressStore();
  const normalizedLanguage = normalizeLanguage(language);
  progressStore.set(String(requestId), {
    requestId: String(requestId),
    stage,
    status,
    detail,
    message: localizeProgressMessage(stage, normalizedLanguage, detail),
    updatedAt: new Date().toISOString()
  });
}

function getProgress(requestId) {
  if (!requestId) return null;
  cleanupProgressStore();
  return progressStore.get(String(requestId)) || null;
}

function cleanupProgressStore() {
  const now = Date.now();
  for (const [requestId, progress] of progressStore.entries()) {
    if (now - Date.parse(progress.updatedAt || 0) > progressTtlMs) {
      progressStore.delete(requestId);
    }
  }
}

function localizeProgressMessage(stage, language = "en", detail = {}) {
  const text = progressMessages[normalizeLanguage(language)] || progressMessages.en;
  if (stage === "translation-chunk") {
    return text[stage](detail.current || 1, detail.total || 1);
  }
  return text[stage] || text.unknown;
}

function detectMarkdownLanguage(markdown) {
  const text = String(markdown || "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
  const cjkMatches = text.match(/[\u3400-\u9fff]/g) || [];
  const latinMatches = text.match(/[A-Za-z]/g) || [];
  const cjkCount = cjkMatches.length;
  const latinCount = latinMatches.length;
  if (cjkCount >= 12 && cjkCount / Math.max(1, cjkCount + latinCount) > 0.18) {
    return "zh";
  }
  return "en";
}

function getSkippedSkillTranslation(skill, model, language = "en", progress = {}) {
  const markdown = String(skill.description || "").trim();
  if (!markdown) return null;
  const selectedLanguage = normalizeLanguage(language);
  const detectedLanguage = detectMarkdownLanguage(markdown);
  if (detectedLanguage !== selectedLanguage) return null;
  updateProgress(progress.requestId, "translation-skipped", selectedLanguage, "completed");
  return {
    source: "rules",
    model,
    language: selectedLanguage,
    detectedLanguage,
    skipped: true,
    reason: "same-language",
    content: markdown,
    generatedAt: new Date().toISOString()
  };
}

const progressMessages = {
  en: {
    queued: "Preparing AI evaluation request...",
    "cache-check": "Checking cached model analysis and Skill.md translation...",
    "rule-analysis": "Analyzing Skill files, tools, and trigger signals...",
    "prompt-analysis": "Analyzing trigger Prompts and typical use cases...",
    "sdk-start": "Starting GitHub Copilot SDK runtime...",
    "session-create": "Creating model session...",
    "model-scores": "Generating summary, complexity, and ROI scores...",
    "model-insights": "Generating model insights and activation examples...",
    "logic-graph": "Generating the model-backed logic graph...",
    "merge-analysis": "Merging model outputs into one analysis...",
    "saving-analysis": "Saving model analysis and graph cache...",
    "translation-start": "Preparing Skill.md translation...",
    "translation-sdk-start": "Starting translation model runtime...",
    "translation-session-create": "Creating translation session...",
    "translation-chunk": (current, total) => total > 1 ? `Translating Skill.md part ${current}/${total}...` : "Translating Skill.md...",
    "translation-cache": "Checking cached Skill.md translation...",
    "translation-cache-hit": "Using cached Skill.md translation...",
    "translation-skipped": "Skill.md is already in the current language; skipping translation...",
    "translation-queued": "Preparing Skill.md translation request...",
    "translation-saved": "Saving translated Skill.md content...",
    completed: "Updating scores, evidence, translation, and graph view...",
    failed: "AI evaluation failed. Preparing error details...",
    unknown: "Waiting for backend progress..."
  },
  zh: {
    queued: "正在准备 AI 评估请求...",
    "cache-check": "正在检查模型分析与 Skill.md 翻译缓存...",
    "rule-analysis": "正在分析 Skill 文件、工具与触发信号...",
    "prompt-analysis": "正在分析触发 Prompt 与典型使用场景...",
    "sdk-start": "正在启动 GitHub Copilot SDK 运行时...",
    "session-create": "正在创建模型会话...",
    "model-scores": "正在生成摘要、复杂度与 ROI 评分...",
    "model-insights": "正在生成模型洞察与触发示例...",
    "logic-graph": "正在生成模型逻辑图...",
    "merge-analysis": "正在合并模型输出为完整分析...",
    "saving-analysis": "正在保存模型分析与图谱缓存...",
    "translation-start": "正在准备翻译 Skill.md...",
    "translation-sdk-start": "正在启动翻译模型运行时...",
    "translation-session-create": "正在创建翻译会话...",
    "translation-chunk": (current, total) => total > 1 ? `正在翻译 Skill.md 第 ${current}/${total} 段...` : "正在翻译 Skill.md...",
    "translation-cache": "正在检查 Skill.md 翻译缓存...",
    "translation-cache-hit": "正在使用已缓存的 Skill.md 翻译...",
    "translation-skipped": "Skill.md 已经是当前语言，跳过翻译...",
    "translation-queued": "正在准备 Skill.md 翻译请求...",
    "translation-saved": "正在保存 Skill.md 翻译内容...",
    completed: "正在更新评分、证据、翻译与图谱视图...",
    failed: "AI 评估失败，正在整理错误信息...",
    unknown: "正在等待后端进度..."
  }
};

function sendJsonError(response, request, status, error, options = {}) {
  const message = options.message || errorMessage(error);
  const authGuide = error?.authGuide || (isCopilotSdkAuthError(error) ? buildGitHubAuthGuide({ authenticated: false, needsCopilotScope: false, cliInstalled: true, tokenAvailable: false }) : null);
  const authPayload = authGuide ? {
    authRequired: true,
    authStatus: error.authStatus || null,
    authCommand: authGuide.command || error.authStatus?.command || "gh auth login --web && gh auth refresh --scopes copilot",
    authHelp: authGuide.message || error.authStatus?.message || "Sign in with GitHub CLI and refresh the Copilot OAuth scope."
  } : {};
  logServerError(error, {
    request,
    status,
    scope: options.scope || "api-error",
    message,
    details: options.details
  });
  response.status(authGuide ? 401 : status).json({ ...(options.payload || {}), ...authPayload, error: message });
}

function isCopilotSdkAuthError(error) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("not authenticated") || message.includes("authenticate first") || message.includes("please authenticate") || message.includes("authentication required");
}

function logServerError(error, { request, status, scope = "server", level = "error", message, details, silent = false } = {}) {
  const createdAt = new Date().toISOString();
  const resolvedMessage = message || errorMessage(error);
  const stack = error instanceof Error ? error.stack || "" : "";
  const method = request?.method || null;
  const route = request?.originalUrl || request?.url || null;
  const detailsJson = safeJsonStringify(details || null);
  const id = hashText(`${createdAt}:${scope}:${method || ""}:${route || ""}:${resolvedMessage}:${Math.random()}`);

  try {
    database.prepare(`
      INSERT INTO app_error_logs (id, created_at, level, scope, method, route, status, message, stack, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, createdAt, level, scope, method, route, status || null, resolvedMessage, stack, detailsJson);
  } catch (logError) {
    console.error("[error-log-write-failed]", errorMessage(logError));
  }

  if (!silent) {
    console.error(`[${scope}] ${resolvedMessage}`, {
      method,
      route,
      status,
      details
    });
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function safeJsonStringify(value) {
  try {
    return value == null ? null : JSON.stringify(value);
  } catch {
    return JSON.stringify({ serializationError: "Unable to serialize details." });
  }
}

function safeJsonParse(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function listScannedSkillRoots() {
  return database
    .prepare(`
      SELECT
        roots.id,
        roots.source_type,
        roots.agent_slug,
        roots.label,
        roots.path,
        roots.expanded_path,
        roots.exists_on_disk,
        roots.removable,
        roots.updated_at,
        COUNT(skill_index.skill_path) AS skill_count
      FROM skill_directory_scan AS roots
      LEFT JOIN skill_directory_index AS skill_index
        ON skill_index.root_path = roots.expanded_path
      WHERE roots.source_type != 'browser'
      GROUP BY roots.id
      HAVING skill_count > 0
      ORDER BY agent_slug = 'current-default' DESC, source_type = 'custom' DESC, label COLLATE NOCASE, expanded_path
    `)
    .all()
    .map((row) => ({
      id: row.id,
      type: row.source_type === "browser" ? "browser" : "server",
      sourceType: row.source_type,
      agentSlug: row.agent_slug || "",
      label: row.label,
      value: row.path,
      expandedPath: row.expanded_path,
      existsOnDisk: Boolean(row.exists_on_disk),
      removable: Boolean(row.removable),
      skillCount: row.skill_count,
      updatedAt: row.updated_at
    }));
}

function listAllScannedSkillRoots() {
  return database
    .prepare(`
      SELECT id, source_type, agent_slug, label, path, expanded_path, exists_on_disk, removable, updated_at
      FROM skill_directory_scan
      WHERE source_type != 'browser'
      ORDER BY agent_slug = 'current-default' DESC, source_type = 'custom' DESC, label COLLATE NOCASE, expanded_path
    `)
    .all()
    .map((row) => ({
      id: row.id,
      type: row.source_type === "browser" ? "browser" : "server",
      sourceType: row.source_type,
      agentSlug: row.agent_slug || "",
      label: row.label,
      value: row.path,
      expandedPath: row.expanded_path,
      existsOnDisk: Boolean(row.exists_on_disk),
      removable: Boolean(row.removable),
      updatedAt: row.updated_at
    }));
}

function scanDefaultSkillRoots() {
  const defaults = database
    .prepare("SELECT agent_slug, agent_name, global_path FROM skill_directory_defaults WHERE global_path IS NOT NULL AND global_path != 'N/A (project-only)'")
    .all();
  let added = 0;
  let found = 0;

  for (const item of defaults) {
    const expandedPath = expandHomePath(item.global_path);
    if (!directoryExists(expandedPath)) {
      continue;
    }
    found += 1;
    if (path.resolve(expandedPath) === path.resolve(defaultSkillRoot)) {
      continue;
    }
    const changed = upsertScannedSkillRoot(database, {
      sourceType: "default",
      agentSlug: item.agent_slug,
      label: item.agent_name,
      value: item.global_path,
      removable: true
    });
    if (changed) {
      added += 1;
    }
  }
  seedCurrentDefaultSkillRoot(database, { defaultSkillRoot, defaultSkillRootDisplayPath });

  return { scanned: defaults.length, found, added };
}

function refreshSkillIndexesForKnownRoots() {
  const roots = listAllScannedSkillRoots().filter((root) => root.existsOnDisk && root.type === "server");
  let indexed = 0;
  for (const root of roots) {
    indexed += refreshSkillIndex(root.expandedPath);
  }
  return { roots: roots.length, indexed };
}

function addCustomSkillRoot({ label, value, type = "server", language = "en" }) {
  if (!value || typeof value !== "string") {
    throw new Error("A skill directory path is required.");
  }
  const sourceType = type === "browser" ? "browser" : "custom";
  const normalizedValue = sourceType === "browser" ? value : normalizeScanPath(value, sourceType);
  const scannedSkills = sourceType === "browser" ? [] : getCachedInspectedSkills(normalizedValue) || scanAndCacheSkillDirectories(normalizedValue);
  if (sourceType !== "browser" && scannedSkills.length === 0) {
    throw new Error(language === "zh" ? "当前目录没有找到 Skill 定义文件（SKILL.md）。" : "No Skill definition file (SKILL.md) was found in the selected directory.");
  }
  const root = {
    sourceType,
    agentSlug: null,
    label: label || (sourceType === "browser" ? "Local" : path.basename(normalizedValue) || "Custom"),
    value: normalizedValue,
    removable: true
  };
  upsertScannedSkillRoot(database, root);
  const expandedPath = normalizeScanPath(normalizedValue, sourceType);
  if (sourceType !== "browser") {
    refreshSkillIndex(expandedPath, scannedSkills);
  }
  return listScannedSkillRoots().find((item) => item.expandedPath === expandedPath);
}

async function pickLocalSkillRoot() {
  if (process.platform !== "darwin") {
    throw new Error("Native folder picker is currently supported on macOS. Enter a server path or use Scan for known Skill roots.");
  }

  const script = 'POSIX path of (choose folder with prompt "Choose a Skill directory")';
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script], { timeout: 120_000 });
    const selectedPath = stdout.trim();
    if (!selectedPath) {
      throw new Error("No directory was selected.");
    }
    return path.resolve(selectedPath);
  } catch (error) {
    if (error.signal === "SIGTERM" || /User canceled|cancelled|canceled|用户已取消|\(-128\)/i.test(error.message)) {
      throw new Error("用户已取消");
    }
    throw error;
  }
}

async function inspectSkillRoot(root, language = "en") {
  const normalizedRoot = normalizeScanPath(root, "custom");
  const stat = await fs.stat(normalizedRoot);
  if (!stat.isDirectory()) {
    throw new Error("Selected path is not a directory.");
  }

  const skills = scanAndCacheSkillDirectories(normalizedRoot);
  return {
    path: normalizedRoot,
    suggestedLabel: path.basename(normalizedRoot) || "Custom skills",
    skillCount: skills.length,
    describedSkills: skills.length,
    message: language === "zh"
      ? `检测到 ${skills.length} 个包含 SKILL.md 的 Skill 目录。`
      : `${skills.length} Skill directories containing SKILL.md detected.`
  };
}

function deleteScannedSkillRoot(id) {
  const row = database.prepare("SELECT removable FROM skill_directory_scan WHERE id = ?").get(id);
  if (!row?.removable) {
    return false;
  }
  const root = database.prepare("SELECT expanded_path FROM skill_directory_scan WHERE id = ?").get(id);
  if (root?.expanded_path) {
    database.prepare("DELETE FROM skill_directory_index WHERE root_path = ?").run(root.expanded_path);
  }
  database.prepare("DELETE FROM skill_directory_scan WHERE id = ?").run(id);
  return true;
}

function upsertScannedSkillRoot(db, { sourceType, agentSlug, label, value, removable }) {
  const expandedPath = normalizeScanPath(value, sourceType);
  const id = hashText(`${sourceType}:${expandedPath}`).slice(0, 24);
  const now = new Date().toISOString();
  const existsOnDisk = sourceType === "browser" ? 1 : Number(directoryExists(expandedPath));
  const before = db.prepare("SELECT updated_at FROM skill_directory_scan WHERE id = ?").get(id);
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
  return !before;
}

function directoryExists(value) {
  try {
    return fsSync.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function fileExists(value) {
  try {
    return fsSync.statSync(value).isFile();
  } catch {
    return false;
  }
}

function getCachedInspectedSkills(root) {
  const rootPath = normalizeScanPath(root, "custom");
  const cached = inspectedSkillRootCache.get(rootPath);
  if (!cached || Date.now() - cached.createdAt > inspectedSkillRootCacheTtlMs) {
    inspectedSkillRootCache.delete(rootPath);
    return null;
  }
  return cached.skills;
}

function scanAndCacheSkillDirectories(root) {
  const rootPath = normalizeScanPath(root, "custom");
  const skills = scanSkillDirectories(rootPath);
  inspectedSkillRootCache.set(rootPath, { skills, createdAt: Date.now() });
  return skills;
}

function scanSkillDirectories(root, current = root, depth = 0) {
  if (depth > skillIndexMaxDepth) {
    return [];
  }
  let entries = [];
  try {
    entries = fsSync.readdirSync(current, { withFileTypes: true });
  } catch {
    return [];
  }

  const visibleDirectories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name));

  const results = [];
  for (const entry of visibleDirectories) {
    const skillPath = path.join(current, entry.name);
    const manifestPath = path.join(skillPath, skillManifestFileName);
    if (fileExists(manifestPath)) {
      results.push({ name: entry.name, path: skillPath, descriptionFile: skillManifestFileName });
      continue;
    }
    results.push(...scanSkillDirectories(root, skillPath, depth + 1));
  }
  return results;
}

function refreshSkillIndex(root, scannedSkills = null) {
  const rootPath = normalizeScanPath(root, "custom");
  if (!directoryExists(rootPath)) {
    database.prepare("DELETE FROM skill_directory_index WHERE root_path = ?").run(rootPath);
    return 0;
  }

  const now = new Date().toISOString();
  const nextSkills = dedupeScannedSkills(scannedSkills || scanSkillDirectories(rootPath));
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("DELETE FROM skill_directory_index WHERE root_path = ?").run(rootPath);
    const statement = database.prepare(`
      INSERT INTO skill_directory_index (root_path, skill_name, skill_path, description_file, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const skill of nextSkills) {
      const description = readSkillManifestForIndex(skill.path);
      statement.run(rootPath, skill.name, skill.path, skill.descriptionFile, extractSummary(description), now, now);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return nextSkills.length;
}

function dedupeScannedSkills(skills) {
  const selected = new Map();
  for (const skill of skills) {
    const key = skill.name.toLowerCase();
    const current = selected.get(key);
    if (!current || compareSkillIndexCandidate(skill, current) < 0) {
      selected.set(key, skill);
    }
  }
  return Array.from(selected.values()).sort((left, right) => left.name.localeCompare(right.name) || left.path.localeCompare(right.path));
}

function compareSkillIndexCandidate(left, right) {
  const leftScore = scoreSkillIndexPath(left.path);
  const rightScore = scoreSkillIndexPath(right.path);
  return leftScore - rightScore || left.path.length - right.path.length || left.path.localeCompare(right.path);
}

function scoreSkillIndexPath(skillPath) {
  let score = 0;
  if (skillPath.includes(`${path.sep}plugin-install-`)) {
    score += 100;
  }
  if (skillPath.includes(`${path.sep}node_modules${path.sep}`)) {
    score += 50;
  }
  return score;
}

function readSkillManifestForIndex(skillPath) {
  const manifestPath = path.join(skillPath, skillManifestFileName);
  try {
    const stat = fsSync.statSync(manifestPath);
    if (stat.size > maxFileBytes) {
      return `[File omitted: ${skillManifestFileName} is larger than ${maxFileBytes} bytes.]`;
    }
    return fsSync.readFileSync(manifestPath, "utf8");
  } catch {
    return "";
  }
}

function listIndexedSkills(root, language = "en") {
  const rootPath = normalizeScanPath(root, "custom");
  return database
    .prepare(`
      SELECT skill_name, skill_path, description_file, summary
      FROM skill_directory_index
      WHERE root_path = ?
      ORDER BY skill_name COLLATE NOCASE, skill_path COLLATE NOCASE
    `)
    .all(rootPath)
    .map((row) => ({
      name: row.skill_name,
      path: row.skill_path,
      summary: row.summary || localize("No description file detected.", language),
      hasDescription: true,
      descriptionFile: row.description_file
    }));
}

function resolveRequestedSkillPath(root, skillName, requestedPath) {
  const rootPath = normalizeScanPath(root, "custom");
  if (requestedPath && typeof requestedPath === "string") {
    const resolvedPath = path.resolve(expandHomePath(requestedPath));
    const relativePath = path.relative(rootPath, resolvedPath);
    if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
      return resolvedPath;
    }
  }

  const row = database
    .prepare(`
      SELECT skill_path
      FROM skill_directory_index
      WHERE root_path = ? AND skill_name = ?
      ORDER BY skill_path COLLATE NOCASE
      LIMIT 1
    `)
    .get(rootPath, skillName);
  return row?.skill_path || path.join(rootPath, skillName);
}

function normalizeSkillPayload(skill) {
  if (!skill?.name) {
    throw new Error("A skill with a name is required.");
  }

  return {
    name: String(skill.name),
    path: String(skill.path || skill.name),
    description: String(skill.description || ""),
    fileStats: skill.fileStats && typeof skill.fileStats === "object"
      ? {
        total: Number(skill.fileStats.total || 0),
        directories: Number(skill.fileStats.directories || 0),
        files: Number(skill.fileStats.files || 0)
      }
      : null,
    files: Array.isArray(skill.files)
      ? skill.files.map((file) => ({
        name: String(file.name || path.basename(file.path || "")),
        path: String(file.path || file.name || ""),
        type: file.type === "directory" ? "directory" : "file",
        size: Number(file.size || 0)
      }))
      : []
  };
}

function buildAnalysisCacheMetadata(skill) {
  const contentHash = hashText(JSON.stringify({
    name: skill.name,
    description: skill.description,
    fileStats: skill.fileStats,
    files: skill.files.map((file) => [file.path, file.type, file.size])
  }));
  return {
    contentHash,
    skillPath: normalizeSkillStoragePath(skill.path)
  };
}

function normalizeSkillStoragePath(skillPath) {
  const value = String(skillPath || "").trim();
  return value ? path.normalize(value) : "";
}

function hashText(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function getCachedModelAnalysis(skill, model, language) {
  const selectedLanguage = normalizeLanguage(language);
  const { skillPath } = buildAnalysisCacheMetadata(skill);
  const row = database
    .prepare("SELECT analysis_json, updated_at FROM skill_model_analyses WHERE skill_path = ? AND language = ?")
    .get(skillPath, selectedLanguage);
  if (row) {
    return {
      ...JSON.parse(row.analysis_json),
      cachedAt: row.updated_at,
      cacheMatch: "exact"
    };
  }

  return null;
}

function saveModelAnalysis(skill, model, language, analysis) {
  const selectedLanguage = normalizeLanguage(language);
  const { skillPath, contentHash } = buildAnalysisCacheMetadata(skill);
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO skill_model_analyses (
      skill_name, skill_path, model, language, content_hash, analysis_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(skill_path, language) DO UPDATE SET
      skill_name = excluded.skill_name,
      model = excluded.model,
      content_hash = excluded.content_hash,
      analysis_json = excluded.analysis_json,
      updated_at = excluded.updated_at
  `).run(
    skill.name,
    skillPath,
    model,
    selectedLanguage,
    contentHash,
    JSON.stringify(analysis),
    now,
    now
  );
}

function buildTranslationCacheMetadata(skill) {
  const contentHash = hashText(String(skill.description || ""));
  return {
    contentHash,
    skillPath: normalizeSkillStoragePath(skill.path)
  };
}

function getCachedSkillTranslation(skill, model, language) {
  const selectedLanguage = normalizeLanguage(language);
  const { skillPath } = buildTranslationCacheMetadata(skill);
  const row = database
    .prepare("SELECT translated_markdown, updated_at FROM skill_markdown_translations WHERE skill_path = ? AND language = ?")
    .get(skillPath, selectedLanguage);
  if (!row) {
    return null;
  }
  return {
    source: "copilot-sdk",
    model,
    language: selectedLanguage,
    content: row.translated_markdown,
    cachedAt: row.updated_at
  };
}

function saveSkillTranslation(skill, model, language, translation) {
  if (translation?.skipped) {
    return;
  }
  const content = String(translation?.content || "").trim();
  if (!content) {
    return;
  }
  const selectedLanguage = normalizeLanguage(language);
  const { skillPath, contentHash } = buildTranslationCacheMetadata(skill);
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO skill_markdown_translations (
      skill_name, skill_path, model, language, content_hash, translated_markdown, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(skill_path, language) DO UPDATE SET
      skill_name = excluded.skill_name,
      model = excluded.model,
      content_hash = excluded.content_hash,
      translated_markdown = excluded.translated_markdown,
      updated_at = excluded.updated_at
  `).run(
    skill.name,
    skillPath,
    model,
    selectedLanguage,
    contentHash,
    content,
    now,
    now
  );
}

async function listSkills(root, language = "en") {
  const rootPath = normalizeScanPath(root, "custom");
  let skills = listIndexedSkills(rootPath, language);
  if (!skills.length && directoryExists(rootPath)) {
    refreshSkillIndex(rootPath);
    skills = listIndexedSkills(rootPath, language);
  }
  return skills;
}

async function readSkill(skillPath, name, language = "en") {
  const stat = await fs.stat(skillPath);
  if (!stat.isDirectory()) {
    throw new Error("Selected skill is not a directory.");
  }

  const descriptionFile = await findDescriptionFile(skillPath);
  const description = descriptionFile ? await readTextFile(descriptionFile) : "";
  const files = await walkSkillFiles(skillPath);

  return {
    name,
    path: skillPath,
    descriptionFile: descriptionFile ? path.basename(descriptionFile) : null,
    description,
    files,
    analysis: analyzeSkill({ name, description, files, language })
  };
}

async function findDescriptionFile(skillPath) {
  const candidatePath = path.join(skillPath, skillManifestFileName);
  try {
    const stat = await fs.stat(candidatePath);
    if (stat.isFile()) {
      return candidatePath;
    }
  } catch {
    // Conventional SKILL.md manifest does not exist.
  }
  return null;
}

async function readTextFile(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size > maxFileBytes) {
    return `[File omitted: ${path.basename(filePath)} is larger than ${maxFileBytes} bytes.]`;
  }
  return fs.readFile(filePath, "utf8");
}

async function walkSkillFiles(root, current = root, depth = 0) {
  if (depth > 4) {
    return [];
  }

  const entries = await fs.readdir(current, { withFileTypes: true });
  const visibleEntries = entries
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

  const results = [];
  for (const entry of visibleEntries) {
    const fullPath = path.join(current, entry.name);
    const relativePath = path.relative(root, fullPath);
    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: relativePath, type: "directory" });
      results.push(...(await walkSkillFiles(root, fullPath, depth + 1)));
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      results.push({ name: entry.name, path: relativePath, type: "file", size: stat.size });
    }
  }
  return results;
}

function extractSummary(description) {
  const frontmatterDescription = description.match(/^---[\s\S]*?\ndescription:\s*(.+?)\n[\s\S]*?---/i);
  if (frontmatterDescription?.[1]) {
    return frontmatterDescription[1].replace(/^["']|["']$/g, "").trim().slice(0, 180);
  }

  const clean = description
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .filter(Boolean)
    .find((line) => !line.startsWith("---") && !/^[a-z_-]+:/i.test(line));

  return clean ? clean.slice(0, 180) : "";
}

function analyzeSkill({ name, description, files, language = "en" }) {
  const text = `${name}\n${description}\n${files.map((file) => file.path).join("\n")}`;
  const lower = text.toLowerCase();

  const triggers = collectMatches(description, [
    /WHEN:\s*([^\n]+)/gi,
    /Triggers?:\s*([^\n]+)/gi,
    /Use when\s*[:\-]\s*([^\n]+)/gi
  ]).flatMap(splitTriggerText);

  const tools = detectTools(text);
  const extractedMethods = extractRunMethods(description, files, language);
  const methods = extractedMethods.length ? extractedMethods : [{
    id: "method-1",
    label: language === "zh" ? "按描述指令执行" : "Execute documented instructions",
    detail: buildReasoningSummary(lower, language)
  }];
  const decisions = buildDecisionNodes({ description, triggers, tools, files, language });
  const artifacts = files
    .filter((file) => file.type === "file")
    .map((file) => file.path)
    .filter((filePath) => /(\.md|\.json|\.ya?ml|\.sh|\.ps1|\.py|\.js|\.ts)$/i.test(filePath));

  const phases = [
    phase(localize("Activation", language), localize("Match user intent against trigger prompts and skill scope.", language), triggers.length, "signal"),
    phase(localize("Context intake", language), localize("Read the description file and supporting assets in the skill directory.", language), files.length, "folder"),
    phase(localize("Reasoning pass", language), buildReasoningSummary(lower, language), countReasoningSignals(lower), "model"),
    phase(
      localize("Tool choreography", language),
      tools.length
        ? localizeToolCount(tools.length, language)
        : localize("No explicit tool names detected; logic appears instruction-driven.", language),
      tools.length,
      "tool"
    ),
    phase(localize("Output handoff", language), buildOutputSummary(lower, language), artifacts.length, "ship")
  ];

  return {
    summary: buildSkillSummary(description, tools, triggers, files, language),
    triggers: triggers.slice(0, 12),
    tools,
    artifacts: artifacts.slice(0, 18),
    phases,
    methods,
    decisions,
    graph: buildSkillGraph({ name, description, triggers, tools, artifacts, files, methods, decisions, language }),
    fileStats: {
      total: files.length,
      directories: files.filter((file) => file.type === "directory").length,
      files: files.filter((file) => file.type === "file").length
    }
  };
}

function phase(title, detail, weight, kind) {
  return {
    title,
    detail,
    weight: Math.max(1, Math.min(9, weight || 1)),
    kind
  };
}

function collectMatches(text, patterns) {
  return patterns.flatMap((pattern) => Array.from(text.matchAll(pattern), (match) => match[1]));
}

function splitTriggerText(value) {
  return value
    .replace(/\\"/g, "\"")
    .split(/[,;|]/)
    .map((part) => part && part.trim().replace(/^["'`\\]+|["'`\\]+$/g, ""))
    .filter((part) => part && part.length > 1)
    .slice(0, 20);
}

function detectTools(text) {
  const toolPatterns = [
    "bash",
    "view",
    "rg",
    "glob",
    "apply_patch",
    "web_fetch",
    "ask_user",
    "task",
    "sql",
    "azure",
    "kubectl",
    "docker",
    "terraform",
    "bicep",
    "azd",
    "npm",
    "pip",
    "python",
    "node",
    "github",
    "playwright",
    "gh",
    "curl",
    "make",
    "helm",
    "jq",
    "az",
    "func"
  ];

  const normalized = text.toLowerCase();
  return toolPatterns
    .filter((tool) => normalized.includes(tool.toLowerCase()))
    .map((tool) => ({
      name: tool,
      role: inferToolRole(tool)
    }));
}

function extractRunMethods(description, files, language = "en") {
  const codeCommands = Array.from(description.matchAll(/```(?:bash|sh|shell|powershell|zsh)?\n([\s\S]*?)```/gi))
    .flatMap((match) => match[1].split("\n"))
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .slice(0, 8);

  const imperativeLines = description
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => /^(run|execute|call|invoke|use|check|create|deploy|install|configure|read|scan|validate|ask|query|list|generate|运行|执行|调用|使用|检查|创建|部署|安装|配置|读取|扫描|验证|查询|生成)/i.test(line))
    .slice(0, 8);

  const scriptFiles = files
    .filter((file) => file.type === "file" && /\.(sh|ps1|py|js|ts|mjs|cjs)$/i.test(file.path))
    .map((file) => language === "zh" ? `运行或引用 ${file.path}` : `Run or reference ${file.path}`)
    .slice(0, 6);

  return uniqueList([...codeCommands, ...imperativeLines, ...scriptFiles]).slice(0, 12).map((method, index) => ({
    id: `method-${index + 1}`,
    label: method.length > 90 ? `${method.slice(0, 87)}...` : method,
    detail: method
  }));
}

function buildDecisionNodes({ description, triggers, tools, files, language }) {
  const decisions = [
    {
      id: "decision-trigger",
      label: language === "zh" ? "意图是否匹配触发 Prompt？" : "Does the user intent match a trigger prompt?",
      detail: triggers.length
        ? (language === "zh" ? `检测到 ${triggers.length} 个触发 Prompt 信号。` : `${triggers.length} trigger prompt signals detected.`)
        : localize("No trigger prompts or typical scenarios found in the description.", language),
      outcome: triggers.length ? "yes" : "review"
    },
    {
      id: "decision-context",
      label: language === "zh" ? "是否有描述文件和支撑资产？" : "Are description and support files available?",
      detail: language === "zh" ? `${files.length} 个目录项可用于推理。` : `${files.length} directory entries are available for reasoning.`,
      outcome: files.length ? "yes" : "review"
    },
    {
      id: "decision-tools",
      label: language === "zh" ? "是否需要调用工具？" : "Does execution require tools?",
      detail: tools.length
        ? (language === "zh" ? `检测到 ${tools.length} 个工具面。` : `${tools.length} tool surfaces detected.`)
        : localize("No explicit tool names detected; logic appears instruction-driven.", language),
      outcome: tools.length ? "yes" : "manual"
    }
  ];

  if (/ask_user|clarify|confirm|approval|permission|用户确认|澄清|批准/i.test(description)) {
    decisions.push({
      id: "decision-human",
      label: language === "zh" ? "是否需要用户确认？" : "Is user confirmation required?",
      detail: language === "zh" ? "描述中出现澄清、确认或审批信号。" : "Clarification, confirmation, or approval signals appear in the description.",
      outcome: "conditional"
    });
  }

  return decisions;
}

function buildSkillGraph({ name, description, triggers, tools, artifacts, files, methods, decisions, language }) {
  const nodes = [];
  const edges = [];
  const addNode = (node) => {
    nodes.push(node);
    return node.id;
  };
  const addEdge = (source, target, label = "") => edges.push({ source, target, label });

  const entryId = addNode(graphNode("entry", "input", language === "zh" ? "用户意图" : "User intent", name, [
    language === "zh" ? "Skill 路由入口" : "Skill routing entry",
    ...triggers.slice(0, 4)
  ]));
  const triggerId = addNode(graphNode("trigger", "decision", decisions[0].label, decisions[0].detail, triggers.slice(0, 8)));
  const manifestId = addNode(graphNode("manifest", "document", language === "zh" ? "读取 Skill 描述" : "Read skill manifest", extractSummary(description) || name, [
    language === "zh" ? "解析描述、触发条件和约束" : "Parse description, triggers, and constraints"
  ]));
  const contextId = addNode(graphNode("context", "filesystem", language === "zh" ? "扫描目录资产" : "Scan directory assets", decisions[1].detail, files.slice(0, 10).map((file) => file.path)));
  addEdge(entryId, triggerId, language === "zh" ? "匹配" : "match");
  addEdge(triggerId, manifestId, decisions[0].outcome);
  addEdge(manifestId, contextId, language === "zh" ? "读取" : "read");

  let previous = contextId;
  for (const decision of decisions.slice(1)) {
    const decisionId = addNode(graphNode(decision.id, "decision", decision.label, decision.detail, [decision.outcome]));
    addEdge(previous, decisionId, language === "zh" ? "判断" : "decide");
    previous = decisionId;
  }

  const methodItems = methods.length ? methods : [{
    id: "method-1",
    label: language === "zh" ? "按描述指令执行" : "Execute documented instructions",
    detail: buildReasoningSummary(description.toLowerCase(), language)
  }];
  for (const method of methodItems.slice(0, 6)) {
    const methodId = addNode(graphNode(method.id, "method", method.label, method.detail, [
      language === "zh" ? "运行方法" : "run method"
    ]));
    addEdge(previous, methodId, language === "zh" ? "执行" : "execute");
    previous = methodId;
  }

  const toolHubId = addNode(graphNode("tool-hub", "tool", language === "zh" ? "工具编排" : "Tool orchestration", localizeToolCount(tools.length, language), tools.map((tool) => `${tool.name}: ${tool.role}`)));
  addEdge(previous, toolHubId, tools.length ? (language === "zh" ? "调用" : "call") : (language === "zh" ? "可选" : "optional"));

  for (const tool of tools.slice(0, 8)) {
    const toolId = addNode(graphNode(`tool-${tool.name}`, "tool", tool.name, tool.role, [
      language === "zh" ? "检测到的执行工具" : "Detected execution tool"
    ]));
    addEdge(toolHubId, toolId, language === "zh" ? "使用" : "uses");
  }

  const outputId = addNode(graphNode("output", "output", language === "zh" ? "结果交付" : "Output handoff", buildOutputSummary(description.toLowerCase(), language), artifacts.slice(0, 8)));
  addEdge(toolHubId, outputId, language === "zh" ? "产出" : "produce");

  return layoutGraph(nodes, edges);
}

function graphNode(id, type, title, detail, evidence = []) {
  return {
    id,
    type,
    title,
    detail,
    evidence: evidence.filter(Boolean).slice(0, 10)
  };
}

function layoutGraph(nodes, edges) {
  const rowGap = 126;
  const leftPadding = 56;
  const topPadding = 72;
  const nodeWidth = 128;
  const columns = {
    entry: 0,
    trigger: 1,
    manifest: 2,
    context: 3,
    "decision-context": 4,
    "decision-tools": 5,
    "decision-human": 6,
    "tool-hub": 9,
    output: 11
  };
  const typeColumns = { input: 0, decision: 2, document: 3, filesystem: 4, method: 7, tool: 10, output: 11 };
  const rowCounts = new Map();
  const columnByNodeId = new Map(nodes.map((node, index) => [node.id, columns[node.id] ?? typeColumns[node.type] ?? Math.min(index, 11)]));
  const columnCount = Math.max(...Array.from(columnByNodeId.values()), 0) + 1;
  const columnOffsets = calculateGraphColumnOffsets(edges, columnByNodeId, columnCount, nodeWidth, leftPadding);

  const laidOutNodes = nodes.map((node, index) => {
    const column = columns[node.id] ?? typeColumns[node.type] ?? Math.min(index, 11);
    const row = rowCounts.get(column) || 0;
    rowCounts.set(column, row + 1);
    return {
      ...node,
      x: columnOffsets[column] ?? leftPadding,
      y: topPadding + row * rowGap
    };
  });

  const width = Math.max(...laidOutNodes.map((node) => node.x), 640) + 170;
  const height = Math.max(...laidOutNodes.map((node) => node.y), 360) + 140;
  return { nodes: laidOutNodes, edges, width, height };
}

function calculateGraphColumnOffsets(edges, columnByNodeId, columnCount, nodeWidth, leftPadding) {
  const baseGap = nodeWidth + estimateGraphLabelWidth("中中中中中");
  const columnGaps = Array.from({ length: Math.max(0, columnCount - 1) }, () => baseGap);

  edges.forEach((edge) => {
    const sourceColumn = columnByNodeId.get(edge.source);
    const targetColumn = columnByNodeId.get(edge.target);
    if (sourceColumn === undefined || targetColumn === undefined || sourceColumn === targetColumn) {
      return;
    }
    const from = Math.min(sourceColumn, targetColumn);
    const to = Math.max(sourceColumn, targetColumn);
    const span = to - from;
    const requiredGap = nodeWidth + estimateGraphLabelWidth(edge.label);
    const perColumnGap = Math.ceil(requiredGap / span);
    for (let column = from; column < to; column += 1) {
      columnGaps[column] = Math.max(columnGaps[column] || baseGap, perColumnGap);
    }
  });

  return Array.from({ length: columnCount }, (_value, column) => {
    if (column === 0) {
      return leftPadding;
    }
    return leftPadding + columnGaps.slice(0, column).reduce((sum, gap) => sum + gap, 0);
  });
}

function estimateGraphLabelWidth(value) {
  const text = String(value || "").replace(/\s+/g, "").trim();
  const visualUnits = Math.max(5, Array.from(text).reduce((sum, character) => sum + (/[^\x00-\xff]/.test(character) ? 1 : 0.58), 0));
  return Math.ceil(visualUnits * 13 + 28);
}

function uniqueList(values) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function inferToolRole(tool) {
  const roles = toolRoles.en;
  return roles[tool] || "tool";
}

function countReasoningSignals(lower) {
  const signals = ["plan", "validate", "troubleshoot", "deploy", "analyze", "generate", "migrate", "configure"];
  return signals.reduce((total, signal) => total + (lower.includes(signal) ? 1 : 0), 0);
}

function buildReasoningSummary(lower, language = "en") {
  if (lower.includes("troubleshoot") || lower.includes("diagnostic")) {
    return localize("Diagnose state, isolate failure modes, then recommend a constrained remediation path.", language);
  }
  if (lower.includes("deploy") || lower.includes("provision")) {
    return localize("Plan resources, prepare configuration, then sequence deployment and validation steps.", language);
  }
  if (lower.includes("migrate")) {
    return localize("Map source workload semantics to the target platform and flag conversion gaps.", language);
  }
  return localize("Transform skill instructions into an ordered execution path with guardrails.", language);
}

function buildOutputSummary(lower, language = "en") {
  if (lower.includes("report")) {
    return localize("Produce a report-style result with findings, evidence, and next actions.", language);
  }
  if (lower.includes("code") || lower.includes("generate")) {
    return localize("Return generated assets or code changes with validation guidance.", language);
  }
  if (lower.includes("deploy")) {
    return localize("Leave the user with a deployed or deployment-ready workload.", language);
  }
  return localize("Return a concise, action-oriented handoff.", language);
}

function buildSkillSummary(description, tools, triggers, files, language = "en") {
  const summary = extractSummary(description);
  const clauses = [];
  if (summary) {
    clauses.push(summary);
  }
  clauses.push(language === "zh" ? `已扫描 ${files.length} 个目录项` : `${files.length} directory entries scanned`);
  clauses.push(language === "zh" ? `检测到 ${tools.length} 个工具面` : `${tools.length} tool surfaces detected`);
  if (triggers.length) {
    clauses.push(language === "zh" ? `发现 ${triggers.length} 个触发 Prompt 信号` : `${triggers.length} trigger prompt signals found`);
  }
  return clauses.join(" · ");
}

function localizeToolCount(count, language) {
  return language === "zh"
    ? `协调 ${count} 个检测到的工具面。`
    : `Coordinate ${count} detected tool surface${count === 1 ? "" : "s"}.`;
}

function localize(text, language = "en") {
  return translations[language]?.[text] || text;
}

async function getGitHubAuthStatus({ checkCli = false } = {}) {
  const hasGitHubToken = Boolean(getConfiguredGitHubToken());
  if (!checkCli) {
    return {
      cliInstalled: true,
      tokenAvailable: hasGitHubToken,
      authenticated: false,
      ready: hasGitHubToken,
      login: "",
      scopes: [],
      unchecked: true,
      ...buildGitHubAuthGuide({ authenticated: false, needsCopilotScope: false, cliInstalled: true, tokenAvailable: hasGitHubToken })
    };
  }

  try {
    const { stdout } = await execFileAsync("gh", ["auth", "status", "--json", "hosts"], { timeout: 6000 });
    const parsed = JSON.parse(stdout);
    const hosts = Object.entries(parsed.hosts || {}).flatMap(([hostname, value]) => {
      const accounts = Array.isArray(value) ? value : [value];
      return accounts.map((host) => ({ ...host, hostname }));
    });
    const active = hosts.find((host) => host.active) || hosts.find((host) => host.state === "success");
    const scopes = typeof active?.scopes === "string" ? active.scopes.split(/,\s*/) : active?.scopes || [];
    const needsCopilotScope = Boolean(active) && !scopes.includes("copilot");
    const login = active?.login || "";
    return {
      cliInstalled: true,
      tokenAvailable: hasGitHubToken,
      authenticated: Boolean(active),
      ready: hasGitHubToken || (Boolean(active) && !needsCopilotScope),
      login,
      name: "",
      avatarUrl: login ? `https://github.com/${encodeURIComponent(login)}.png?size=96` : "",
      hostname: active?.hostname || "github.com",
      scopes,
      needsCopilotScope,
      ...buildGitHubAuthGuide({ authenticated: Boolean(active), needsCopilotScope, cliInstalled: true, tokenAvailable: hasGitHubToken })
    };
  } catch (error) {
    const cliMissing = error?.code === "ENOENT";
    return {
      cliInstalled: !cliMissing,
      tokenAvailable: hasGitHubToken,
      authenticated: false,
      ready: hasGitHubToken,
      login: "",
      scopes: [],
      error: error.message,
      ...buildGitHubAuthGuide({ authenticated: false, needsCopilotScope: false, cliInstalled: !cliMissing, tokenAvailable: hasGitHubToken })
    };
  }
}

function buildGitHubAuthGuide(status = {}) {
  if (status.tokenAvailable) {
    return {
      authRequired: false,
      message: "GitHub token is available from the environment.",
      command: ""
    };
  }

  if (!status.cliInstalled) {
    return {
      authRequired: true,
      message: "Install GitHub CLI, then sign in and refresh Copilot scope.",
      command: "brew install gh && gh auth login --web && gh auth refresh --scopes copilot"
    };
  }

  if (status.authenticated && status.needsCopilotScope) {
    return {
      authRequired: true,
      message: "GitHub is signed in, but Copilot SDK needs the copilot OAuth scope.",
      command: "gh auth refresh --scopes copilot"
    };
  }

  if (!status.authenticated) {
    return {
      authRequired: true,
      message: "Sign in with GitHub CLI, then refresh the Copilot OAuth scope.",
      command: "gh auth login --web && gh auth refresh --scopes copilot"
    };
  }

  return {
    authRequired: false,
    message: "GitHub Copilot SDK authorization is ready.",
    command: ""
  };
}

async function createCopilotSdkClient() {
  const { CopilotClient } = await import("@github/copilot-sdk");
  const gitHubToken = getConfiguredGitHubToken();
  return {
    CopilotClient,
    client: new CopilotClient({
      logLevel: "error",
      ...(gitHubToken ? { gitHubToken, useLoggedInUser: false } : {})
    })
  };
}

function getConfiguredGitHubToken() {
  return String(process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
}

async function disconnectCopilotSession(session) {
  if (typeof session?.disconnect === "function") {
    await session.disconnect();
    return;
  }
  await session?.[Symbol.asyncDispose]?.();
}

async function cleanupCopilotSession(client, session) {
  const sessionId = session?.sessionId;
  try {
    await disconnectCopilotSession(session);
  } finally {
    if (sessionId && typeof client?.deleteSession === "function") {
      try {
        await client.deleteSession(sessionId);
      } catch (error) {
        logServerError(error, {
          scope: "copilot-sdk-session-cleanup",
          level: "warn",
          details: { sessionId },
          silent: true
        });
      }
    }
  }
}

async function stopCopilotClient(client) {
  if (typeof client?.stop === "function") {
    const errors = await client.stop();
    if (Array.isArray(errors) && errors.length) {
      console.warn("[copilot-sdk-stop]", errors.map(errorMessage).join("; "));
    }
    return;
  }
  await client?.[Symbol.asyncDispose]?.();
}

function withTimeout(promise, milliseconds, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), milliseconds);
    })
  ]);
}

function normalizeModels(models) {
  const normalized = (models || [])
    .map((model) => ({
      id: model.id || model.name,
      name: model.name || model.id,
      source: "copilot-sdk"
    }))
    .filter((model) => model.id);

  return normalized.length ? normalized : fallbackModels;
}

async function generateModelLogicMap(skill, model, language = "en", progress = {}) {
  updateProgress(progress.requestId, "rule-analysis", language);
  const ruleAnalysis = analyzeSkill({ name: skill.name, description: skill.description, files: skill.files, language });
  if (skill.fileStats) {
    ruleAnalysis.fileStats = skill.fileStats;
  }
  updateProgress(progress.requestId, "prompt-analysis", language);
  const { approveAll } = await import("@github/copilot-sdk");
  const selectedModel = model && model !== "github-default" ? model : undefined;
  const { client } = await createCopilotSdkClient();
  try {
    updateProgress(progress.requestId, "sdk-start", language);
    await withTimeout(client.start(), 10_000, "Timed out while starting Copilot SDK runtime.");
    updateProgress(progress.requestId, "session-create", language);
    const session = await client.createSession({
      onPermissionRequest: approveAll,
      ...(selectedModel ? { model: selectedModel } : {})
    });
    try {
      updateProgress(progress.requestId, "model-scores", language);
      const scores = await sendModelJson(session, buildLogicMapScoresPrompt(skill, ruleAnalysis, language), 60_000, "Timed out while generating model scores.");
      updateProgress(progress.requestId, "model-insights", language);
      const insights = await sendModelJson(session, buildLogicMapInsightsPrompt(skill, ruleAnalysis, language), 60_000, "Timed out while generating model insights and activation examples.");
      updateProgress(progress.requestId, "logic-graph", language);
      const graph = await sendModelJson(session, buildLogicMapGraphPrompt(skill, ruleAnalysis, language), 75_000, "Timed out while generating model-driven logic graph.");
      updateProgress(progress.requestId, "merge-analysis", language);
      return normalizeModelLogicMap(mergeModelLogicMapParts(scores, insights, graph), ruleAnalysis, model, language);
    } finally {
      await cleanupCopilotSession(client, session);
    }
  } finally {
    await stopCopilotClient(client);
  }
}

async function sendModelJson(session, prompt, timeoutMs, message) {
  const reply = await withTimeout(
    session.sendAndWait({ prompt }),
    timeoutMs,
    message
  );
  return parseModelJson(reply?.data?.content || "");
}

function mergeModelLogicMapParts(scores, insights, graph) {
  return {
    summary: scores?.summary || graph?.summary || insights?.summary || "",
    insight: insights?.insight || "",
    insightSections: insights?.insightSections || insights?.insights || {},
    complexity: scores?.complexity,
    roi: scores?.roi,
    activationPhrases: insights?.activationPhrases || insights?.triggers || insights?.examplePrompts,
    nodes: graph?.nodes || graph?.graph?.nodes || [],
    edges: graph?.edges || graph?.graph?.edges || []
  };
}

async function generateSkillMarkdownTranslation(skill, model, language = "en", progress = {}) {
  const markdown = String(skill.description || "").trim();
  if (!markdown) {
    return {
      source: "rules",
      model,
      language,
      content: "",
      generatedAt: new Date().toISOString()
    };
  }

  const skipped = getSkippedSkillTranslation(skill, model, language, progress);
  if (skipped) {
    return skipped;
  }

  updateProgress(progress.requestId, "translation-start", language);
  const { approveAll } = await import("@github/copilot-sdk");
  const selectedModel = model && model !== "github-default" ? model : undefined;
  const { client } = await createCopilotSdkClient();
  try {
    updateProgress(progress.requestId, "translation-sdk-start", language);
    await withTimeout(client.start(), 10_000, "Timed out while starting Copilot SDK runtime.");
    updateProgress(progress.requestId, "translation-session-create", language);
    const session = await client.createSession({
      onPermissionRequest: approveAll,
      ...(selectedModel ? { model: selectedModel } : {})
    });
    try {
      const chunks = splitMarkdownForTranslation(markdown);
      const translatedChunks = [];
      for (let index = 0; index < chunks.length; index += 1) {
        updateProgress(progress.requestId, "translation-chunk", language, "running", { current: index + 1, total: chunks.length });
        const reply = await withTimeout(
          session.sendAndWait({
            prompt: buildSkillMarkdownTranslationPrompt(skill, language, chunks[index], index + 1, chunks.length)
          }),
          60_000,
          `Timed out while translating Skill markdown part ${index + 1}/${chunks.length}.`
        );
        translatedChunks.push(sanitizeTranslatedMarkdown(reply?.data?.content || ""));
      }
      return {
        source: "copilot-sdk",
        model,
        language,
        content: translatedChunks.filter(Boolean).join("\n\n"),
        generatedAt: new Date().toISOString()
      };
    } finally {
      await cleanupCopilotSession(client, session);
    }
  } finally {
      await stopCopilotClient(client);
  }
}

function splitMarkdownForTranslation(markdown, maxChunkLength = 9_000) {
  const lines = String(markdown || "").split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxChunkLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length ? chunks : [String(markdown || "")];
}

function buildSkillMarkdownTranslationPrompt(skill, language = "en", markdownPart = String(skill.description || ""), partNumber = 1, totalParts = 1) {
  const targetLanguage = language === "zh" ? "Simplified Chinese" : "English";
  const instruction = language === "zh"
    ? "把下面的 SKILL.md 翻译为简体中文。保留 Markdown 层级、列表、表格、代码块、YAML frontmatter 的键名、路径、命令、代码、URL、模型名、API 名称和专有名词。只翻译自然语言说明。不要添加解释，不要包裹 markdown 代码围栏。"
    : "Translate the SKILL.md below into English. Preserve Markdown hierarchy, lists, tables, code fences, YAML frontmatter keys, paths, commands, code, URLs, model names, API names, and proper nouns. Translate only natural-language prose. Do not add commentary and do not wrap the result in a markdown code fence.";
  const partInstruction = totalParts > 1
    ? `\nThis is part ${partNumber} of ${totalParts}. Translate only this part. Do not summarize missing parts and do not add part headings.`
    : "";

  return `${instruction}${partInstruction}

Target language: ${targetLanguage}
Skill: ${skill.name}

SKILL.md:
${String(markdownPart || "")}`;
}

function sanitizeTranslatedMarkdown(value) {
  return String(value || "")
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildModelPrompt(skill, language = "en") {
  const fileList = (skill.files || []).slice(0, 80).map((file) => `- ${file.type}: ${file.path}`).join("\n");
  const instruction =
    language === "zh"
      ? "请用中文输出。用 3 条短句分析这个 Skill 的执行逻辑、关键工具和潜在风险。不要复述原文。"
      : "Respond in English. Use 3 concise bullets to analyze this Skill's execution logic, key tools, and possible risks. Do not restate the source.";

  return `${instruction}

Skill: ${skill.name}

Description:
${String(skill.description).slice(0, 6000)}

Files:
${fileList}`;
}

function buildLogicMapContext(skill, ruleAnalysis) {
  const fileList = (skill.files || []).slice(0, 120).map((file) => `- ${file.type}: ${file.path}`).join("\n");
  const rulesGraph = JSON.stringify({
    summary: ruleAnalysis.summary,
    ruleComplexityScore: calculateRuleComplexity(ruleAnalysis),
    fileStats: ruleAnalysis.fileStats,
    sampledFiles: skill.files.length,
    triggers: ruleAnalysis.triggers,
    tools: ruleAnalysis.tools,
    methods: ruleAnalysis.methods?.map((method) => method.label),
    decisions: ruleAnalysis.decisions?.map((decision) => decision.label),
    nodes: ruleAnalysis.graph?.nodes?.map((node) => ({ id: node.id, type: node.type, title: node.title, detail: node.detail })),
    edges: ruleAnalysis.graph?.edges
  }, null, 2);

  return `Skill: ${skill.name}

Rule analysis context:
${rulesGraph}

Full Skill.md / description:
${String(skill.description || "")}

Files:
${fileList}`;
}

function buildLogicMapScoresPrompt(skill, ruleAnalysis, language = "en") {
  const localeInstruction = language === "zh"
    ? "所有 summary 和 rationale 使用中文。"
    : "Use English for summary and rationale.";

  return `You are evaluating an Agent Skill for a local visualization app.
Return only valid JSON. Do not wrap it in markdown.
${localeInstruction}

Analyze the full Skill content below. Do not rely on a compressed summary.
Return exactly this JSON shape:
{
  "summary": "one sentence skill execution summary",
  "complexity": { "score": 0-99, "rationale": "why this Skill is simple or complex" },
  "roi": { "score": 0-99, "manualTimeEstimate": "traditional human execution time, e.g. 45 min or 3-5 hours", "rationale": "why this saves that much effort" }
}

Complexity score must use one unified 0-99 scale: execution branches, tool orchestration, required context, artifact count, and risk/approval burden.
ROI score must use traditional manual execution time as the main standard: higher score means the Skill replaces more manual human work.

${buildLogicMapContext(skill, ruleAnalysis)}`;
}

function buildLogicMapInsightsPrompt(skill, ruleAnalysis, language = "en") {
  const localeInstruction = language === "zh"
    ? "所有 insightSections、activationPhrases.prompt 和 activationPhrases.useCase 使用中文。"
    : "Use English for all insightSections, activationPhrases.prompt, and activationPhrases.useCase.";
  const insightInstruction = language === "zh"
    ? `insightSections 是模型洞察的核心输出，必须像资深产品/架构评审写给用户的洞察，而不是复述流程图。每个字段写 1 句短句：
- valueScenario：这个 Skill 最适合在哪类真实任务/用户场景中使用。
- designHighlight：它的设计巧思、抽象方式、工具路由、兜底策略或体验亮点。
- problemSolved：它把原本哪些分散、易错、耗时或高门槛的问题变简单。
- optimizationSpace：一个具体、可执行的后续改进方向。`
    : `insightSections is the core model-insight output and must read like a senior product/architecture review for the user, not a replay of the graph. Write 1 concise sentence per field:
- valueScenario: the real user task/context where this Skill is most useful.
- designHighlight: the clever abstraction, tool routing, fallback strategy, or UX detail.
- problemSolved: what fragmented, error-prone, slow, or high-friction work it simplifies.
- optimizationSpace: one concrete next improvement opportunity.`;

  return `You are evaluating an Agent Skill for a local visualization app.
Return only valid JSON. Do not wrap it in markdown.
${localeInstruction}

Analyze the full Skill content below. Do not rely on a compressed summary.
Return exactly this JSON shape:
{
  "insight": "single fallback paragraph if insightSections cannot be produced",
  "insightSections": {
    "valueScenario": "real user scenario where the Skill creates value",
    "designHighlight": "design highlight, clever abstraction, or thoughtful interaction",
    "problemSolved": "specific fragmented, error-prone, slow, or high-friction problem simplified",
    "optimizationSpace": "specific future improvement or optimization opportunity"
  },
  "activationPhrases": [
    { "prompt": "realistic user prompt that should trigger this Skill", "useCase": "typical scenario where this Skill is useful" },
    { "prompt": "realistic user prompt that should trigger this Skill", "useCase": "typical scenario where this Skill is useful" },
    { "prompt": "realistic user prompt that should trigger this Skill", "useCase": "typical scenario where this Skill is useful" }
  ]
}

${insightInstruction}
For activationPhrases, return exactly 3 items. If the Skill description contains WHEN/trigger hints, convert the most representative ones into full user prompts instead of copying keywords verbatim. If no trigger hints are present, infer realistic prompts and scenarios from the Skill description and files.

${buildLogicMapContext(skill, ruleAnalysis)}`;
}

function buildLogicMapGraphPrompt(skill, ruleAnalysis, language = "en") {
  const localeInstruction = language === "zh"
    ? "所有 title、detail、label 和 evidence 使用中文；文件名、命令、产品名和专有名词保持原样。"
    : "Use English for title, detail, label, and evidence; preserve file names, commands, product names, and proper nouns.";

  return `You are generating an Agent Skill execution graph for a local visualization app.
Return only valid JSON. Do not wrap it in markdown.
${localeInstruction}

Analyze the full Skill content below. Do not rely on a compressed summary.
Return exactly this JSON shape:
{
  "nodes": [
    { "id": "stable-kebab-id", "type": "input|decision|document|filesystem|method|tool|output", "title": "short title", "detail": "short operational detail", "evidence": ["source phrase or file"] }
  ],
  "edges": [
    { "source": "node id", "target": "node id", "label": "short transition label" }
  ]
}

Create 6 to 14 nodes. Keep node detail under 140 characters. Use evidence from the description or file list.
The graph must start with an input node and end with an output node.
Represent the actual execution path accurately: triggers, required context, decisions, tools, browser/file/system interactions, user review points, and final outputs.

${buildLogicMapContext(skill, ruleAnalysis)}`;
}

function buildLogicMapPrompt(skill, ruleAnalysis, language = "en") {
  const fileList = (skill.files || []).slice(0, 80).map((file) => `- ${file.type}: ${file.path}`).join("\n");
  const rulesGraph = JSON.stringify({
    summary: ruleAnalysis.summary,
    ruleComplexityScore: calculateRuleComplexity(ruleAnalysis),
    fileStats: ruleAnalysis.fileStats,
    sampledFiles: skill.files.length,
    triggers: ruleAnalysis.triggers,
    tools: ruleAnalysis.tools,
    methods: ruleAnalysis.methods?.map((method) => method.label),
    decisions: ruleAnalysis.decisions?.map((decision) => decision.label)
  }, null, 2);
  const localeInstruction = language === "zh"
    ? "所有 title、detail、label、summary、insight 使用中文。"
    : "Use English for every title, detail, label, summary, and insight.";
  const insightInstruction = language === "zh"
    ? `insightSections 是模型洞察的核心输出，必须像资深产品/架构评审写给用户的洞察，而不是复述流程图。每个字段写 1 句短句：
- valueScenario：这个 Skill 最适合在哪类真实任务/用户场景中使用。
- designHighlight：它的设计巧思、抽象方式、工具路由、兜底策略或体验亮点。
- problemSolved：它把原本哪些分散、易错、耗时或高门槛的问题变简单。
- optimizationSpace：一个具体、可执行的后续改进方向。`
    : `insightSections is the core model-insight output and must read like a senior product/architecture review for the user, not a replay of the graph. Write 1 concise sentence per field:
- valueScenario: the real user task/context where this Skill is most useful.
- designHighlight: the clever abstraction, tool routing, fallback strategy, or UX detail.
- problemSolved: what fragmented, error-prone, slow, or high-friction work it simplifies.
- optimizationSpace: one concrete next improvement opportunity.`;

  return `You are generating a Skill execution logic map for a local visualization app.
Return only valid JSON. Do not wrap it in markdown.
${localeInstruction}

Required JSON shape:
{
  "summary": "one sentence skill execution summary",
  "insight": "single fallback paragraph if insightSections cannot be produced",
  "insightSections": {
    "valueScenario": "real user scenario where the Skill creates value",
    "designHighlight": "design highlight, clever abstraction, or thoughtful interaction",
    "problemSolved": "specific fragmented, error-prone, slow, or high-friction problem simplified",
    "optimizationSpace": "specific future improvement or optimization opportunity"
  },
  "complexity": { "score": 0-99, "rationale": "why this Skill is simple or complex" },
  "roi": { "score": 0-99, "manualTimeEstimate": "traditional human execution time, e.g. 45 min or 3-5 hours", "rationale": "why this saves that much effort" },
  "activationPhrases": [
    { "prompt": "realistic user prompt that should trigger this Skill", "useCase": "typical scenario where this Skill is useful" },
    { "prompt": "realistic user prompt that should trigger this Skill", "useCase": "typical scenario where this Skill is useful" },
    { "prompt": "realistic user prompt that should trigger this Skill", "useCase": "typical scenario where this Skill is useful" }
  ],
  "nodes": [
    { "id": "stable-kebab-id", "type": "input|decision|document|filesystem|method|tool|output", "title": "short title", "detail": "short operational detail", "evidence": ["source phrase or file"] }
  ],
  "edges": [
    { "source": "node id", "target": "node id", "label": "short transition label" }
  ]
}

Create 6 to 14 nodes. Keep node detail under 140 characters. Use evidence from the description or file list.
The graph must start with an input node and end with an output node.
${insightInstruction}
Do not use insight or insightSections to merely describe node order. Explain the Skill's user value, design thinking, solved problem, and improvement potential.
Complexity score must use one unified 0-99 scale: execution branches, tool orchestration, required context, artifact count, and risk/approval burden.
ROI score must use traditional manual execution time as the main standard: higher score means the Skill replaces more manual human work.
For activationPhrases, return exactly 3 items. Each item must pair:
- prompt: a complete user prompt that would naturally trigger this Skill in an agent conversation.
- useCase: the typical task scenario represented by that prompt.
If the Skill description contains WHEN/trigger hints, convert the most representative ones into full user prompts instead of copying keywords verbatim. If no trigger hints are present, infer realistic prompts and scenarios from the Skill description and files.

Skill: ${skill.name}

Rule analysis context:
${rulesGraph}

Description:
${String(skill.description).slice(0, 7000)}

Files:
The list below is a representative sample when the Skill directory is very large.
${fileList}`;
}

function parseModelJson(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    throw new Error("No model response was returned.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model response did not contain JSON.");
    }
    return JSON.parse(match[0]);
  }
}

function normalizeModelLogicMap(parsed, ruleAnalysis, model, language) {
  const rawNodes = Array.isArray(parsed.nodes) ? parsed.nodes : parsed.graph?.nodes;
  const rawEdges = Array.isArray(parsed.edges) ? parsed.edges : parsed.graph?.edges;
  if (!Array.isArray(rawNodes) || rawNodes.length < 2) {
    throw new Error("Model response did not include enough graph nodes.");
  }

  const allowedTypes = new Set(["input", "decision", "document", "filesystem", "method", "tool", "output"]);
  const seenIds = new Set();
  const nodes = rawNodes.slice(0, 18).map((node, index) => {
    const fallbackId = `model-node-${index + 1}`;
    const id = uniqueNodeId(slugify(node.id || node.title || fallbackId) || fallbackId, seenIds);
    return graphNode(
      id,
      allowedTypes.has(node.type) ? node.type : "method",
      String(node.title || id).slice(0, 80),
      String(node.detail || "").slice(0, 220),
      Array.isArray(node.evidence) ? node.evidence.map((item) => String(item)).slice(0, 10) : []
    );
  });
  const idSet = new Set(nodes.map((node) => node.id));
  const idByOriginal = new Map(rawNodes.slice(0, 18).map((node, index) => [String(node.id || node.title || `model-node-${index + 1}`), nodes[index].id]));
  const edges = Array.isArray(rawEdges)
    ? rawEdges
      .map((edge) => ({
        source: idByOriginal.get(String(edge.source)) || slugify(edge.source),
        target: idByOriginal.get(String(edge.target)) || slugify(edge.target),
        label: String(edge.label || "").slice(0, 32)
      }))
      .filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))
      .slice(0, 24)
    : [];

  if (!edges.length && nodes.length > 1) {
    for (let index = 0; index < nodes.length - 1; index += 1) {
      edges.push({ source: nodes[index].id, target: nodes[index + 1].id, label: language === "zh" ? "然后" : "then" });
    }
  }

  return {
    source: "copilot-sdk",
    model,
    summary: String(parsed.summary || ruleAnalysis.summary).slice(0, 240),
    insight: formatModelInsight(parsed, language),
    complexity: normalizeScorePayload(parsed.complexity, calculateRuleComplexity(ruleAnalysis), language === "zh" ? "模型基于执行分支、工具编排和风险判断评分。" : "Model scored execution branches, tool orchestration, and risk burden."),
    roi: normalizeRoiPayload(parsed.roi, language),
    activationPhrases: normalizeActivationPhrases(parsed.activationPhrases || parsed.triggers || parsed.examplePrompts, ruleAnalysis.triggers, language),
    graph: layoutGraph(nodes, edges),
    generatedAt: new Date().toISOString()
  };
}

function formatModelInsight(parsed, language = "en") {
  const sections = parsed.insightSections || parsed.insights || parsed.insight_section || {};
  const sectionValues = {
    valueScenario: sanitizeInsightText(sections.valueScenario || sections.value || sections.scenario || sections.useCase),
    designHighlight: sanitizeInsightText(sections.designHighlight || sections.design || sections.highlight || sections.cleverness),
    problemSolved: sanitizeInsightText(sections.problemSolved || sections.problem || sections.solvedProblem || sections.painPoint),
    optimizationSpace: sanitizeInsightText(sections.optimizationSpace || sections.optimization || sections.improvement || sections.nextStep)
  };
  const hasStructuredInsight = Object.values(sectionValues).some(Boolean);
  if (!hasStructuredInsight) {
    return sanitizeInsightText(parsed.insight).slice(0, 1200);
  }

  const labels = language === "zh"
    ? {
      valueScenario: "价值场景",
      designHighlight: "设计亮点",
      problemSolved: "解决问题",
      optimizationSpace: "优化空间"
    }
    : {
      valueScenario: "Value Scenario",
      designHighlight: "Design Highlight",
      problemSolved: "Problem Solved",
      optimizationSpace: "Optimization Space"
    };
  const separator = language === "zh" ? "：" : ": ";
  return ["valueScenario", "designHighlight", "problemSolved", "optimizationSpace"]
    .map((key) => sectionValues[key] ? `${labels[key]}${separator}${sectionValues[key]}` : "")
    .filter(Boolean)
    .join("\n")
    .slice(0, 1200);
}

function sanitizeInsightText(value) {
  return String(value || "")
    .replace(/^[-*\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeActivationPhrases(value, fallbackTriggers, language) {
  const phrases = Array.isArray(value)
    ? value.map((item) => formatActivationPrompt(item, language))
    : typeof value === "string"
      ? value.split(/\n|;|\|/)
      : [];
  const normalized = uniqueList(phrases.map((phrase) => String(phrase).replace(/^[-*\d.)\s]+/, "").trim()))
    .filter((phrase) => phrase.length > 3)
    .slice(0, 3);
  const fallbackExamples = fallbackTriggers?.length
    ? fallbackTriggers.slice(0, 3).map((trigger) => formatFallbackActivationPrompt(trigger, language)).filter(Boolean)
    : [];
  if (normalized.length) {
    return uniqueList([...normalized, ...fallbackExamples]).slice(0, 3);
  }
  if (fallbackExamples.length) {
    return fallbackExamples;
  }
  return language === "zh"
    ? [
      "Prompt：请判断当前任务是否应该调用这个 Skill，并按它的流程执行。 · 场景：用户需要把模糊需求路由到专门 Skill。",
      "Prompt：请用这个 Skill 帮我完成对应的自动化任务。 · 场景：用户已经知道任务类型与该 Skill 匹配。",
      "Prompt：根据当前上下文，使用该 Skill 生成可执行方案。 · 场景：用户需要从 Skill 说明转成具体执行步骤。"
    ]
    : [
      "Prompt: Decide whether this task should use this Skill and run its workflow. · Scenario: A broad request needs routing to a specialized Skill.",
      "Prompt: Use this Skill to complete the matching automation task. · Scenario: The user already knows this Skill fits the task.",
      "Prompt: Based on my current context, use this Skill to produce an executable plan. · Scenario: The user needs Skill instructions turned into concrete steps."
    ];
}

function formatActivationPrompt(item, language) {
  if (item && typeof item === "object") {
    const prompt = String(item.prompt || item.triggerPrompt || item.examplePrompt || item.phrase || "").trim();
    const useCase = String(item.useCase || item.scenario || item.typicalUseCase || "").trim();
    if (prompt && useCase) {
      return language === "zh"
        ? `Prompt：${prompt} · 场景：${useCase}`
        : `Prompt: ${prompt} · Scenario: ${useCase}`;
    }
    return prompt || useCase;
  }
  return item;
}

function formatFallbackActivationPrompt(trigger, language) {
  const text = String(trigger || "").trim();
  if (!text) {
    return "";
  }
  return language === "zh"
    ? `Prompt：${text} · 场景：用户明确提出与该触发条件匹配的任务。`
    : `Prompt: ${text} · Scenario: The user asks for a task matching this trigger condition.`;
}

function normalizeScorePayload(value, fallbackScore, fallbackRationale) {
  const score = clampScore(value?.score ?? fallbackScore);
  return {
    score,
    rationale: String(value?.rationale || fallbackRationale).slice(0, 600)
  };
}

function normalizeRoiPayload(value, language) {
  return {
    score: clampScore(value?.score ?? 0),
    manualTimeEstimate: String(value?.manualTimeEstimate || value?.manualTime || (language === "zh" ? "未估算" : "Not estimated")).slice(0, 80),
    rationale: String(value?.rationale || (language === "zh" ? "模型未返回 ROI 解释。" : "The model did not return an ROI rationale.")).slice(0, 600)
  };
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(99, Math.round(numeric)));
}

function calculateRuleComplexity(analysis) {
  return Math.min(99, analysis.fileStats.files * 2 + analysis.tools.length * 7 + analysis.triggers.length * 3);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniqueNodeId(id, seenIds) {
  let candidate = id;
  let counter = 2;
  while (seenIds.has(candidate)) {
    candidate = `${id}-${counter}`;
    counter += 1;
  }
  seenIds.add(candidate);
  return candidate;
}

const translations = {
  zh: {
    "No description file detected.": "未检测到描述文件。",
    "Activation": "触发识别",
    "Match user intent against trigger prompts and skill scope.": "将用户意图匹配到触发 Prompt 和 Skill 适用范围。",
    "Context intake": "上下文读取",
    "Read the description file and supporting assets in the skill directory.": "读取描述文件和 Skill 目录中的支撑资产。",
    "Reasoning pass": "推理编排",
    "Tool choreography": "工具编排",
    "No explicit tool names detected; logic appears instruction-driven.": "未检测到明确工具名称，逻辑主要由指令驱动。",
    "Output handoff": "结果交付",
    "Diagnose state, isolate failure modes, then recommend a constrained remediation path.": "诊断状态、隔离故障模式，然后推荐受控修复路径。",
    "Plan resources, prepare configuration, then sequence deployment and validation steps.": "规划资源、准备配置，然后编排部署和验证步骤。",
    "Map source workload semantics to the target platform and flag conversion gaps.": "将源工作负载语义映射到目标平台，并标记转换缺口。",
    "Transform skill instructions into an ordered execution path with guardrails.": "将 Skill 指令转换为带护栏的有序执行路径。",
    "Produce a report-style result with findings, evidence, and next actions.": "输出包含发现、证据和后续动作的报告式结果。",
    "Return generated assets or code changes with validation guidance.": "返回生成资产或代码变更，并附带验证建议。",
    "Leave the user with a deployed or deployment-ready workload.": "交付已部署或可部署的工作负载。",
    "Return a concise, action-oriented handoff.": "返回简洁、面向行动的交付说明。",
    "No trigger prompts or typical scenarios found in the description.": "描述中未找到触发 Prompt 或典型使用场景。",
    "Model insight is unavailable. Sign in with GitHub and refresh Copilot scopes to enable SDK-driven analysis.": "模型洞察不可用。请登录 GitHub 并刷新 Copilot 权限后启用 SDK 驱动分析。"
  }
};

const toolRoles = {
  en: {
    bash: "command runner",
    view: "file reader",
    rg: "code search",
    glob: "file discovery",
    apply_patch: "code editing",
    web_fetch: "web retrieval",
    ask_user: "clarification",
    task: "delegation",
    sql: "state tracking",
    azure: "cloud operations",
    kubectl: "cluster operations",
    docker: "container workflow",
    terraform: "infrastructure",
    bicep: "infrastructure",
    azd: "Azure deployment",
    npm: "JavaScript workflow",
    pip: "Python packages",
    python: "script execution",
    node: "runtime",
    github: "source control",
    playwright: "browser automation"
  }
};

app.use((error, request, response, _next) => {
  sendJsonError(response, request, 500, error, { scope: "express-unhandled" });
});

process.on("unhandledRejection", (reason) => {
  logServerError(reason, { scope: "process-unhandled-rejection" });
});

process.on("uncaughtException", (error) => {
  logServerError(error, { scope: "process-uncaught-exception" });
  process.exitCode = 1;
  setTimeout(() => process.exit(1), 100).unref();
});

app.listen(port, () => {
  console.log(`AI Agent Skills Console running at http://localhost:${port}`);
  console.log(`Default skill root: ${defaultSkillRoot}`);
});
