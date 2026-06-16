const pageSize = 10;
const storageKeys = {
  language: "skill-viz-language",
  model: "skill-viz-model",
  roots: "skill-viz-roots",
  theme: "skill-viz-theme"
};
const handleDbName = "skill-logic-visualizer";
const handleStoreName = "directory-handles";

const state = {
  root: "",
  roots: [],
  skills: [],
  selectedName: "",
  selectedSkill: null,
  directoryHandle: null,
  directoryHandles: new Map(),
  directorySkills: [],
  skillSearch: "",
  page: 1,
  language: localStorage.getItem(storageKeys.language) || "en",
  theme: localStorage.getItem(storageKeys.theme) || "light",
  model: localStorage.getItem(storageKeys.model) || "github-default",
  models: [],
  githubAuth: null,
  logicMapRequestId: 0,
  pendingDirectory: null
};

const elements = {
  rootSelect: document.querySelector("#skillRootSelect"),
  deletePath: document.querySelector("#deletePath"),
  pickDirectory: document.querySelector("#pickDirectory"),
  scanDirectories: document.querySelector("#scanDirectories"),
  githubLogin: document.querySelector("#githubLogin"),
  themeToggle: document.querySelector("#themeToggle"),
  openSettings: document.querySelector("#openSettings"),
  closeSettings: document.querySelector("#closeSettings"),
  settingsPanel: document.querySelector("#settingsPanel"),
  languageSelect: document.querySelector("#languageSelect"),
  modelSelect: document.querySelector("#modelSelect"),
  checkGithub: document.querySelector("#checkGithub"),
  githubStatus: document.querySelector("#githubStatus"),
  pathHint: document.querySelector("#pathHint"),
  skillCount: document.querySelector("#skillCount"),
  skillSearch: document.querySelector("#skillSearch"),
  skillList: document.querySelector("#skillList"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  pageStatus: document.querySelector("#pageStatus"),
  introHero: document.querySelector("#introHero"),
  emptyState: document.querySelector("#emptyState"),
  detail: document.querySelector("#detail"),
  skillPath: document.querySelector("#skillPath"),
  skillName: document.querySelector("#skillName"),
  skillSummary: document.querySelector("#skillSummary"),
  evaluationStatus: document.querySelector("#evaluationStatus"),
  complexityScore: document.querySelector("#complexityScore"),
  complexityMeta: document.querySelector("#complexityMeta"),
  roiScore: document.querySelector("#roiScore"),
  roiMeta: document.querySelector("#roiMeta"),
  logicMap: document.querySelector("#logicMap"),
  logicMapTitle: document.querySelector("#logicMapTitle"),
  logicMapMeta: document.querySelector("#logicMapMeta"),
  refreshLogicMap: document.querySelector("#refreshLogicMap"),
  flowScene: document.querySelector("#flowScene"),
  flowEdges: document.querySelector("#flowEdges"),
  flowNodes: document.querySelector("#flowNodes"),
  flowStats: document.querySelector("#flowStats"),
  nodeDetailTitle: document.querySelector("#nodeDetailTitle"),
  nodeDetailType: document.querySelector("#nodeDetailType"),
  nodeDetailBody: document.querySelector("#nodeDetailBody"),
  nodeEvidence: document.querySelector("#nodeEvidence"),
  toolStack: document.querySelector("#toolStack"),
  triggerList: document.querySelector("#triggerList"),
  methodTitle: document.querySelector("#methodTitle"),
  methodMeta: document.querySelector("#methodMeta"),
  methodList: document.querySelector("#methodList"),
  fileStats: document.querySelector("#fileStats"),
  fileTree: document.querySelector("#fileTree"),
  modelInsightTitle: document.querySelector("#modelInsightTitle"),
  modelInsightMeta: document.querySelector("#modelInsightMeta"),
  modelInsight: document.querySelector("#modelInsight"),
  descriptionTitle: document.querySelector("#descriptionTitle"),
  descriptionText: document.querySelector("#descriptionText"),
  directoryConfirmPanel: document.querySelector("#directoryConfirmPanel"),
  directoryConfirmEyebrow: document.querySelector("#directoryConfirmEyebrow"),
  directoryConfirmTitle: document.querySelector("#directoryConfirmTitle"),
  closeDirectoryConfirm: document.querySelector("#closeDirectoryConfirm"),
  directoryConfirmPath: document.querySelector("#directoryConfirmPath"),
  directoryConfirmCount: document.querySelector("#directoryConfirmCount"),
  directoryNameLabel: document.querySelector("#directoryNameLabel"),
  directoryNameInput: document.querySelector("#directoryNameInput"),
  cancelDirectoryConfirm: document.querySelector("#cancelDirectoryConfirm"),
  saveDirectoryConfirm: document.querySelector("#saveDirectoryConfirm"),
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
    language: "Language",
    lightTheme: "Light theme",
    darkTheme: "Dark theme",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    signIn: "Sign in with GitHub",
    settings: "Settings",
    skillDirectory: "Skill directory",
    load: "Loaded",
    deleteDirectory: "Delete",
    chooseDirectory: "Choose local skills directory",
    scanDirectories: "Scan",
    openingDirectoryPicker: "Opening directory picker...",
    directoryConfirmEyebrow: "Local Skill root",
    directoryConfirmTitle: "Add directory",
    directoryNameLabel: "Directory display name",
    cancel: "Cancel",
    saveDirectory: "Save directory",
    directorySaved: "Directory saved",
    defaultPath: "Default path is read by the local Node server.",
    skills: "Skills",
    searchByName: "Search by name",
    previous: "Previous",
    next: "Next",
    heroEyebrow: "Execution cartography for agent skills",
    heroTitle: "Map the skill like an agent flow.",
    heroBody: "Read a Skill folder as an execution system: triggers, tools, files, run methods, model insight, and the decisions that connect them.",
    emptyEyebrow: "No skill selected",
    emptyTitle: "Select a skill from the sidebar to begin.",
    emptyBody: "Use this app to audit how a Skill activates, what tools it relies on, which files support it, and how its execution path flows from intent to output.",
    guideDirectory: "1. Choose a Skill directory from the sidebar.",
    guideSkill: "2. Select a Skill name to read its files and description.",
    guideGraph: "3. Click graph nodes to inspect decisions, tools, evidence, and outputs.",
    complexity: "Complexity",
    roi: "ROI",
    ruleScore: "Rules score",
    modelScore: "Model score",
    roiNotEvaluated: "Not evaluated",
    manualTimePrefix: "Manual:",
    logicMap: "Logic map",
    logicMapMeta: "Horizontal execution panorama",
    rulesAnalysis: "Rules analysis",
    cachedModelAnalysis: "Cached model analysis",
    refreshLogicMap: "AI evaluation",
    generatingLogicMap: "Generating...",
    checkingCache: "Checking cache...",
    rulesEvaluationPrompt: "Current score is rules-based. Use AI evaluation for full assessment.",
    lastEvaluation: "Last evaluation",
    noCachedModelAnalysis: "Rules analysis is shown. Use AI evaluation to generate and cache a model-driven logic map.",
    modelAnalysisLoaded: "Loaded cached model logic map.",
    modelAnalysisSaved: "Generated and cached model logic map.",
    nodeDetail: "Node detail",
    selectNode: "Select a node",
    nodeDetailEmpty: "Click a graph node to inspect its role, evidence, and downstream execution path.",
    flowHint: "Drag horizontally or use trackpad scroll. Click a node for details.",
    nodes: "nodes",
    edges: "edges",
    toolStack: "Tool stack",
    toolStackMeta: "Detected execution surfaces",
    runMethods: "Run methods",
    runMethodsMeta: "Commands and procedural steps",
    activationPhrases: "Trigger prompts",
    activationMeta: "Prompts and typical scenarios that activate this skill",
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
    scanningDirectories: "Scanning default agent directories...",
    scanComplete: "Scan complete",
    noScannedDirectories: "No scanned Skill directories found. Click Scan to discover installed agent Skill paths.",
    readingRoot: "Reading skill root...",
    buildingMap: "Building logic map...",
    noSkills: "No skill directories found.",
    noMatchingSkills: "No skills match this name.",
    noTools: "No explicit tools detected.",
    noTriggers: "No trigger prompts or typical scenarios found in the description.",
    noFiles: "No files found.",
    noDescription: "No description file found.",
    requestingInsight: "Requesting Copilot SDK analysis...",
    browserUnsupported: "This browser does not support directory picking.",
    browserHandleMissing: "The directory record exists, but browser access needs to be granted again. Choose it once to remember access.",
    runCommand: "Run in terminal:",
    signedIn: "Signed in",
    notSignedIn: "Not signed in",
    files: "files",
    folders: "folders"
  },
  zh: {
    appEyebrow: "Skill OS",
    appTitle: "逻辑可视化",
    language: "语言",
    lightTheme: "浅色模式",
    darkTheme: "深色模式",
    switchToLight: "切换到浅色模式",
    switchToDark: "切换到深色模式",
    signIn: "登录 GitHub",
    settings: "设置",
    skillDirectory: "Skill 目录",
    load: "已加载",
    deleteDirectory: "删除",
    chooseDirectory: "选择本地 Skills 目录",
    scanDirectories: "扫描",
    openingDirectoryPicker: "正在打开目录选择器...",
    directoryConfirmEyebrow: "本地 Skill 根目录",
    directoryConfirmTitle: "添加目录",
    directoryNameLabel: "目录显示名称",
    cancel: "取消",
    saveDirectory: "保存目录",
    directorySaved: "目录已保存",
    defaultPath: "默认路径由本地 Node 服务读取。",
    skills: "Skills",
    searchByName: "按名称搜索",
    previous: "上一页",
    next: "下一页",
    heroEyebrow: "Agent Skills 执行地图",
    heroTitle: "像 Agent Flow 一样拆解 Skill。",
    heroBody: "把 Skill 目录作为执行系统读取：触发方式、工具、文件、运行方法、模型洞察，以及串联它们的判断路径。",
    emptyEyebrow: "尚未选择 Skill",
    emptyTitle: "从侧边栏选择一个 Skill 开始。",
    emptyBody: "使用这个应用审计 Skill 如何被触发、依赖哪些工具、由哪些文件支撑，以及它的执行路径如何从意图流向输出。",
    guideDirectory: "1. 从侧边栏选择 Skill 目录。",
    guideSkill: "2. 选择一个 Skill 名称，读取它的文件和描述。",
    guideGraph: "3. 点击图谱节点，查看判断、工具、证据和输出。",
    complexity: "复杂度",
    roi: "ROI",
    ruleScore: "规则评分",
    modelScore: "大模型评分",
    roiNotEvaluated: "未评估",
    manualTimePrefix: "人工：",
    logicMap: "逻辑图",
    logicMapMeta: "横向执行全景",
    rulesAnalysis: "规则分析",
    cachedModelAnalysis: "已缓存的大模型分析",
    refreshLogicMap: "AI评估",
    generatingLogicMap: "生成中...",
    checkingCache: "正在检查缓存...",
    rulesEvaluationPrompt: "当前为规则打分，请使用AI完整评估",
    lastEvaluation: "最后评估",
    noCachedModelAnalysis: "当前显示规则分析。点击 AI评估 可生成并缓存大模型逻辑图。",
    modelAnalysisLoaded: "已加载缓存的大模型逻辑图。",
    modelAnalysisSaved: "已生成并缓存大模型逻辑图。",
    nodeDetail: "节点详情",
    selectNode: "选择节点",
    nodeDetailEmpty: "点击图中的节点，查看它的角色、证据和下游执行路径。",
    flowHint: "横向拖动或使用触控板滚动。点击节点查看详情。",
    nodes: "个节点",
    edges: "条连线",
    toolStack: "工具栈",
    toolStackMeta: "检测到的执行面",
    runMethods: "运行方法",
    runMethodsMeta: "命令和流程步骤",
    activationPhrases: "触发 Prompt",
    activationMeta: "触发该 Skill 的用户提问和典型使用场景",
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
    scanningDirectories: "正在扫描默认 Agent 目录...",
    scanComplete: "扫描完成",
    noScannedDirectories: "未找到已扫描的 Skill 目录。点击扫描发现已安装的 Agent Skill 路径。",
    readingRoot: "正在读取 Skill 根目录...",
    buildingMap: "正在生成逻辑图...",
    noSkills: "未找到 Skill 目录。",
    noMatchingSkills: "没有匹配该名称的 Skill。",
    noTools: "未检测到明确工具。",
    noTriggers: "描述中未找到触发 Prompt 或典型使用场景。",
    noFiles: "未找到文件。",
    noDescription: "未找到描述文件。",
    requestingInsight: "正在请求 Copilot SDK 分析...",
    browserUnsupported: "当前浏览器不支持目录选择。",
    browserHandleMissing: "目录记录仍在，但浏览器访问权限需要重新授予。重新选择一次后会记住授权。",
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
  applyTheme();
  applyLanguage();
  try {
    const config = await fetchJson("/api/config");
    state.model = localStorage.getItem(storageKeys.model) || config.defaultModel || "github-default";
    await loadScannedRoots();
    await Promise.all([loadModels(), refreshGitHubStatus()]);
    if (state.root) {
      await loadSelectedRoot();
    } else {
      showEmpty();
      elements.pathHint.textContent = t("noScannedDirectories");
    }
  } catch (error) {
    showToast(error.message, true);
  }
}

function bindEvents() {
  elements.themeToggle.addEventListener("click", toggleTheme);

  elements.rootSelect.addEventListener("change", loadSelectedRoot);
  elements.deletePath.addEventListener("click", deleteSelectedRoot);

  elements.pickDirectory.addEventListener("click", pickLocalDirectory);
  elements.scanDirectories.addEventListener("click", scanDefaultDirectories);
  elements.closeDirectoryConfirm.addEventListener("click", closeDirectoryConfirm);
  elements.cancelDirectoryConfirm.addEventListener("click", closeDirectoryConfirm);
  elements.saveDirectoryConfirm.addEventListener("click", savePendingDirectory);
  elements.directoryConfirmPanel.addEventListener("click", (event) => {
    if (event.target === elements.directoryConfirmPanel) {
      closeDirectoryConfirm();
    }
  });
  elements.directoryNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      savePendingDirectory();
    }
  });
  elements.skillSearch.addEventListener("input", () => {
    state.skillSearch = elements.skillSearch.value.trim();
    state.page = 1;
    renderSkillList();
  });
  elements.prevPage.addEventListener("click", () => changePage(-1));
  elements.nextPage.addEventListener("click", () => changePage(1));
  elements.refreshLogicMap.addEventListener("click", refreshSelectedLogicMap);
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

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const isDark = state.theme === "dark";
  elements.themeToggle.setAttribute("aria-label", isDark ? t("switchToLight") : t("switchToDark"));
  elements.themeToggle.title = isDark ? t("switchToLight") : t("switchToDark");
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem(storageKeys.theme, state.theme);
  applyTheme();
}

