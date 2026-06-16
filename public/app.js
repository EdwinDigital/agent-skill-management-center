const pageSize = 15;
const storageKeys = {
  language: "skill-viz-language",
  model: "skill-viz-model",
  roots: "skill-viz-roots"
};

const state = {
  root: "",
  roots: [],
  skills: [],
  selectedName: "",
  selectedSkill: null,
  directoryHandle: null,
  directorySkills: [],
  page: 1,
  language: localStorage.getItem(storageKeys.language) || "en",
  model: localStorage.getItem(storageKeys.model) || "github-default",
  models: []
};

const elements = {
  rootSelect: document.querySelector("#skillRootSelect"),
  rootInput: document.querySelector("#skillRoot"),
  loadPath: document.querySelector("#loadPath"),
  addPath: document.querySelector("#addPath"),
  pickDirectory: document.querySelector("#pickDirectory"),
  githubLogin: document.querySelector("#githubLogin"),
  openSettings: document.querySelector("#openSettings"),
  closeSettings: document.querySelector("#closeSettings"),
  settingsPanel: document.querySelector("#settingsPanel"),
  languageSelect: document.querySelector("#languageSelect"),
  modelSelect: document.querySelector("#modelSelect"),
  checkGithub: document.querySelector("#checkGithub"),
  githubStatus: document.querySelector("#githubStatus"),
  pathHint: document.querySelector("#pathHint"),
  skillCount: document.querySelector("#skillCount"),
  skillList: document.querySelector("#skillList"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageStatus: document.querySelector("#pageStatus"),
  emptyState: document.querySelector("#emptyState"),
  detail: document.querySelector("#detail"),
  skillPath: document.querySelector("#skillPath"),
  skillName: document.querySelector("#skillName"),
  skillSummary: document.querySelector("#skillSummary"),
  complexityScore: document.querySelector("#complexityScore"),
  logicMap: document.querySelector("#logicMap"),
  toolStack: document.querySelector("#toolStack"),
  triggerList: document.querySelector("#triggerList"),
  fileStats: document.querySelector("#fileStats"),
  fileTree: document.querySelector("#fileTree"),
  modelInsightTitle: document.querySelector("#modelInsightTitle"),
  modelInsightMeta: document.querySelector("#modelInsightMeta"),
  modelInsight: document.querySelector("#modelInsight"),
  descriptionTitle: document.querySelector("#descriptionTitle"),
  descriptionText: document.querySelector("#descriptionText"),
  toast: document.querySelector("#toast")
};

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

const copy = {
  en: {
    appEyebrow: "Skill OS",
    appTitle: "Logic Visualizer",
    signIn: "Sign in with GitHub",
    settings: "Settings",
    skillDirectory: "Skill directory",
    load: "Load",
    add: "Add",
    addCustomPath: "Add custom path...",
    chooseDirectory: "Choose local skills directory",
    defaultPath: "Default path is read by the local Node server.",
    skills: "Skills",
    previous: "Previous",
    next: "Next",
    heroEyebrow: "Execution cartography for agent skills",
    heroTitle: "Turn a skill folder into a live logic map.",
    heroBody: "Inspect activation phrases, supporting files, tool surfaces, and inferred execution phases in one startup-grade command deck.",
    emptyEyebrow: "No skill selected",
    emptyTitle: "Select a skill from the sidebar.",
    emptyBody: "The app will read its description file, scan the directory, and render an execution logic view.",
    complexity: "Complexity",
    logicMap: "Logic map",
    logicMapMeta: "Inferred execution flow",
    toolStack: "Tool stack",
    toolStackMeta: "Detected from docs and file names",
    activationPhrases: "Activation phrases",
    activationMeta: "Signals that route to this skill",
    directoryTelemetry: "Directory telemetry",
    description: "Description",
    rawSource: "Raw source",
    modelInsight: "Model insight",
    modelMeta: "GitHub Copilot SDK",
    modelIdle: "Select a skill to request model-driven analysis.",
    settingsTitle: "Settings",
    displayLanguage: "Display language",
    defaultModel: "Default model",
    githubUnknown: "GitHub status unknown",
    checkStatus: "Check status",
    loadedServer: "Loaded through the local Node server.",
    loadedBrowser: "Loaded through browser directory access.",
    readingRoot: "Reading skill root...",
    buildingMap: "Building logic map...",
    noSkills: "No skill directories found.",
    noTools: "No explicit tools detected.",
    noTriggers: "No activation phrases found in the description.",
    noFiles: "No files found.",
    noDescription: "No description file found.",
    requestingInsight: "Requesting Copilot SDK analysis...",
    browserUnsupported: "This browser does not support directory picking. Use the path input with the local server instead.",
    runCommand: "Run in terminal:",
    signedIn: "Signed in",
    notSignedIn: "Not signed in",
    files: "files",
    folders: "folders"
  },
  zh: {
    appEyebrow: "Skill OS",
    appTitle: "逻辑可视化",
    signIn: "登录 GitHub",
    settings: "设置",
    skillDirectory: "Skill 目录",
    load: "加载",
    add: "添加",
    addCustomPath: "添加自定义路径...",
    chooseDirectory: "选择本地 Skills 目录",
    defaultPath: "默认路径由本地 Node 服务读取。",
    skills: "Skills",
    previous: "上一页",
    next: "下一页",
    heroEyebrow: "Agent Skills 执行地图",
    heroTitle: "把 Skill 目录变成实时逻辑图。",
    heroBody: "在一个硅谷 startup 风格的控制台里查看触发短语、支撑文件、工具面和推断执行阶段。",
    emptyEyebrow: "尚未选择 Skill",
    emptyTitle: "从侧边栏选择一个 Skill。",
    emptyBody: "应用会读取描述文件、扫描目录，并渲染执行逻辑视图。",
    complexity: "复杂度",
    logicMap: "逻辑图",
    logicMapMeta: "推断执行流程",
    toolStack: "工具栈",
    toolStackMeta: "从文档和文件名检测",
    activationPhrases: "触发短语",
    activationMeta: "路由到该 Skill 的信号",
    directoryTelemetry: "目录遥测",
    description: "描述",
    rawSource: "原始内容",
    modelInsight: "模型洞察",
    modelMeta: "GitHub Copilot SDK",
    modelIdle: "选择一个 Skill 后请求模型驱动分析。",
    settingsTitle: "设置",
    displayLanguage: "显示语言",
    defaultModel: "默认模型",
    githubUnknown: "GitHub 状态未知",
    checkStatus: "检查状态",
    loadedServer: "已通过本地 Node 服务加载。",
    loadedBrowser: "已通过浏览器目录访问加载。",
    readingRoot: "正在读取 Skill 根目录...",
    buildingMap: "正在生成逻辑图...",
    noSkills: "未找到 Skill 目录。",
    noTools: "未检测到明确工具。",
    noTriggers: "描述中未找到触发短语。",
    noFiles: "未找到文件。",
    noDescription: "未找到描述文件。",
    requestingInsight: "正在请求 Copilot SDK 分析...",
    browserUnsupported: "当前浏览器不支持目录选择。请使用本地服务的路径输入。",
    runCommand: "在终端运行：",
    signedIn: "已登录",
    notSignedIn: "未登录",
    files: "个文件",
    folders: "个文件夹"
  }
};

init();

async function init() {
  bindEvents();
  applyLanguage();
  try {
    const config = await fetchJson("/api/config");
    initializeRoots(config.defaultSkillRoot);
    state.model = localStorage.getItem(storageKeys.model) || config.defaultModel || "github-default";
    renderRoots();
    await Promise.all([loadModels(), refreshGitHubStatus()]);
    await loadSkillsFromServer(state.root);
  } catch (error) {
    showToast(error.message, true);
  }
}

function bindEvents() {
  elements.loadPath.addEventListener("click", () => {
    const selected = state.roots.find((root) => root.id === elements.rootSelect.value);
    if (selected?.type === "browser") {
      loadBrowserRoot();
    } else {
      state.directoryHandle = null;
      loadSkillsFromServer(selected?.value || state.root);
    }
  });

  elements.rootSelect.addEventListener("change", () => elements.loadPath.click());
  elements.addPath.addEventListener("click", addCustomRoot);
  elements.rootInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addCustomRoot();
    }
  });

  elements.pickDirectory.addEventListener("click", pickLocalDirectory);
  elements.prevPage.addEventListener("click", () => changePage(-1));
  elements.nextPage.addEventListener("click", () => changePage(1));
  elements.openSettings.addEventListener("click", openSettings);
  elements.closeSettings.addEventListener("click", closeSettings);
  elements.settingsPanel.addEventListener("click", (event) => {
    if (event.target === elements.settingsPanel) {
      closeSettings();
    }
  });

  elements.languageSelect.addEventListener("change", async () => {
    state.language = elements.languageSelect.value;
    localStorage.setItem(storageKeys.language, state.language);
    applyLanguage();
    await reloadCurrentRoot();
  });

  elements.modelSelect.addEventListener("change", () => {
    state.model = elements.modelSelect.value;
    localStorage.setItem(storageKeys.model, state.model);
    if (state.selectedSkill) {
      requestModelInsight(state.selectedSkill);
    }
  });

  elements.githubLogin.addEventListener("click", startGitHubLogin);
  elements.checkGithub.addEventListener("click", refreshGitHubStatus);
}

