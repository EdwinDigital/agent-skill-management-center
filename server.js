import express from "express";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const app = express();
const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 4173);
const defaultSkillRoot = process.env.SKILL_ROOT || path.join(os.homedir(), ".agents", "skills");
const fallbackModels = [
  { id: "gpt-5", name: "GPT-5", source: "fallback" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", source: "fallback" },
  { id: "github-default", name: "GitHub default", source: "fallback" }
];
const maxFileBytes = 220_000;
const descriptionCandidates = [
  "SKILL.md",
  "skill.md",
  "README.md",
  "readme.md",
  "DESCRIPTION.md",
  "description.md",
  "manifest.json",
  "skill.json"
];

app.use(express.json({ limit: "1mb" }));
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

app.get("/api/skills", async (request, response) => {
  const root = resolveRequestedRoot(request.query.root);
  const language = normalizeLanguage(request.query.language);
  try {
    const skills = await listSkills(root, language);
    response.json({ root, skills });
  } catch (error) {
    response.status(400).json({ error: error.message, root });
  }
});

app.get("/api/skills/:name", async (request, response) => {
  const root = resolveRequestedRoot(request.query.root);
  const language = normalizeLanguage(request.query.language);
  const skillName = path.basename(request.params.name);
  const skillPath = path.join(root, skillName);

  try {
    const skill = await readSkill(skillPath, skillName, language);
    response.json({ root, skill });
  } catch (error) {
    response.status(400).json({ error: error.message, root, skillName });
  }
});

app.get("/api/auth/github/status", async (_request, response) => {
  response.json(await getGitHubAuthStatus());
});

app.post("/api/auth/github/login", async (_request, response) => {
  const status = await getGitHubAuthStatus();
  const command = status.authenticated ? "gh auth refresh --scopes copilot" : "gh auth login --web && gh auth refresh --scopes copilot";
  response.json({
    ok: false,
    message: "Run this command in your terminal, then press Check status.",
    command
  });
});

app.get("/api/models", async (_request, response) => {
  try {
    const { CopilotClient } = await import("@github/copilot-sdk");
    const client = new CopilotClient({ logLevel: "error" });
    try {
      await withTimeout(client.start(), 10_000, "Timed out while starting Copilot SDK runtime.");
      const models = await withTimeout(client.listModels(), 10_000, "Timed out while listing Copilot models.");
      response.json({
        source: "copilot-sdk",
        models: normalizeModels(models)
      });
    } finally {
      await client[Symbol.asyncDispose]?.();
    }
  } catch (error) {
    response.json({
      source: "fallback",
      error: error.message,
      models: fallbackModels
    });
  }
});

app.post("/api/analyze-skill", async (request, response) => {
  const { skill, model, language } = request.body || {};
  if (!skill?.name || !skill?.description) {
    response.status(400).json({ error: "A skill with name and description is required." });
    return;
  }

  try {
    const { approveAll, CopilotClient } = await import("@github/copilot-sdk");
    const selectedModel = model && model !== "github-default" ? model : undefined;
    const client = new CopilotClient({ logLevel: "error" });
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
        await session[Symbol.asyncDispose]?.();
      }
    } finally {
      await client[Symbol.asyncDispose]?.();
    }
  } catch (error) {
    response.status(503).json({
      source: "rules",
      error: error.message,
      content: localize("Model insight is unavailable. Sign in with GitHub and refresh Copilot scopes to enable SDK-driven analysis.", normalizeLanguage(language))
    });
  }
});

function resolveRequestedRoot(root) {
  if (!root || typeof root !== "string") {
    return defaultSkillRoot;
  }

  const expanded = root.startsWith("~/") ? path.join(os.homedir(), root.slice(2)) : root;
  return path.resolve(expanded);
}

function normalizeLanguage(language) {
  return language === "zh" ? "zh" : "en";
}

async function listSkills(root, language = "en") {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory());

  return Promise.all(
    directories.map(async (entry) => {
      const skillPath = path.join(root, entry.name);
      const descriptionFile = await findDescriptionFile(skillPath);
      const description = descriptionFile ? await readTextFile(descriptionFile) : "";
      return {
        name: entry.name,
        path: skillPath,
        summary: extractSummary(description) || localize("No description file detected.", language),
        hasDescription: Boolean(descriptionFile),
        descriptionFile: descriptionFile ? path.basename(descriptionFile) : null
      };
    })
  );
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
  for (const candidate of descriptionCandidates) {
    const candidatePath = path.join(skillPath, candidate);
    try {
      const stat = await fs.stat(candidatePath);
      if (stat.isFile()) {
        return candidatePath;
      }
    } catch {
      // Candidate does not exist; continue checking conventional names.
    }
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
  const artifacts = files
    .filter((file) => file.type === "file")
    .map((file) => file.path)
    .filter((filePath) => /(\.md|\.json|\.ya?ml|\.sh|\.ps1|\.py|\.js|\.ts)$/i.test(filePath));

  const phases = [
    phase(localize("Activation", language), localize("Match user intent against trigger phrases and skill scope.", language), triggers.length, "signal"),
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
    .split(/[,;|]|"([^"]+)"/)
    .map((part) => part && part.trim().replace(/^["'`]|["'`]$/g, ""))
    .filter(Boolean)
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
    "playwright"
  ];

  const normalized = text.toLowerCase();
  return toolPatterns
    .filter((tool) => normalized.includes(tool.toLowerCase()))
    .map((tool) => ({
      name: tool,
      role: inferToolRole(tool)
    }));
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
    clauses.push(language === "zh" ? `发现 ${triggers.length} 个触发短语` : `${triggers.length} activation phrases found`);
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

async function getGitHubAuthStatus() {
  try {
    const { stdout } = await execFileAsync("gh", ["auth", "status", "--json", "hosts"], { timeout: 6000 });
    const parsed = JSON.parse(stdout);
    const hosts = Object.values(parsed.hosts || {}).flat();
    const active = hosts.find((host) => host.active) || hosts.find((host) => host.state === "success");
    const scopes = typeof active?.scopes === "string" ? active.scopes.split(/,\s*/) : active?.scopes || [];
    return {
      authenticated: Boolean(active),
      login: active?.login || "",
      scopes,
      needsCopilotScope: Boolean(active) && !scopes.includes("copilot")
    };
  } catch (error) {
    return {
      authenticated: false,
      login: "",
      scopes: [],
      error: error.message
    };
  }
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

const translations = {
  zh: {
    "No description file detected.": "未检测到描述文件。",
    "Activation": "触发识别",
    "Match user intent against trigger phrases and skill scope.": "将用户意图匹配到触发短语和 Skill 适用范围。",
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

app.listen(port, () => {
  console.log(`Skill Logic Visualizer running at http://localhost:${port}`);
  console.log(`Default skill root: ${defaultSkillRoot}`);
});