async function loadScannedRoots(preferredRootId = "") {
  const result = await fetchJson("/api/skill-roots");
  applyScannedRoots(result.roots || [], preferredRootId);
}

function applyScannedRoots(roots, preferredRootId = "") {
  const previousRoot = state.root;
  state.roots = roots;
  const selected = roots.find((root) => root.id === preferredRootId)
    || roots.find((root) => root.value === previousRoot)
    || roots[0]
    || null;
  state.root = selected?.value || "";
  renderRoots(selected?.id || "");
}

function renderRoots(selectedId = "") {
  elements.rootSelect.innerHTML = "";
  for (const root of state.roots) {
    const option = document.createElement("option");
    option.value = root.id;
    option.textContent = `${root.label}: ${root.value}`;
    option.selected = selectedId ? root.id === selectedId : root.value === state.root;
    elements.rootSelect.append(option);
  }
  updateDeleteRootButton();
}

async function loadSelectedRoot() {
  const selected = getSelectedRoot();
  if (!selected) {
    return;
  }
  state.root = selected.value;
  updateDeleteRootButton();
  if (selected.type === "browser") {
    state.directoryHandle = await getBrowserDirectoryHandle(selected);
    await loadBrowserRoot();
    return;
  }
  state.directoryHandle = null;
  await loadSkillsFromServer(selected.value);
}