function initializeRoots(defaultRoot) {
  const saved = readSavedRoots();
  state.root = saved[0]?.value || defaultRoot;
  state.roots = dedupeRoots([{ type: "server", label: "Default skills", value: defaultRoot }, ...saved]);
}

function readSavedRoots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKeys.roots) || "[]");
    return Array.isArray(parsed) ? parsed.filter((root) => root?.type === "server" && root.value) : [];
  } catch {
    return [];
  }
}

function saveServerRoots() {
  const roots = state.roots.filter((root) => root.type === "server" && root.label !== "Default skills");
  localStorage.setItem(storageKeys.roots, JSON.stringify(roots.map(({ type, label, value }) => ({ type, label, value }))));
}

function dedupeRoots(roots) {
  const seen = new Set();
  return roots
    .filter((root) => {
      const key = `${root.type}:${root.value}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((root, index) => ({ ...root, id: `${root.type}-${index}-${root.value}` }));
}

function renderRoots() {
  elements.rootSelect.innerHTML = "";
  for (const root of state.roots) {
    const option = document.createElement("option");
    option.value = root.id;
    option.textContent = `${root.label}: ${root.value}`;
    option.selected = root.value === state.root;
    elements.rootSelect.append(option);
  }
}

function addCustomRoot() {
  const value = elements.rootInput.value.trim();
  if (!value) {
    return;
  }
  state.roots = dedupeRoots([...state.roots, { type: "server", label: "Custom", value }]);
  state.root = value;
  elements.rootInput.value = "";
  saveServerRoots();
  renderRoots();
  loadSkillsFromServer(value);
}

async function reloadCurrentRoot() {
  const previousSelection = state.selectedName;
  if (state.directoryHandle) {
    await loadBrowserRoot();
  } else {
    await loadSkillsFromServer(state.root);
  }
  if (previousSelection && state.skills.some((skill) => skill.name === previousSelection)) {
    await selectSkill(previousSelection);
  }
}

async function loadSkillsFromServer(root) {
  setLoading(t("readingRoot"));
  const result = await fetchJson(`/api/skills?root=${encodeURIComponent(root || "")}&language=${state.language}`);
  state.root = result.root;
  state.skills = result.skills;
  state.selectedName = "";
  state.selectedSkill = null;
  state.page = 1;
  elements.pathHint.textContent = t("loadedServer");
  renderSkillList();
  showEmpty();
  showToast(`${t("load")} ${result.skills.length} ${t("skills")}.`);
}

async function pickLocalDirectory() {
  if (!("showDirectoryPicker" in window)) {
    showToast(t("browserUnsupported"), true);
    return;
  }

  const handle = await window.showDirectoryPicker();
  state.directoryHandle = handle;
  state.root = handle.name;
  state.roots = dedupeRoots([...state.roots.filter((root) => root.type !== "browser"), { type: "browser", label: "Browser", value: handle.name }]);
  renderRoots();
  await loadBrowserRoot();
}

async function loadBrowserRoot() {
  if (!state.directoryHandle) {
    return;
  }

  elements.pathHint.textContent = t("loadedBrowser");
  const skills = [];
  for await (const entry of state.directoryHandle.values()) {
    if (entry.kind === "directory") {
      const skill = await summarizeBrowserSkill(entry);
      skills.push(skill);
    }
  }

  state.directorySkills = skills.sort((a, b) => a.name.localeCompare(b.name));
  state.skills = state.directorySkills;
  state.selectedName = "";
  state.selectedSkill = null;
  state.page = 1;
  renderSkillList();
  showEmpty();
  showToast(`${t("load")} ${state.skills.length} ${t("skills")}.`);
}

async function summarizeBrowserSkill(handle) {
  const descriptionFile = await findBrowserDescription(handle);
  const description = descriptionFile ? await readBrowserFile(descriptionFile.handle) : "";
  return {
    name: handle.name,
    path: handle.name,
    summary: extractSummary(description) || t("noDescription"),
    hasDescription: Boolean(descriptionFile),
    descriptionFile: descriptionFile?.name || null,
    handle
  };
}

async function selectSkill(skillName) {
  state.selectedName = skillName;
  renderSkillList();
  setLoading(t("buildingMap"));

  try {
    const skill = state.directoryHandle ? await readBrowserSkill(skillName) : await readServerSkill(skillName);
    state.selectedSkill = skill;
    renderSkillDetail(skill);
    requestModelInsight(skill);
  } catch (error) {
    showToast(error.message, true);
  }
}

async function readServerSkill(skillName) {
  const result = await fetchJson(
    `/api/skills/${encodeURIComponent(skillName)}?root=${encodeURIComponent(state.root)}&language=${state.language}`
  );
  return result.skill;
}

async function readBrowserSkill(skillName) {
  const listed = state.directorySkills.find((skill) => skill.name === skillName);
  if (!listed) {
    throw new Error("Selected skill was not found in the browser directory.");
  }

  const descriptionFile = await findBrowserDescription(listed.handle);
  const description = descriptionFile ? await readBrowserFile(descriptionFile.handle) : "";
  const files = await walkBrowserFiles(listed.handle);

  return {
    name: listed.name,
    path: listed.path,
    descriptionFile: descriptionFile?.name || null,
    description,
    files,
    analysis: analyzeSkill({ name: listed.name, description, files })
  };
}

async function requestModelInsight(skill) {
  elements.modelInsight.textContent = t("requestingInsight");
  elements.modelInsightMeta.textContent = `${t("modelMeta")} · ${state.model}`;

  try {
    const result = await fetchJson("/api/analyze-skill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: state.model,
        language: state.language,
        skill: {
          name: skill.name,
          description: skill.description,
          files: skill.files
        }
      })
    });
    elements.modelInsightMeta.textContent = `${result.source} · ${result.model || state.model}`;
    elements.modelInsight.textContent = result.content;
  } catch (error) {
    elements.modelInsightMeta.textContent = "rules fallback";
    elements.modelInsight.textContent = error.message;
  }
}

async function findBrowserDescription(handle) {
  for (const name of descriptionCandidates) {
    try {
      const fileHandle = await handle.getFileHandle(name);
      return { name, handle: fileHandle };
    } catch {
      // Candidate does not exist; continue checking conventional names.
    }
  }
  return null;
}

async function readBrowserFile(fileHandle) {
  const file = await fileHandle.getFile();
  if (file.size > 220_000) {
    return `[File omitted: ${file.name} is larger than 220000 bytes.]`;
  }
  return file.text();
}

async function walkBrowserFiles(handle, prefix = "", depth = 0) {
  if (depth > 4) {
    return [];
  }

  const rows = [];
  for await (const entry of handle.values()) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "directory") {
      rows.push({ name: entry.name, path: relativePath, type: "directory" });
      rows.push(...(await walkBrowserFiles(entry, relativePath, depth + 1)));
    } else {
      const file = await entry.getFile();
      rows.push({ name: entry.name, path: relativePath, type: "file", size: file.size });
    }
  }

  return rows.sort((a, b) => Number(b.type === "directory") - Number(a.type === "directory") || a.path.localeCompare(b.path));
}

function renderSkillList() {
  const skills = state.skills;
  const totalPages = Math.max(1, Math.ceil(skills.length / pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * pageSize;
  const visibleSkills = skills.slice(start, start + pageSize);

  elements.skillCount.textContent = String(skills.length);
  elements.skillList.innerHTML = "";
  elements.pageStatus.textContent = `${state.page} / ${totalPages}`;
  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= totalPages;

  if (!skills.length) {
    elements.skillList.innerHTML = `<div class="hint">${t("noSkills")}</div>`;
    return;
  }

  for (const skill of visibleSkills) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `skill-item${skill.name === state.selectedName ? " active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(skill.name === state.selectedName));
    button.innerHTML = `<strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(skill.summary)}</span>`;
    button.addEventListener("click", () => selectSkill(skill.name));
    elements.skillList.append(button);
  }
}

function changePage(delta) {
  const totalPages = Math.max(1, Math.ceil(state.skills.length / pageSize));
  state.page = Math.min(totalPages, Math.max(1, state.page + delta));
  renderSkillList();
}

function renderSkillDetail(skill) {
  const analysis = skill.analysis;
  elements.pathHint.textContent = state.directoryHandle ? t("loadedBrowser") : t("loadedServer");
  elements.emptyState.classList.add("hidden");
  elements.detail.classList.remove("hidden");
  elements.skillPath.textContent = skill.path;
  elements.skillName.textContent = skill.name;
  elements.skillSummary.textContent = analysis.summary;
  elements.descriptionTitle.textContent = skill.descriptionFile ? `${t("description")} · ${skill.descriptionFile}` : t("description");
  elements.descriptionText.textContent = skill.description || t("noDescription");
  elements.complexityScore.textContent = String(calculateComplexity(analysis));
  elements.fileStats.textContent = `${analysis.fileStats.files} ${t("files")} · ${analysis.fileStats.directories} ${t("folders")}`;

  renderLogicMap(analysis.phases);
  renderTools(analysis.tools);
  renderTriggers(analysis.triggers);
  renderFiles(skill.files);
}

function renderLogicMap(phases) {
  elements.logicMap.innerHTML = "";
  const icons = { signal: "IN", folder: "FS", model: "AI", tool: "TL", ship: "OK" };

  for (const phase of phases) {
    const node = document.createElement("div");
    node.className = "logic-node";
    node.innerHTML = `
      <div class="node-icon">${icons[phase.kind] || "•"}</div>
      <div>
        <h4>${escapeHtml(phase.title)}</h4>
        <p>${escapeHtml(phase.detail)}</p>
      </div>
      <div class="node-weight">×${phase.weight}</div>
    `;
    elements.logicMap.append(node);
  }
}

function renderTools(tools) {
  elements.toolStack.innerHTML = "";
  if (!tools.length) {
    elements.toolStack.innerHTML = `<span class="hint">${t("noTools")}</span>`;
    return;
  }

  for (const tool of tools) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `<strong>${escapeHtml(tool.name)}</strong> · ${escapeHtml(localizeToolRole(tool))}`;
    elements.toolStack.append(chip);
  }
}

function renderTriggers(triggers) {
  elements.triggerList.innerHTML = "";
  if (!triggers.length) {
    elements.triggerList.innerHTML = `<span class="hint">${t("noTriggers")}</span>`;
    return;
  }

  for (const trigger of triggers) {
    const phrase = document.createElement("span");
    phrase.className = "phrase";
    phrase.textContent = trigger;
    elements.triggerList.append(phrase);
  }
}

function renderFiles(files) {
  elements.fileTree.innerHTML = "";
  if (!files.length) {
    elements.fileTree.innerHTML = `<span class="hint">${t("noFiles")}</span>`;
    return;
  }

  for (const file of files.slice(0, 140)) {
    const row = document.createElement("div");
    const depth = file.path.split("/").length - 1;
    row.className = `file-row ${file.type}`;
    row.style.paddingLeft = `${depth * 14}px`;
    row.innerHTML = `<span>${file.type === "directory" ? "▸" : "·"}</span><span>${escapeHtml(file.path)}</span>`;
    elements.fileTree.append(row);
  }
}

async function loadModels() {
  const result = await fetchJson("/api/models");
  state.models = result.models || [];
  renderModelSelect();
  if (result.source === "fallback" && result.error) {
    showToast(result.error, true);
  }
}

function renderModelSelect() {
  elements.modelSelect.innerHTML = "";
  for (const model of state.models) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name || model.id;
    option.selected = model.id === state.model;
    elements.modelSelect.append(option);
  }
  if (!state.models.some((model) => model.id === state.model)) {
    state.model = state.models[0]?.id || "github-default";
    localStorage.setItem(storageKeys.model, state.model);
  }
}