function getSelectedRoot() {
  return state.roots.find((root) => root.id === elements.rootSelect.value);
}

async function deleteSelectedRoot() {
  const selected = getSelectedRoot();
  if (!selected || !selected.removable) {
    return;
  }

  if (selected.type === "browser") {
    state.directoryHandle = null;
    state.directoryHandles.delete(selected.id);
    await deleteStoredDirectoryHandle(selected.id);
    state.directorySkills = [];
  }

  const result = await fetchJson(`/api/skill-roots/${encodeURIComponent(selected.id)}`, { method: "DELETE" });
  applyScannedRoots(result.roots || []);
  const fallback = state.roots[0];
  state.root = fallback?.value || "";
  if (fallback?.type === "browser") {
    state.directoryHandle = await getBrowserDirectoryHandle(fallback);
    await loadBrowserRoot();
    return;
  }
  await loadSkillsFromServer(fallback?.value || "");
}

function updateDeleteRootButton() {
  const selected = getSelectedRoot();
  elements.deletePath.disabled = !selected || !selected.removable;
}

async function scanDefaultDirectories() {
  elements.scanDirectories.disabled = true;
  elements.pathHint.textContent = t("scanningDirectories");
  try {
    const result = await fetchJson("/api/skill-roots/scan", { method: "POST" });
    applyScannedRoots(result.roots || []);
    showToast(`${t("scanComplete")}: ${result.found || 0}`);
    if (state.root) {
      await loadSelectedRoot();
    } else {
      elements.pathHint.textContent = t("noScannedDirectories");
    }
  } catch (error) {
    showToast(error.message, true);
  } finally {
    elements.scanDirectories.disabled = false;
  }
}

async function reloadCurrentRoot() {
  const previousSelection = state.selectedName;
  const selected = getSelectedRoot();
  if (selected?.type === "browser") {
    state.directoryHandle = state.directoryHandle || await getBrowserDirectoryHandle(selected);
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
  elements.pickDirectory.disabled = true;
  elements.pathHint.textContent = t("openingDirectoryPicker");
  try {
    const result = await fetchJson("/api/skill-roots/pick-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: state.language })
    });
    openDirectoryConfirm(result.directory);
  } catch (error) {
    elements.pathHint.textContent = state.root ? elements.pathHint.textContent : t("defaultPath");
    showToast(error.message, true);
  } finally {
    elements.pickDirectory.disabled = false;
  }
}

function openDirectoryConfirm(directory) {
  state.pendingDirectory = directory;
  elements.directoryConfirmEyebrow.textContent = t("directoryConfirmEyebrow");
  elements.directoryConfirmTitle.textContent = t("directoryConfirmTitle");
  elements.directoryNameLabel.textContent = t("directoryNameLabel");
  elements.cancelDirectoryConfirm.textContent = t("cancel");
  elements.saveDirectoryConfirm.textContent = t("saveDirectory");
  elements.directoryConfirmPath.textContent = directory.path;
  elements.directoryConfirmCount.textContent = directory.message;
  elements.directoryNameInput.value = directory.suggestedLabel || "";
  elements.directoryConfirmPanel.classList.remove("hidden");
  elements.directoryNameInput.focus();
  elements.directoryNameInput.select();
}