async function refreshGitHubStatus() {
  const status = await fetchJson("/api/auth/github/status");
  elements.githubStatus.textContent = status.authenticated
    ? `${t("signedIn")}: ${status.login || "GitHub"}${status.needsCopilotScope ? " · copilot scope needed" : ""}`
    : t("notSignedIn");
  elements.githubLogin.textContent = status.authenticated && status.needsCopilotScope
    ? "Refresh Copilot scope"
    : status.authenticated
      ? `${t("signedIn")}: ${status.login || "GitHub"}`
      : t("signIn");
  return status;
}

async function startGitHubLogin() {
  const status = await refreshGitHubStatus();
  if (status.authenticated && !status.needsCopilotScope) {
    showToast(`${t("signedIn")}: ${status.login || "GitHub"}`);
    return;
  }
  const result = await fetchJson("/api/auth/github/login", { method: "POST" });
  showToast(`${result.message} ${result.command}`, true);
  elements.githubStatus.textContent = `${t("runCommand")} ${result.command}`;
}

function openSettings() {
  elements.settingsPanel.classList.remove("hidden");
  elements.languageSelect.focus();
}

function closeSettings() {
  elements.settingsPanel.classList.add("hidden");
}

function showEmpty() {
  elements.emptyState.classList.remove("hidden");
  elements.detail.classList.add("hidden");
  elements.modelInsight.textContent = t("modelIdle");
}