function closeDirectoryConfirm() {
  state.pendingDirectory = null;
  elements.directoryConfirmPanel.classList.add("hidden");
}

async function savePendingDirectory() {
  if (!state.pendingDirectory) {
    return;
  }
  const label = elements.directoryNameInput.value.trim() || state.pendingDirectory.suggestedLabel || "Custom";
  elements.saveDirectoryConfirm.disabled = true;
  try {
    const result = await fetchJson("/api/skill-roots/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "server", label, value: state.pendingDirectory.path })
    });
    const rootId = result.root?.id || "";
    closeDirectoryConfirm();
    applyScannedRoots(result.roots || [], rootId);
    showToast(`${t("directorySaved")}: ${label}`);
    await loadSelectedRoot();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    elements.saveDirectoryConfirm.disabled = false;
  }
}

async function loadBrowserRoot() {
  if (!state.directoryHandle) {
    state.directorySkills = [];
    state.skills = [];
    state.selectedName = "";
    state.selectedSkill = null;
    state.page = 1;
    renderSkillList();
    showEmpty();
    showToast(t("browserHandleMissing"), true);
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

async function getBrowserDirectoryHandle(root) {
  const cachedHandle = state.directoryHandles.get(root.id);
  if (cachedHandle && await hasDirectoryPermission(cachedHandle)) {
    return cachedHandle;
  }

  const storedHandle = await readStoredDirectoryHandle(root.id);
  if (storedHandle && await hasDirectoryPermission(storedHandle)) {
    state.directoryHandles.set(root.id, storedHandle);
    return storedHandle;
  }

  return null;
}

async function hasDirectoryPermission(handle) {
  if (!handle?.queryPermission) {
    return true;
  }
  const options = { mode: "read" };
  const current = await handle.queryPermission(options);
  if (current === "granted") {
    return true;
  }
  if (!handle.requestPermission) {
    return false;
  }
  return await handle.requestPermission(options) === "granted";
}

function openHandleDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(handleDbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(handleStoreName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withHandleStore(mode, callback) {
  if (!("indexedDB" in window)) {
    return null;
  }
  const db = await openHandleDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(handleStoreName, mode);
    const store = transaction.objectStore(handleStoreName);
    const result = callback(store);
    transaction.oncomplete = () => {
      db.close();
      resolve(result?.result ?? null);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function saveStoredDirectoryHandle(id, handle) {
  try {
    await withHandleStore("readwrite", (store) => store.put(handle, id));
  } catch {
    // Browser handle persistence is a convenience; the DB scan record remains authoritative.
  }
}

async function readStoredDirectoryHandle(id) {
  try {
    return await withHandleStore("readonly", (store) => store.get(id));
  } catch {
    return null;
  }
}

async function deleteStoredDirectoryHandle(id) {
  try {
    await withHandleStore("readwrite", (store) => store.delete(id));
  } catch {
    // Nothing to clean up if the browser does not expose the IndexedDB entry.
  }
}

async function summarizeBrowserSkill(handle) {
  const descriptionFile = await findBrowserDescription(handle);
  const description = descriptionFile ? await readBrowserFile(descriptionFile.handle) : "";
  return {
    name: handle.name,
    path: buildBrowserSkillDisplayPath(handle.name),
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
    loadCachedLogicMap(skill);
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
    path: buildBrowserSkillDisplayPath(listed.name),
    descriptionFile: descriptionFile?.name || null,
    description,
    files,
    analysis: analyzeSkill({ name: listed.name, description, files })
  };
}

function buildBrowserSkillDisplayPath(skillName) {
  const selected = getSelectedRoot();
  const rootLabel = selected?.label || "Local";
  const rootValue = selected?.expandedPath || selected?.value || state.root || state.directoryHandle?.name || "";
  const prefix = rootValue ? `${rootLabel}: ${rootValue}` : rootLabel;
  return `${prefix.replace(/\/+$/, "")}/${skillName}`;
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
  const skills = getFilteredSkills();
  const totalPages = Math.max(1, Math.ceil(skills.length / pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * pageSize;
  const visibleSkills = skills.slice(start, start + pageSize);

  elements.skillCount.textContent = state.skillSearch ? `${skills.length}/${state.skills.length}` : String(skills.length);
  elements.skillList.innerHTML = "";
  elements.pageStatus.textContent = `${state.page} / ${totalPages}`;
  elements.prevPage.disabled = state.page <= 1;
  elements.nextPage.disabled = state.page >= totalPages;

  if (!state.skills.length) {
    elements.skillList.innerHTML = `<div class="hint">${t("noSkills")}</div>`;
    return;
  }

  if (!skills.length) {
    elements.skillList.innerHTML = `<div class="hint">${t("noMatchingSkills")}</div>`;
    return;
  }

  for (const skill of visibleSkills) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `skill-item${skill.name === state.selectedName ? " active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(skill.name === state.selectedName));
    button.innerHTML = `<strong>${escapeHtml(skill.name)}</strong>`;
    button.addEventListener("click", () => selectSkill(skill.name));
    elements.skillList.append(button);
  }
}

function getFilteredSkills() {
  const query = normalizeSearchText(state.skillSearch);
  if (!query) {
    return state.skills;
  }
  return state.skills.filter((skill) => normalizeSearchText(skill.name).includes(query));
}

function normalizeSearchText(value) {
  return String(value || "").toLocaleLowerCase().replace(/\s+/g, "");
}

function changePage(delta) {
  const totalPages = Math.max(1, Math.ceil(getFilteredSkills().length / pageSize));
  state.page = Math.min(totalPages, Math.max(1, state.page + delta));
  renderSkillList();
}

function renderSkillDetail(skill) {
  const analysis = skill.analysis;
  elements.pathHint.textContent = state.directoryHandle ? t("loadedBrowser") : t("loadedServer");
  elements.introHero.classList.add("hidden");
  elements.emptyState.classList.add("hidden");
  elements.detail.classList.remove("hidden");
  elements.skillPath.textContent = skill.path;
  elements.skillName.textContent = skill.name;
  elements.skillSummary.textContent = analysis.summary;
  elements.logicMapMeta.textContent = t("rulesAnalysis");
  elements.refreshLogicMap.disabled = false;
  elements.refreshLogicMap.textContent = t("refreshLogicMap");
  elements.evaluationStatus.textContent = t("rulesEvaluationPrompt");
  elements.modelInsightMeta.textContent = t("rulesAnalysis");
  elements.modelInsight.textContent = t("noCachedModelAnalysis");
  elements.descriptionTitle.textContent = skill.descriptionFile ? `${t("description")} · ${skill.descriptionFile}` : t("description");
  elements.descriptionText.textContent = skill.description || t("noDescription");
  renderScores({
    complexityScore: calculateComplexity(analysis),
    complexityMeta: t("ruleScore"),
    roiScore: null,
    roiMeta: t("roiNotEvaluated")
  });
  elements.fileStats.textContent = `${analysis.fileStats.files} ${t("files")} · ${analysis.fileStats.directories} ${t("folders")}`;

  renderLogicMap(analysis.graph || buildSkillGraph({
    name: skill.name,
    description: skill.description,
    triggers: analysis.triggers,
    tools: analysis.tools,
    artifacts: analysis.artifacts || [],
    files: skill.files,
    methods: analysis.methods || [],
    decisions: analysis.decisions || []
  }));
  renderTools(analysis.tools);
  renderTriggers(formatRuleActivationPrompts(analysis.triggers));
  renderMethods(analysis.methods || []);
  renderFiles(skill.files);
}

async function loadCachedLogicMap(skill) {
  const requestId = ++state.logicMapRequestId;
  elements.logicMapMeta.textContent = t("checkingCache");

  try {
    const result = await fetchJson("/api/logic-map/cache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildLogicMapPayload(skill))
    });
    if (requestId !== state.logicMapRequestId || skill.name !== state.selectedName) {
      return;
    }
    if (result.cached && result.analysis) {
      applyModelLogicMap(skill, result.analysis, t("cachedModelAnalysis"));
      return;
    }
    elements.logicMapMeta.textContent = t("rulesAnalysis");
    elements.evaluationStatus.textContent = t("rulesEvaluationPrompt");
  } catch (error) {
    if (requestId === state.logicMapRequestId) {
      elements.logicMapMeta.textContent = t("rulesAnalysis");
      elements.evaluationStatus.textContent = t("rulesEvaluationPrompt");
      showToast(error.message, true);
    }
  }
}

async function refreshSelectedLogicMap() {
  if (!state.selectedSkill) {
    return;
  }

  const skill = state.selectedSkill;
  const requestId = ++state.logicMapRequestId;
  elements.refreshLogicMap.disabled = true;
  elements.refreshLogicMap.textContent = t("generatingLogicMap");
  elements.evaluationStatus.textContent = t("generatingLogicMap");
  elements.logicMapMeta.textContent = t("generatingLogicMap");
  elements.roiMeta.textContent = t("generatingLogicMap");
  elements.triggerList.innerHTML = `<span class="hint">${t("generatingLogicMap")}</span>`;

  try {
    const result = await fetchJson("/api/logic-map/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildLogicMapPayload(skill))
    });
    if (requestId !== state.logicMapRequestId || skill.name !== state.selectedName) {
      return;
    }
    applyModelLogicMap(skill, result.analysis, t("cachedModelAnalysis"));
    showToast(t("modelAnalysisSaved"));
  } catch (error) {
    if (requestId === state.logicMapRequestId) {
      elements.logicMapMeta.textContent = t("rulesAnalysis");
      elements.evaluationStatus.textContent = state.selectedSkill?.modelAnalysis ? formatEvaluationStatus(state.selectedSkill.modelAnalysis) : t("rulesEvaluationPrompt");
      elements.roiMeta.textContent = state.selectedSkill?.modelAnalysis?.roi ? formatRoiMeta(state.selectedSkill.modelAnalysis.roi) : t("roiNotEvaluated");
      renderTriggers(formatRuleActivationPrompts(skill.analysis.triggers));
      showToast(error.content || error.message, true);
    }
  } finally {
    if (requestId === state.logicMapRequestId) {
      elements.refreshLogicMap.disabled = false;
      elements.refreshLogicMap.textContent = t("refreshLogicMap");
    }
  }
}

function buildLogicMapPayload(skill) {
  const files = compactSkillFiles(skill.files || []);
  return {
    model: state.model,
    language: state.language,
    skill: {
      name: skill.name,
      path: skill.path,
      description: skill.description,
      files,
      fileStats: skill.analysis?.fileStats || {
        total: skill.files?.length || 0,
        directories: (skill.files || []).filter((file) => file.type === "directory").length,
        files: (skill.files || []).filter((file) => file.type === "file").length
      }
    }
  };
}

function compactSkillFiles(files) {
  const priorityFiles = [];
  const regularFiles = [];
  for (const file of files) {
    if (/(\bSKILL\.md$|\breadme\.md$|description\.md$|manifest\.json$|skill\.json$|package\.json$|requirements\.txt$|\.(sh|ps1|py|js|ts|mjs|cjs|ya?ml)$)/i.test(file.path)) {
      priorityFiles.push(file);
    } else {
      regularFiles.push(file);
    }
  }
  return [...priorityFiles.slice(0, 180), ...regularFiles.slice(0, 120)].map((file) => ({
    name: file.name,
    path: file.path,
    type: file.type,
    size: file.size || 0
  }));
}

function applyModelLogicMap(skill, modelAnalysis, metaLabel) {
  if (!modelAnalysis?.graph) {
    return;
  }

  skill.modelAnalysis = modelAnalysis;
  elements.skillSummary.textContent = modelAnalysis.summary || skill.analysis.summary;
  renderScores({
    complexityScore: modelAnalysis.complexity?.score ?? calculateComplexity(skill.analysis),
    complexityMeta: modelAnalysis.complexity?.rationale ? `${t("modelScore")} · ${modelAnalysis.complexity.rationale}` : t("modelScore"),
    roiScore: modelAnalysis.roi?.score,
    roiMeta: formatRoiMeta(modelAnalysis.roi)
  });
  elements.logicMapMeta.textContent = `${metaLabel} · ${modelAnalysis.model || state.model}`;
  elements.evaluationStatus.textContent = formatEvaluationStatus(modelAnalysis);
  elements.modelInsightMeta.textContent = `${metaLabel} · ${modelAnalysis.model || state.model}`;
  elements.modelInsight.textContent = modelAnalysis.insight || t("modelAnalysisLoaded");
  renderTriggers(modelAnalysis.activationPhrases?.length ? modelAnalysis.activationPhrases : skill.analysis.triggers);
  renderLogicMap(modelAnalysis.graph);
}

function renderScores({ complexityScore, complexityMeta, roiScore, roiMeta }) {
  elements.complexityScore.textContent = formatScore(complexityScore);
  elements.complexityMeta.textContent = complexityMeta || t("ruleScore");
  elements.roiScore.textContent = formatScore(roiScore);
  elements.roiMeta.textContent = roiMeta || t("roiNotEvaluated");
}

function formatScore(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return Number.isFinite(Number(value)) ? String(Math.max(0, Math.min(99, Math.round(Number(value))))) : "—";
}

function formatRoiMeta(roi) {
  if (!roi) {
    return t("roiNotEvaluated");
  }

  const estimate = roi.manualTimeEstimate || roi.manualTime || "";
  const rationale = roi.rationale || "";
  return [estimate ? `${t("manualTimePrefix")}${estimate}` : "", rationale].filter(Boolean).join(" · ") || t("modelScore");
}

function formatEvaluationStatus(modelAnalysis) {
  const timestamp = modelAnalysis?.cachedAt || modelAnalysis?.generatedAt;
  if (!timestamp) {
    return t("rulesEvaluationPrompt");
  }
  const date = new Date(timestamp);
  const formatted = Number.isNaN(date.getTime())
    ? String(timestamp)
    : new Intl.DateTimeFormat(state.language === "zh" ? "zh-CN" : "en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  return `${t("lastEvaluation")}: ${formatted}`;
}

function renderLogicMap(graph) {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  const width = graph?.width || 1200;
  const height = graph?.height || 560;
  elements.flowScene.style.width = `${width}px`;
  elements.flowScene.style.height = `${height}px`;
  elements.flowEdges.setAttribute("viewBox", `0 0 ${width} ${height}`);
  elements.flowEdges.setAttribute("width", width);
  elements.flowEdges.setAttribute("height", height);
  elements.flowEdges.innerHTML = `
    <defs>
      <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z" fill="rgba(40,216,255,.7)"></path>
      </marker>
    </defs>
  `;
  elements.flowNodes.innerHTML = "";
  elements.flowStats.textContent = `${nodes.length} ${t("nodes")} · ${edges.length} ${t("edges")}`;
  elements.flowStats.nextElementSibling.textContent = t("flowHint");

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) {
      continue;
    }
    elements.flowEdges.append(createEdgePath(source, target, edge.label));
  }

  for (const node of nodes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `flow-node ${node.type}`;
    button.style.left = `${node.x}px`;
    button.style.top = `${node.y}px`;
    button.dataset.nodeId = node.id;
    button.innerHTML = `
      <span class="flow-node-type">${escapeHtml(node.type)}</span>
      <h4>${escapeHtml(node.title)}</h4>
      <p>${escapeHtml(node.detail)}</p>
    `;
    button.addEventListener("click", () => selectGraphNode(node));
    elements.flowNodes.append(button);
  }

  selectGraphNode(nodes[0]);
  elements.logicMap.scrollTo({ left: 0, top: 0 });
}

function createEdgePath(source, target, label) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const startX = source.x + 230;
  const startY = source.y + 60;
  const endX = target.x;
  const endY = target.y + 60;
  const curve = Math.max(90, Math.min(180, (endX - startX) / 2));
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "flow-edge");
  path.setAttribute("marker-end", "url(#arrowhead)");
  path.setAttribute("d", `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`);
  group.append(path);

  if (label) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "flow-edge-label");
    text.setAttribute("x", String((startX + endX) / 2 - 20));
    text.setAttribute("y", String((startY + endY) / 2 - 8));
    text.textContent = label;
    group.append(text);
  }

  return group;
}

function selectGraphNode(node) {
  if (!node) {
    elements.nodeDetailTitle.textContent = t("nodeDetail");
    elements.nodeDetailType.textContent = t("selectNode");
    elements.nodeDetailBody.textContent = t("nodeDetailEmpty");
    elements.nodeEvidence.innerHTML = "";
    return;
  }

  document.querySelectorAll(".flow-node").forEach((element) => {
    element.classList.toggle("active", element.dataset.nodeId === node.id);
  });
  elements.nodeDetailTitle.textContent = node.title;
  elements.nodeDetailType.textContent = node.type;
  elements.nodeDetailBody.textContent = node.detail;
  elements.nodeEvidence.innerHTML = "";

  const evidence = node.evidence?.length ? node.evidence : [t("nodeDetailEmpty")];
  for (const item of evidence) {
    const pill = document.createElement("div");
    pill.className = "evidence-pill";
    pill.textContent = item;
    elements.nodeEvidence.append(pill);
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

function formatRuleActivationPrompts(triggers) {
  return (triggers || []).slice(0, 3).map((trigger) => {
    const text = String(trigger || "").trim();
    if (!text) {
      return "";
    }
    return state.language === "zh"
      ? `Prompt：${text} · 场景：用户明确提出与该触发条件匹配的任务。`
      : `Prompt: ${text} · Scenario: The user asks for a task matching this trigger condition.`;
  }).filter(Boolean);
}

function renderMethods(methods) {
  elements.methodList.innerHTML = "";
  if (!methods.length) {
    elements.methodList.innerHTML = `<span class="hint">${t("nodeDetailEmpty")}</span>`;
    return;
  }

  for (const method of methods.slice(0, 12)) {
    const item = document.createElement("span");
    item.className = "method-item";
    item.textContent = method.label || method.detail;
    elements.methodList.append(item);
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
  state.githubAuth = status;
  elements.githubStatus.textContent = status.authenticated
    ? `${t("signedIn")}: ${status.login || "GitHub"}${status.needsCopilotScope ? " · copilot scope needed" : ""}`
    : t("notSignedIn");
  renderGitHubAuthButton(status);
  return status;
}

function renderGitHubAuthButton(status = state.githubAuth) {
  const isAuthenticated = Boolean(status?.authenticated);
  elements.githubLogin.classList.toggle("github-avatar-button", isAuthenticated);
  elements.githubLogin.classList.toggle("ghost", !isAuthenticated);
  elements.githubLogin.classList.toggle("signed-in", isAuthenticated);
  elements.githubLogin.setAttribute("aria-label", isAuthenticated ? `${t("signedIn")}: ${status.login || "GitHub"}` : t("signIn"));
  elements.githubLogin.title = isAuthenticated
    ? `${status.name || status.login || "GitHub"}${status.needsCopilotScope ? " · copilot scope needed" : ""}`
    : t("signIn");

  if (!isAuthenticated) {
    elements.githubLogin.textContent = t("signIn");
    return;
  }

  const fallback = escapeHtml(getInitials(status.login || status.name || "GH"));
  elements.githubLogin.innerHTML = status.avatarUrl
    ? `<img src="${escapeHtml(status.avatarUrl)}" alt="" referrerpolicy="no-referrer" /><span>${fallback}</span>`
    : `<span>${fallback}</span>`;
}

function getInitials(value) {
  return value
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GH";
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
  elements.introHero.classList.remove("hidden");
  elements.emptyState.classList.remove("hidden");
  elements.detail.classList.add("hidden");
  elements.modelInsight.textContent = t("modelIdle");
  elements.logicMapMeta.textContent = t("logicMapMeta");
  elements.evaluationStatus.textContent = t("rulesEvaluationPrompt");
  elements.refreshLogicMap.disabled = true;
  renderScores({
    complexityScore: 0,
    complexityMeta: t("ruleScore"),
    roiScore: null,
    roiMeta: t("roiNotEvaluated")
  });
}

function setLoading(message) {
  elements.pathHint.textContent = message;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "Request returned a non-JSON response.");
  }
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
    ".nav-brand .eyebrow": "appEyebrow",
    ".nav-brand h1": "appTitle",
    ".path-card label": "skillDirectory",
    "#deletePath": "deleteDirectory",
    "#pickDirectory": "chooseDirectory",
    "#scanDirectories": "scanDirectories",
    ".list-header span": "skills",
    "#prevPage": "previous",
    "#nextPage": "next",
    ".hero .eyebrow": "heroEyebrow",
    ".hero h2": "heroTitle",
    ".hero p:not(.eyebrow)": "heroBody",
    "#emptyState .eyebrow": "emptyEyebrow",
    "#emptyState h3": "emptyTitle",
    "#emptyState p:not(.eyebrow)": "emptyBody",
    ".empty-guide span:nth-child(1)": "guideDirectory",
    ".empty-guide span:nth-child(2)": "guideSkill",
    ".empty-guide span:nth-child(3)": "guideGraph",
    ".score-card span": "complexity",
    ".roi-card span": "roi",
    "#complexityMeta": "ruleScore",
    "#roiMeta": "roiNotEvaluated",
    "#logicMapTitle": "logicMap",
    ".map-card .card-title small": "logicMapMeta",
    "#refreshLogicMap": "refreshLogicMap",
    "#nodeDetailTitle": "nodeDetail",
    "#nodeDetailType": "selectNode",
    ".tool-card .card-title span": "toolStack",
    ".tool-card .card-title small": "toolStackMeta",
    "#methodTitle": "runMethods",
    "#methodMeta": "runMethodsMeta",
    ".trigger-card .card-title span": "activationPhrases",
    ".trigger-card .card-title small": "activationMeta",
    ".file-card .card-title span": "directoryTelemetry",
    "#modelInsightTitle": "modelInsight",
    "#modelInsightMeta": "modelMeta",
    "#descriptionTitle": "description",
    ".description-card .card-title small": "rawSource",
    "#settingsTitle": "settingsTitle",
    "#languageFieldLabel": "displayLanguage",
    "#modelFieldLabel": "defaultModel",
    "#checkGithub": "checkStatus",
    "#directoryConfirmEyebrow": "directoryConfirmEyebrow",
    "#directoryConfirmTitle": "directoryConfirmTitle",
    "#directoryNameLabel": "directoryNameLabel",
    "#cancelDirectoryConfirm": "cancel",
    "#saveDirectoryConfirm": "saveDirectory"
  };

  for (const [selector, key] of Object.entries(selectors)) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = t(key);
    }
  }

  elements.pathHint.textContent = state.root ? elements.pathHint.textContent : t("defaultPath");
  elements.skillSearch.placeholder = t("searchByName");
  elements.openSettings.setAttribute("aria-label", t("settings"));
  elements.openSettings.title = t("settings");
  if (!state.selectedSkill) {
    elements.modelInsight.textContent = t("modelIdle");
  }
  elements.evaluationStatus.textContent = state.selectedSkill?.modelAnalysis
    ? formatEvaluationStatus(state.selectedSkill.modelAnalysis)
    : t("rulesEvaluationPrompt");
  renderGitHubAuthButton();
  applyTheme();
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
  const extractedMethods = extractRunMethods(description, files);
  const methods = extractedMethods.length ? extractedMethods : [{
    id: "method-1",
    label: state.language === "zh" ? "按描述指令执行" : "Execute documented instructions",
    detail: buildReasoningSummary(lower)
  }];
  const decisions = buildDecisionNodes({ description, triggers, tools, files });
  const artifacts = files
    .filter((file) => file.type === "file")
    .map((file) => file.path)
    .filter((filePath) => /(\.md|\.json|\.ya?ml|\.sh|\.ps1|\.py|\.js|\.ts)$/i.test(filePath));

  return {
    summary: buildSkillSummary(description, tools, triggers, files),
    triggers: triggers.slice(0, 12),
    tools,
    artifacts: artifacts.slice(0, 18),
    methods,
    decisions,
    phases: [
      phase(state.language === "zh" ? "触发识别" : "Activation", state.language === "zh" ? "将用户意图匹配到触发 Prompt 和 Skill 适用范围。" : "Match user intent against trigger prompts and skill scope.", triggers.length, "signal"),
      phase(state.language === "zh" ? "上下文读取" : "Context intake", state.language === "zh" ? "读取描述文件和 Skill 目录中的支撑资产。" : "Read the description file and supporting assets in the skill directory.", files.length, "folder"),
      phase(state.language === "zh" ? "推理编排" : "Reasoning pass", buildReasoningSummary(lower), countReasoningSignals(lower), "model"),
      phase(state.language === "zh" ? "工具编排" : "Tool choreography", tools.length ? (state.language === "zh" ? `协调 ${tools.length} 个检测到的工具面。` : `Coordinate ${tools.length} detected tool surface${tools.length === 1 ? "" : "s"}.`) : t("noTools"), tools.length, "tool"),
      phase(state.language === "zh" ? "结果交付" : "Output handoff", buildOutputSummary(lower), artifacts.length, "ship")
    ],
    graph: buildSkillGraph({ name, description, triggers, tools, artifacts, files, methods, decisions }),
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
    .map((tool) => ({ name: tool, role: inferToolRole(tool) }));
}

function extractRunMethods(description, files) {
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
    .map((file) => state.language === "zh" ? `运行或引用 ${file.path}` : `Run or reference ${file.path}`)
    .slice(0, 6);

  return uniqueList([...codeCommands, ...imperativeLines, ...scriptFiles]).slice(0, 12).map((method, index) => ({
    id: `method-${index + 1}`,
    label: method.length > 90 ? `${method.slice(0, 87)}...` : method,
    detail: method
  }));
}

function buildDecisionNodes({ description, triggers, tools, files }) {
  const decisions = [
    {
      id: "decision-trigger",
      label: state.language === "zh" ? "意图是否匹配触发词？" : "Does the user intent match a trigger?",
      detail: triggers.length ? (state.language === "zh" ? `检测到 ${triggers.length} 个触发信号。` : `${triggers.length} trigger signals detected.`) : t("noTriggers"),
      outcome: triggers.length ? "yes" : "review"
    },
    {
      id: "decision-context",
      label: state.language === "zh" ? "是否有描述文件和支撑资产？" : "Are description and support files available?",
      detail: state.language === "zh" ? `${files.length} 个目录项可用于推理。` : `${files.length} directory entries are available for reasoning.`,
      outcome: files.length ? "yes" : "review"
    },
    {
      id: "decision-tools",
      label: state.language === "zh" ? "是否需要调用工具？" : "Does execution require tools?",
      detail: tools.length ? (state.language === "zh" ? `检测到 ${tools.length} 个工具面。` : `${tools.length} tool surfaces detected.`) : t("noTools"),
      outcome: tools.length ? "yes" : "manual"
    }
  ];

  if (/ask_user|clarify|confirm|approval|permission|用户确认|澄清|批准/i.test(description)) {
    decisions.push({
      id: "decision-human",
      label: state.language === "zh" ? "是否需要用户确认？" : "Is user confirmation required?",
      detail: state.language === "zh" ? "描述中出现澄清、确认或审批信号。" : "Clarification, confirmation, or approval signals appear in the description.",
      outcome: "conditional"
    });
  }

  return decisions;
}

function buildSkillGraph({ name, description, triggers, tools, artifacts, files, methods, decisions }) {
  const nodes = [];
  const edges = [];
  const addNode = (node) => {
    nodes.push(node);
    return node.id;
  };
  const addEdge = (source, target, label = "") => edges.push({ source, target, label });
  const isZh = state.language === "zh";

  const entryId = addNode(graphNode("entry", "input", isZh ? "用户意图" : "User intent", name, [isZh ? "Skill 路由入口" : "Skill routing entry", ...triggers.slice(0, 4)]));
  const triggerId = addNode(graphNode("trigger", "decision", decisions[0]?.label || (isZh ? "触发判断" : "Trigger decision"), decisions[0]?.detail || t("noTriggers"), triggers.slice(0, 8)));
  const manifestId = addNode(graphNode("manifest", "document", isZh ? "读取 Skill 描述" : "Read skill manifest", extractSummary(description) || name, [isZh ? "解析描述、触发条件和约束" : "Parse description, triggers, and constraints"]));
  const contextId = addNode(graphNode("context", "filesystem", isZh ? "扫描目录资产" : "Scan directory assets", decisions[1]?.detail || "", files.slice(0, 10).map((file) => file.path)));
  addEdge(entryId, triggerId, isZh ? "匹配" : "match");
  addEdge(triggerId, manifestId, decisions[0]?.outcome || "next");
  addEdge(manifestId, contextId, isZh ? "读取" : "read");

  let previous = contextId;
  for (const decision of decisions.slice(1)) {
    const decisionId = addNode(graphNode(decision.id, "decision", decision.label, decision.detail, [decision.outcome]));
    addEdge(previous, decisionId, isZh ? "判断" : "decide");
    previous = decisionId;
  }

  const methodItems = methods.length ? methods : [{
    id: "method-1",
    label: isZh ? "按描述指令执行" : "Execute documented instructions",
    detail: buildReasoningSummary(description.toLowerCase())
  }];
  for (const method of methodItems.slice(0, 6)) {
    const methodId = addNode(graphNode(method.id, "method", method.label, method.detail, [isZh ? "运行方法" : "run method"]));
    addEdge(previous, methodId, isZh ? "执行" : "execute");
    previous = methodId;
  }

  const toolHubId = addNode(graphNode("tool-hub", "tool", isZh ? "工具编排" : "Tool orchestration", tools.length ? (isZh ? `协调 ${tools.length} 个检测到的工具面。` : `Coordinate ${tools.length} detected tool surfaces.`) : t("noTools"), tools.map((tool) => `${tool.name}: ${tool.role}`)));
  addEdge(previous, toolHubId, tools.length ? (isZh ? "调用" : "call") : (isZh ? "可选" : "optional"));

  for (const tool of tools.slice(0, 8)) {
    const toolId = addNode(graphNode(`tool-${tool.name}`, "tool", tool.name, localizeToolRole(tool), [isZh ? "检测到的执行工具" : "Detected execution tool"]));
    addEdge(toolHubId, toolId, isZh ? "使用" : "uses");
  }

  const outputId = addNode(graphNode("output", "output", isZh ? "结果交付" : "Output handoff", buildOutputSummary(description.toLowerCase()), artifacts.slice(0, 8)));
  addEdge(toolHubId, outputId, isZh ? "产出" : "produce");

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
  const typeColumns = { method: 7, tool: 10 };
  const rowCounts = new Map();
  const laidOutNodes = nodes.map((node) => {
    const column = columns[node.id] ?? typeColumns[node.type] ?? 8;
    const row = rowCounts.get(column) || 0;
    rowCounts.set(column, row + 1);
    return {
      ...node,
      x: 80 + column * 290,
      y: 90 + row * 170
    };
  });

  return {
    nodes: laidOutNodes,
    edges,
    width: Math.max(...laidOutNodes.map((node) => node.x), 1000) + 340,
    height: Math.max(...laidOutNodes.map((node) => node.y), 420) + 180
  };
}

function uniqueList(values) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
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
    clauses.push(state.language === "zh" ? `发现 ${triggers.length} 个触发 Prompt 信号` : `${triggers.length} trigger prompt signals found`);
  }
  return clauses.join(" · ");
}

function calculateComplexity(analysis) {
  return Math.min(99, analysis.fileStats.files * 2 + analysis.tools.length * 7 + analysis.triggers.length * 3);
}