function setLoading(message) {
  elements.pathHint.textContent = message;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.content || payload.error || "Request failed.");
  }
  return payload;
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.style.borderColor = isError ? "rgba(255, 95, 122, 0.6)" : "rgba(40, 216, 255, 0.32)";
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("show"), 3600);
}

function applyLanguage() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  elements.languageSelect.value = state.language;
  const selectors = {
    ".brand .eyebrow": "appEyebrow",
    ".brand h1": "appTitle",
    "#githubLogin": "signIn",
    "#openSettings": "settings",
    ".path-card label": "skillDirectory",
    "#loadPath": "load",
    "#addPath": "add",
    "#pickDirectory": "chooseDirectory",
    ".list-header span": "skills",
    "#prevPage": "previous",
    "#nextPage": "next",
    ".hero .eyebrow": "heroEyebrow",
    ".hero h2": "heroTitle",
    ".hero p:not(.eyebrow)": "heroBody",
    "#emptyState .eyebrow": "emptyEyebrow",
    "#emptyState h3": "emptyTitle",
    "#emptyState p:not(.eyebrow)": "emptyBody",
    ".score-card span": "complexity",
    ".map-card .card-title span": "logicMap",
    ".map-card .card-title small": "logicMapMeta",
    ".tool-card .card-title span": "toolStack",
    ".tool-card .card-title small": "toolStackMeta",
    ".trigger-card .card-title span": "activationPhrases",
    ".trigger-card .card-title small": "activationMeta",
    ".file-card .card-title span": "directoryTelemetry",
    "#modelInsightTitle": "modelInsight",
    "#modelInsightMeta": "modelMeta",
    "#descriptionTitle": "description",
    ".description-card .card-title small": "rawSource",
    "#settingsTitle": "settingsTitle",
    ".field:nth-of-type(1) span": "displayLanguage",
    ".field:nth-of-type(2) span": "defaultModel",
    "#checkGithub": "checkStatus"
  };

  for (const [selector, key] of Object.entries(selectors)) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = t(key);
    }
  }

  elements.rootInput.placeholder = t("addCustomPath");
  elements.pathHint.textContent = state.root ? elements.pathHint.textContent : t("defaultPath");
  if (!state.selectedSkill) {
    elements.modelInsight.textContent = t("modelIdle");
  }
}

function t(key) {
  return copy[state.language]?.[key] || copy.en[key] || key;
}

function localizeToolRole(tool) {
  if (state.language !== "zh") {
    return tool.role;
  }
  return {
    "command runner": "命令执行",
    "file reader": "文件读取",
    "code search": "代码搜索",
    "file discovery": "文件发现",
    "code editing": "代码编辑",
    "web retrieval": "网页读取",
    "clarification": "澄清交互",
    "delegation": "任务委派",
    "state tracking": "状态追踪",
    "cloud operations": "云操作",
    "cluster operations": "集群操作",
    "container workflow": "容器流程",
    "infrastructure": "基础设施",
    "Azure deployment": "Azure 部署",
    "JavaScript workflow": "JavaScript 流程",
    "Python packages": "Python 包",
    "script execution": "脚本执行",
    "runtime": "运行时",
    "source control": "源码管理",
    "browser automation": "浏览器自动化"
  }[tool.role] || tool.role;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function analyzeSkill({ name, description, files }) {
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

  return {
    summary: buildSkillSummary(description, tools, triggers, files),
    triggers: triggers.slice(0, 12),
    tools,
    artifacts: artifacts.slice(0, 18),
    phases: [
      phase(state.language === "zh" ? "触发识别" : "Activation", state.language === "zh" ? "将用户意图匹配到触发短语和 Skill 适用范围。" : "Match user intent against trigger phrases and skill scope.", triggers.length, "signal"),
      phase(state.language === "zh" ? "上下文读取" : "Context intake", state.language === "zh" ? "读取描述文件和 Skill 目录中的支撑资产。" : "Read the description file and supporting assets in the skill directory.", files.length, "folder"),
      phase(state.language === "zh" ? "推理编排" : "Reasoning pass", buildReasoningSummary(lower), countReasoningSignals(lower), "model"),
      phase(state.language === "zh" ? "工具编排" : "Tool choreography", tools.length ? (state.language === "zh" ? `协调 ${tools.length} 个检测到的工具面。` : `Coordinate ${tools.length} detected tool surface${tools.length === 1 ? "" : "s"}.`) : t("noTools"), tools.length, "tool"),
      phase(state.language === "zh" ? "结果交付" : "Output handoff", buildOutputSummary(lower), artifacts.length, "ship")
    ],
    fileStats: {
      total: files.length,
      directories: files.filter((file) => file.type === "directory").length,
      files: files.filter((file) => file.type === "file").length
    }
  };
}

function phase(title, detail, weight, kind) {
  return { title, detail, weight: Math.max(1, Math.min(9, weight || 1)), kind };
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
    .map((tool) => ({ name: tool, role: inferToolRole(tool) }));
}

function inferToolRole(tool) {
  return {
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
  }[tool] || "tool";
}

function countReasoningSignals(lower) {
  return ["plan", "validate", "troubleshoot", "deploy", "analyze", "generate", "migrate", "configure"].reduce(
    (total, signal) => total + (lower.includes(signal) ? 1 : 0),
    0
  );
}

function buildReasoningSummary(lower) {
  if (lower.includes("troubleshoot") || lower.includes("diagnostic")) {
    return state.language === "zh"
      ? "诊断状态、隔离故障模式，然后推荐受控修复路径。"
      : "Diagnose state, isolate failure modes, then recommend a constrained remediation path.";
  }
  if (lower.includes("deploy") || lower.includes("provision")) {
    return state.language === "zh"
      ? "规划资源、准备配置，然后编排部署和验证步骤。"
      : "Plan resources, prepare configuration, then sequence deployment and validation steps.";
  }
  if (lower.includes("migrate")) {
    return state.language === "zh"
      ? "将源工作负载语义映射到目标平台，并标记转换缺口。"
      : "Map source workload semantics to the target platform and flag conversion gaps.";
  }
  return state.language === "zh"
    ? "将 Skill 指令转换为带护栏的有序执行路径。"
    : "Transform skill instructions into an ordered execution path with guardrails.";
}

function buildOutputSummary(lower) {
  if (lower.includes("report")) {
    return state.language === "zh"
      ? "输出包含发现、证据和后续动作的报告式结果。"
      : "Produce a report-style result with findings, evidence, and next actions.";
  }
  if (lower.includes("code") || lower.includes("generate")) {
    return state.language === "zh"
      ? "返回生成资产或代码变更，并附带验证建议。"
      : "Return generated assets or code changes with validation guidance.";
  }
  if (lower.includes("deploy")) {
    return state.language === "zh"
      ? "交付已部署或可部署的工作负载。"
      : "Leave the user with a deployed or deployment-ready workload.";
  }
  return state.language === "zh" ? "返回简洁、面向行动的交付说明。" : "Return a concise, action-oriented handoff.";
}

function buildSkillSummary(description, tools, triggers, files) {
  const summary = extractSummary(description);
  const clauses = [];
  if (summary) {
    clauses.push(summary);
  }
  clauses.push(state.language === "zh" ? `已扫描 ${files.length} 个目录项` : `${files.length} directory entries scanned`);
  clauses.push(state.language === "zh" ? `检测到 ${tools.length} 个工具面` : `${tools.length} tool surfaces detected`);
  if (triggers.length) {
    clauses.push(state.language === "zh" ? `发现 ${triggers.length} 个触发短语` : `${triggers.length} activation phrases found`);
  }
  return clauses.join(" · ");
}

function calculateComplexity(analysis) {
  return Math.min(99, analysis.fileStats.files * 2 + analysis.tools.length * 7 + analysis.triggers.length * 3);
}
