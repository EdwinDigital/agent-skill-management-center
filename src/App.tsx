import { useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type ReactNode } from "react";
import {
  BrainCircuit,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  File as FileIcon,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Languages,
  LogOut,
  MessageSquareText,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  RefreshCw,
  Route,
  ScanSearch,
  Search,
  Sparkles,
  Sun,
  Target,
  Trash2,
  WandSparkles,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type Language = "en" | "zh";
type Theme = "light" | "dark";

type SkillRoot = {
  id: string;
  label: string;
  value: string;
  type?: string;
  removable?: boolean;
};

type SkillListItem = {
  name: string;
  path: string;
  summary?: string;
  hasDescription?: boolean;
  descriptionFile?: string | null;
};

type SkillFile = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
};

type SkillFileTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children: SkillFileTreeNode[];
};

type ToolInfo = {
  name: string;
  role: string;
};

type MethodInfo = {
  id?: string;
  label?: string;
  detail?: string;
};

type GraphNode = {
  id: string;
  type: string;
  title: string;
  detail: string;
  evidence?: string[];
  x: number;
  y: number;
};

type GraphEdge = {
  source: string;
  target: string;
  label?: string;
};

type LogicGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
};

type SkillAnalysis = {
  summary: string;
  triggers: string[];
  tools: ToolInfo[];
  methods: MethodInfo[];
  fileStats: {
    total: number;
    directories: number;
    files: number;
  };
  graph?: LogicGraph;
};

type ModelAnalysis = {
  summary?: string;
  graph?: LogicGraph;
  model?: string;
  insight?: string;
  cacheMatch?: "exact" | "stale-content" | "stale-model-or-content";
  cachedAt?: string;
  generatedAt?: string;
  activationPhrases?: string[];
  complexity?: {
    score?: number;
    rationale?: string;
  };
  roi?: {
    score?: number;
    manualTimeEstimate?: string;
    manualTime?: string;
    rationale?: string;
  };
};

type SkillTranslation = {
  source?: string;
  model?: string;
  language?: Language;
  content: string;
  detectedLanguage?: Language;
  skipped?: boolean;
  reason?: string;
  cachedAt?: string;
  generatedAt?: string;
};

type SkillDetail = {
  name: string;
  path: string;
  descriptionFile?: string | null;
  description: string;
  files: SkillFile[];
  analysis: SkillAnalysis;
  modelAnalysis?: ModelAnalysis;
};

type ModelInfo = {
  id: string;
  name?: string;
  source?: string;
};

type ModelsResponse = {
  source: string;
  error?: string;
  authRequired?: boolean;
  authHelp?: string;
  authCommand?: string;
  models: ModelInfo[];
};

type GitHubStatus = {
  cliInstalled?: boolean;
  tokenAvailable?: boolean;
  authenticated?: boolean;
  ready?: boolean;
  login?: string;
  name?: string;
  avatarUrl?: string;
  needsCopilotScope?: boolean;
  authRequired?: boolean;
  message?: string;
  command?: string;
  error?: string;
};

type GitHubAuthGuide = {
  message?: string;
  command?: string;
  authHelp?: string;
  authCommand?: string;
};

type PendingDirectory = {
  path: string;
  message: string;
  suggestedLabel?: string;
  skillCount?: number;
};

const defaultSkillPageSize = 10;
const minSkillPageSize = 1;
const maxSkillPageSize = 18;
const skillRowPitch = 37;
const graphMinZoom = 0.6;
const graphMinAutoZoom = 0.6;
const graphMaxZoom = 1.6;
const graphMaxAutoZoom = 1.2;
const graphAutoZoomStep = 0.1;
const graphAutoZoomRightPadding = 40;
const storageKeys = {
  language: "skill-viz-language",
  model: "skill-viz-model",
  sidebar: "skill-viz-sidebar-collapsed",
  skillDocPanel: "skill-viz-skill-doc-panel-collapsed",
  theme: "skill-viz-theme"
};

const copy = {
  en: {
    appEyebrow: "Skill OS",
    appTitle: "AI Agent Skills Console",
    signIn: "Sign in with GitHub",
    signedIn: "Signed in",
    signOut: "Sign out",
    signedOut: "Signed out",
    notSignedIn: "Not signed in",
    settings: "Settings",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    collapseSkillDoc: "Collapse skill definition details",
    expandSkillDoc: "Expand skill definition details",
    skillDocRail: "Skill definition details",
    skillDocTitle: "Skill definition details",
    skillDocTab: "SKILL.md",
    fileDirectoryTab: "File directory",
    skillDocOriginal: "Original",
    skillDocTranslated: "Translation",
    translateSkillDoc: "Translate",
    showOriginalSkillDoc: "Original",
    translatingSkillDoc: "Translating...",
    translationSaved: "Translation saved",
    translationLoaded: "Loaded cached translation",
    translationSkipped: "Skill.md is already in the current language",
    translationUnavailable: "No Skill.md content is available.",
    sidebarTitle: "Skill Management",
    sidebarRail: "Skill Management",
    sidebarModeInspect: "Inspect",
    sidebarModeMap: "Map",
    sidebarNewTask: "Scan Skills",
    sidebarTaskList: "Skill list",
    skillDirectory: "Skill directory",
    deleteDirectory: "Delete",
    chooseDirectory: "Add path",
    scanDirectories: "Global scan",
    defaultPath: "Default path is read by the local Node server.",
    loadedServer: "Loaded through the local Node server.",
    scanningDirectories: "Scanning default agent directories...",
    scanComplete: "Scan complete",
    noScannedDirectories: "No scanned Skill directories found. Click Scan to discover installed paths.",
    readingRoot: "Reading skill root...",
    skills: "Skills list",
    searchByName: "Search by name",
    clearSearch: "Clear search",
    previous: "Previous",
    next: "Next",
    heroEyebrow: "Local Skill intelligence map",
    heroTitle: "Visualize local Skills and shape your private super agent.",
    heroBody: "Scan Skill roots on this machine, connect triggers, tools, evidence, and execution paths, then decide which capabilities deserve to become part of your personal agent system.",
    emptyEyebrow: "Start with a local Skill",
    emptyTitle: "Turn scattered Skill files into an inspectable intelligence map.",
    emptyBody: "Use the left rail to discover local Skill directories. The console keeps raw files, rule evidence, workflow graphs, and optional AI evaluation together so your private super agent can grow from verified local knowledge.",
    guideDirectory: "Scan or add a local Skill directory.",
    guideSkill: "Choose a Skill to reveal its trigger logic and tool surface.",
    guideGraph: "Inspect evidence, execution paths, and agent-building signals.",
    complexity: "Complexity",
    roi: "ROI",
    modelScore: "Model score",
    roiNotEvaluated: "Not evaluated",
    manualTimePrefix: "Manual: ",
    refreshLogicMap: "AI evaluation",
    generatingLogicMap: "Generating...",
    checkingCache: "Checking cache...",
    rulesAnalysis: "Rules analysis",
    cachedModelAnalysis: "Cached model analysis",
    historicalModelAnalysis: "Historical cached model analysis",
    rulesEvaluationPrompt: "Rules analysis is shown. Run AI evaluation to show model scores.",
    noCachedModelAnalysis: "Rules analysis is shown. Run AI evaluation to generate and cache model insight.",
    modelAnalysisLoaded: "Loaded cached model logic map.",
    modelAnalysisSaved: "Generated and cached model logic map.",
    lastEvaluation: "Last evaluation",
    logicMap: "Logic map",
    logicMapMeta: "Horizontal execution panorama",
    flowHint: "Scroll horizontally. Select a node for evidence.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetZoom: "Reset zoom",
    nodes: "nodes",
    edges: "edges",
    nodeDetail: "Node detail",
    selectNode: "Select a node",
    nodeDetailEmpty: "Select a graph node to inspect its role, evidence, and downstream execution path.",
    toolStack: "Tool stack",
    toolStackMeta: "Detected execution surfaces",
    runMethods: "Run methods",
    runMethodsMeta: "Commands and procedural steps",
    activationPhrases: "Trigger prompts",
    activationMeta: "Activation examples and common user scenarios",
    directoryTelemetry: "Directory telemetry",
    description: "Description",
    rawSource: "Raw source",
    modelInsight: "Model insight",
    modelMeta: "GitHub Copilot SDK",
    modelIdle: "Select a skill to request model-driven analysis.",
    displayLanguage: "Display language",
    defaultModel: "Default model",
    loadingModels: "Loading models...",
    checkStatus: "Check status",
    save: "Save",
    noSkills: "No skill directories found.",
    noMatchingSkills: "No skills match this name.",
    noTools: "No explicit tools detected.",
    noTriggers: "No trigger prompts or typical scenarios found.",
    copyPath: "Copy path",
    pathCopied: "Path copied",
    copyPrompt: "Copy prompt",
    promptCopied: "Prompt copied",
    noFiles: "No files found.",
    noDescription: "No description file found.",
    files: "files",
    folders: "folders",
    directoryConfirmEyebrow: "Local Skill root",
    directoryConfirmTitle: "Add path",
    directoryNameLabel: "Directory display name",
    directoryNoSkills: "No Skill definition file (SKILL.md) was found in the selected directory.",
    cancel: "Cancel",
    saveDirectory: "Save directory",
    directorySaved: "Directory saved",
    openingDirectoryPicker: "Opening directory picker...",
    runCommand: "Run in terminal:",
    copyCommand: "Copy command",
    commandCopied: "Command copied",
    githubAuthReady: "GitHub Copilot SDK authorization is ready.",
    githubAuthNeeded: "GitHub Copilot SDK needs authorization.",
    githubAuthAfterCommand: "After the command finishes, press Check status."
  },
  zh: {
    appEyebrow: "Skill OS",
    appTitle: "AI智能体技能控制台",
    signIn: "登录 GitHub",
    signedIn: "已登录",
    signOut: "注销",
    signedOut: "已注销",
    notSignedIn: "未登录",
    settings: "设置",
    collapseSidebar: "折叠侧栏",
    expandSidebar: "展开侧栏",
    collapseSkillDoc: "折叠 Skill.md",
    expandSkillDoc: "展开 Skill.md",
    skillDocRail: "Skill定义详情",
    skillDocTitle: "Skill定义详情",
    skillDocTab: "SKILL.md",
    fileDirectoryTab: "文件目录",
    skillDocOriginal: "原文",
    skillDocTranslated: "译文",
    translateSkillDoc: "翻译",
    showOriginalSkillDoc: "原文",
    translatingSkillDoc: "翻译中...",
    translationSaved: "翻译已保存",
    translationLoaded: "已加载缓存翻译",
    translationSkipped: "Skill.md 已经是当前语言，无需翻译",
    translationUnavailable: "没有可展示的 SKILL.md 内容。",
    sidebarTitle: "Skill管理",
    sidebarRail: "Skill管理",
    sidebarModeInspect: "审查",
    sidebarModeMap: "图谱",
    sidebarNewTask: "全局扫描",
    sidebarTaskList: "Skill 列表",
    skillDirectory: "Skill 目录",
    deleteDirectory: "删除",
    chooseDirectory: "添加路径",
    scanDirectories: "全局扫描",
    defaultPath: "默认路径由本地 Node 服务读取。",
    loadedServer: "已通过本地 Node 服务加载。",
    scanningDirectories: "正在扫描默认 Agent 目录...",
    scanComplete: "扫描完成",
    noScannedDirectories: "未找到已扫描的 Skill 目录。点击扫描发现已安装路径。",
    readingRoot: "正在读取 Skill 根目录...",
    skills: "Skills列表",
    searchByName: "按名称搜索",
    clearSearch: "清除搜索",
    previous: "上一页",
    next: "下一页",
    heroEyebrow: "本地 Skill 智能地图",
    heroTitle: "可视化分析本地 Skill，打造你的私人超级智能体。",
    heroBody: "扫描这台机器上的 Skill 根目录，串联触发条件、工具、证据与执行路径，再判断哪些能力值得沉淀进你的个人 Agent 系统。",
    emptyEyebrow: "从本地 Skill 开始",
    emptyTitle: "把散落的 Skill 文件变成可审查的智能地图。",
    emptyBody: "通过左侧栏发现本地 Skill 目录。控制台会把原始文件、规则证据、工作流图谱和可选 AI 评估放在一起，让私人超级智能体从可信的本地知识生长出来。",
    guideDirectory: "扫描或添加本地 Skill 目录。",
    guideSkill: "选择一个 Skill，展开它的触发逻辑与工具边界。",
    guideGraph: "查看证据、执行路径和构建智能体的信号。",
    complexity: "复杂度",
    roi: "ROI",
    modelScore: "模型评分",
    roiNotEvaluated: "未评估",
    manualTimePrefix: "人工：",
    refreshLogicMap: "AI 评估",
    generatingLogicMap: "生成中...",
    checkingCache: "正在检查缓存...",
    rulesAnalysis: "规则分析",
    cachedModelAnalysis: "已缓存的模型分析",
    historicalModelAnalysis: "历史缓存的模型分析",
    rulesEvaluationPrompt: "当前显示规则分析。运行 AI 评估后显示模型评分。",
    noCachedModelAnalysis: "当前显示规则分析。运行 AI 评估可生成并缓存模型洞察。",
    modelAnalysisLoaded: "已加载缓存的模型逻辑图。",
    modelAnalysisSaved: "已生成并缓存模型逻辑图。",
    lastEvaluation: "最后评估",
    logicMap: "逻辑图",
    logicMapMeta: "横向执行全景",
    flowHint: "横向滚动。选择节点查看证据。",
    zoomIn: "放大",
    zoomOut: "缩小",
    resetZoom: "重置缩放",
    nodes: "个节点",
    edges: "条连线",
    nodeDetail: "节点详情",
    selectNode: "选择节点",
    nodeDetailEmpty: "选择图谱节点，查看它的角色、证据和下游执行路径。",
    toolStack: "工具栈",
    toolStackMeta: "检测到的执行面",
    runMethods: "运行方法",
    runMethodsMeta: "命令和流程步骤",
    activationPhrases: "触发 Prompt",
    activationMeta: "触发示例和常见用户场景",
    directoryTelemetry: "目录遥测",
    description: "描述",
    rawSource: "原始内容",
    modelInsight: "模型洞察",
    modelMeta: "GitHub Copilot SDK",
    modelIdle: "选择一个 Skill 后请求模型驱动分析。",
    displayLanguage: "显示语言",
    defaultModel: "默认模型",
    loadingModels: "正在读取模型列表...",
    checkStatus: "检查状态",
    save: "保存",
    noSkills: "未找到 Skill 目录。",
    noMatchingSkills: "没有匹配该名称的 Skill。",
    noTools: "未检测到明确工具。",
    noTriggers: "未找到触发 Prompt 或典型场景。",
    copyPath: "复制路径",
    pathCopied: "路径已复制",
    copyPrompt: "复制 Prompt",
    promptCopied: "Prompt 已复制",
    noFiles: "未找到文件。",
    noDescription: "未找到描述文件。",
    files: "个文件",
    folders: "个文件夹",
    directoryConfirmEyebrow: "本地 Skill 根目录",
    directoryConfirmTitle: "添加路径",
    directoryNameLabel: "目录显示名称",
    directoryNoSkills: "当前目录没有找到 Skill 定义文件（SKILL.md）。",
    cancel: "取消",
    saveDirectory: "保存目录",
    directorySaved: "目录已保存",
    openingDirectoryPicker: "正在打开目录选择器...",
    runCommand: "在终端运行：",
    copyCommand: "复制命令",
    commandCopied: "命令已复制",
    githubAuthReady: "GitHub Copilot SDK 授权已就绪。",
    githubAuthNeeded: "GitHub Copilot SDK 需要授权。",
    githubAuthAfterCommand: "命令执行完成后，点击检查状态。"
  }
} satisfies Record<Language, Record<string, string>>;

function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem(storageKeys.language) as Language) || "en");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKeys.theme) as Theme) || "light");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState(() => localStorage.getItem(storageKeys.model) || "github-default");
  const [roots, setRoots] = useState<SkillRoot[]>([]);
  const [rootId, setRootId] = useState("");
  const [skills, setSkills] = useState<SkillListItem[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [page, setPage] = useState(1);
  const [skillPageSize, setSkillPageSize] = useState(defaultSkillPageSize);
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [pathHint, setPathHint] = useState("");
  const [loadingRoot, setLoadingRoot] = useState(false);
  const [loadingSkill, setLoadingSkill] = useState(false);
  const [generatingMap, setGeneratingMap] = useState(false);
  const [activeProgressRequestId, setActiveProgressRequestId] = useState<string | null>(null);
  const [logicMapMeta, setLogicMapMeta] = useState("");
  const [evaluationStatus, setEvaluationStatus] = useState("");
  const [githubStatus, setGitHubStatus] = useState<GitHubStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadingSettingsModels, setLoadingSettingsModels] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(storageKeys.sidebar) === "1");
  const [skillDocCollapsed, setSkillDocCollapsed] = useState(() => localStorage.getItem(storageKeys.skillDocPanel) !== "0");
  const [skillDocMode, setSkillDocMode] = useState<"original" | "translated">("original");
  const [skillTranslation, setSkillTranslation] = useState<SkillTranslation | null>(null);
  const [translatingSkillDoc, setTranslatingSkillDoc] = useState(false);
  const [pendingDirectory, setPendingDirectory] = useState<PendingDirectory | null>(null);
  const [directoryName, setDirectoryName] = useState("");
  const [savingDirectory, setSavingDirectory] = useState(false);
  const mapRequestRef = useRef(0);
  const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
  const skillListRef = useRef<HTMLDivElement | null>(null);
  const skillPaginationRef = useRef<HTMLDivElement | null>(null);
  const settingsModelsRequestRef = useRef(0);
  const settingsModelsLoadedRef = useRef(false);

  const text = copy[language];
  const evaluationProgressText = evaluationStatus;
  const selectedRoot = roots.find((root) => root.id === rootId) || null;
  const graph = selectedSkill?.modelAnalysis?.graph || selectedSkill?.analysis.graph || emptyGraph;
  const filteredSkills = useMemo(() => {
    const query = normalizeSearchText(skillSearch);
    return query ? skills.filter((skill) => normalizeSearchText(skill.name).includes(query)) : skills;
  }, [skillSearch, skills]);
  const totalPages = Math.max(1, Math.ceil(filteredSkills.length / skillPageSize));
  const showSkillPagination = totalPages > 1;
  const visibleSkills = filteredSkills.slice((page - 1) * skillPageSize, page * skillPageSize);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    localStorage.setItem(storageKeys.language, language);
  }, [language]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(storageKeys.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(storageKeys.model, model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem(storageKeys.sidebar, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(storageKeys.skillDocPanel, skillDocCollapsed ? "1" : "0");
  }, [skillDocCollapsed]);

  useEffect(() => {
    if (!selectedSkill) {
      setSkillTranslation(null);
      setSkillDocMode("original");
      return;
    }
    void loadCachedSkillTranslation(selectedSkill);
  }, [selectedSkill?.path, language, model]);

  useEffect(() => {
    function updateSkillPageSize() {
      if (sidebarCollapsed) return;
      const sidebar = sidebarScrollRef.current;
      const list = skillListRef.current;
      const pagination = skillPaginationRef.current;
      if (!sidebar || !list) return;

      const sidebarRect = sidebar.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const paginationHeight = showSkillPagination && pagination ? pagination.getBoundingClientRect().height : 0;
      const bottomPadding = window.matchMedia("(min-width: 1024px)").matches ? 20 : 16;
      const listToPaginationGap = showSkillPagination ? 16 : 0;
      const availableHeight = sidebarRect.bottom - bottomPadding - listRect.top - paginationHeight - listToPaginationGap;
      const nextPageSize = Math.min(maxSkillPageSize, Math.max(minSkillPageSize, Math.floor((availableHeight + 8) / skillRowPitch)));
      setSkillPageSize((current) => current === nextPageSize ? current : nextPageSize);
    }

    const animationFrame = window.requestAnimationFrame(updateSkillPageSize);
    window.addEventListener("resize", updateSkillPageSize);
    const resizeObserver = new ResizeObserver(updateSkillPageSize);
    [sidebarScrollRef.current, skillListRef.current, skillPaginationRef.current].forEach((element) => {
      if (element) resizeObserver.observe(element);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateSkillPageSize);
      resizeObserver.disconnect();
    };
  }, [sidebarCollapsed, language, loadingRoot, roots.length, rootId, showSkillPagination]);

  useEffect(() => {
    setPathHint(text.defaultPath);
    setLogicMapMeta(text.logicMapMeta);
    setEvaluationStatus(text.rulesEvaluationPrompt);
    void initialize();
  }, []);

  useEffect(() => {
    if (!activeProgressRequestId || !generatingMap) return;
    const progressRequestId = activeProgressRequestId;
    let disposed = false;
    let timeoutId: number | undefined;

    async function pollProgress() {
      try {
        const progress = await fetchJson<{ message?: string; status?: string }>(`/api/progress/${encodeURIComponent(progressRequestId)}?language=${language}`);
        if (disposed) return;
        if (progress.message) {
          setEvaluationStatus(progress.message);
        }
        if (progress.status === "completed" || progress.status === "failed") {
          return;
        }
      } catch (error) {
        if (!disposed) {
          console.warn("Unable to poll AI evaluation progress", error);
        }
      }
      if (!disposed) {
        timeoutId = window.setTimeout(pollProgress, 700);
      }
    }

    void pollProgress();
    return () => {
      disposed = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeProgressRequestId, generatingMap, language]);

  useEffect(() => {
    setPage(1);
  }, [skillSearch, rootId]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!settingsOpen) return;
    void loadSettingsModels();
  }, [settingsOpen]);

  async function initialize() {
    try {
      const config = await fetchJson<{ defaultModel?: string }>("/api/config");
      const configuredModel = localStorage.getItem(storageKeys.model) || config.defaultModel || "github-default";
      setModel(configuredModel);
      const rootsResult = await fetchJson<{ roots: SkillRoot[] }>("/api/skill-roots");
      applyRoots(rootsResult.roots || []);
      void loadModels(configuredModel);
      void syncGitHubStatusOnStartup();
      const firstRoot = rootsResult.roots?.[0];
      if (firstRoot) {
        await loadSkillsFromServer(firstRoot);
      } else {
        setPathHint(text.noScannedDirectories);
      }
    } catch (error) {
      notifyError(error);
    }
  }

  function applyRoots(nextRoots: SkillRoot[], preferredId = "") {
    setRoots(nextRoots);
    const nextRoot = nextRoots.find((root) => root.id === preferredId) || nextRoots[0] || null;
    setRootId(nextRoot?.id || "");
  }

  async function loadModels(currentModel: string, options: { live?: boolean; preferDefault?: boolean; showAuthGuide?: boolean } = {}) {
    const result = await fetchJson<ModelsResponse>(`/api/models${options.live ? "?live=1" : ""}`);
    const nextModels = result.models || [];
    setModels(nextModels);
    const hasCurrentModel = nextModels.some((item) => item.id === currentModel);
    const preferredModel = nextModels.some((item) => item.id === "github-default") ? "github-default" : nextModels[0]?.id || "github-default";
    if (!hasCurrentModel || options.preferDefault) {
      setModel(preferredModel);
    }
    if (result.authRequired && options.showAuthGuide !== false) {
      showGitHubAuthGuide({ authHelp: result.authHelp, authCommand: result.authCommand }, text, refreshGitHubStatus);
    } else if (result.source === "fallback" && result.error) {
      toast.warning(result.error);
    }
    return result;
  }

  async function refreshGitHubStatus(showToast = true) {
    const status = await fetchJson<GitHubStatus>(`/api/auth/github/status${showToast ? "?check=1" : ""}`);
    setGitHubStatus(status);
    if (status.ready) {
      toast.dismiss(githubAuthToastId);
    }
    if (showToast) {
      toast(status.authenticated ? `${text.signedIn}: ${status.login || "GitHub"}` : text.notSignedIn);
    }
    return status;
  }

  async function syncGitHubStatusOnStartup() {
    try {
      const status = await fetchJson<GitHubStatus>("/api/auth/github/status?check=1");
      setGitHubStatus(status);
      if (status.ready) {
        toast.dismiss(githubAuthToastId);
      }
    } catch (error) {
      console.warn("Unable to sync GitHub status on startup", error);
    }
  }

  async function loadSettingsModels() {
    if (settingsModelsLoadedRef.current) {
      return;
    }
    const requestId = ++settingsModelsRequestRef.current;
    setLoadingSettingsModels(true);
    try {
      const status = await fetchJson<GitHubStatus>("/api/auth/github/status?check=1");
      if (requestId !== settingsModelsRequestRef.current) {
        return;
      }
      setGitHubStatus(status);
      if (!status.ready) {
        showGitHubAuthGuide(status, text, refreshGitHubStatus);
        return;
      }
      toast.dismiss(githubAuthToastId);
      const result = await loadModels(model, { live: true, preferDefault: model === "gpt-5" });
      if (requestId === settingsModelsRequestRef.current && result.source === "copilot-sdk" && !result.authRequired) {
        settingsModelsLoadedRef.current = true;
      }
    } catch (error) {
      notifyError(error);
    } finally {
      if (requestId === settingsModelsRequestRef.current) {
        setLoadingSettingsModels(false);
      }
    }
  }

  async function startGitHubLogin() {
    try {
      const status = await fetchJson<GitHubStatus>("/api/auth/github/status?check=1");
      setGitHubStatus(status);
      if (status.ready) {
        toast.dismiss(githubAuthToastId);
        toast.success(`${text.signedIn}: ${status.login || "GitHub"}`);
        return;
      }
      showGitHubAuthGuide(status, text, refreshGitHubStatus);
    } catch (error) {
      notifyError(error);
    }
  }

  async function signOutGitHub() {
    try {
      const result = await fetchJson<{ status: GitHubStatus }>("/api/auth/github/logout", { method: "POST" });
      setGitHubStatus(result.status || { authenticated: false });
      toast.success(text.signedOut);
    } catch (error) {
      notifyError(error);
    }
  }

  async function scanDefaultDirectories() {
    setLoadingRoot(true);
    setPathHint(text.scanningDirectories);
    try {
      const currentRootId = rootId;
      const result = await fetchJson<{ found: number; roots: SkillRoot[]; skillIndex?: { roots: number; indexed: number } }>("/api/skill-roots/scan", { method: "POST" });
      applyRoots(result.roots || [], currentRootId);
      toast.success(`${text.scanComplete}: ${result.found || 0}`);
      const nextRoot = result.roots?.find((root) => root.id === currentRootId) || result.roots?.[0];
      if (nextRoot) {
        await loadSkillsFromServer(nextRoot);
      } else {
        setPathHint(text.noScannedDirectories);
      }
    } catch (error) {
      notifyError(error);
    } finally {
      setLoadingRoot(false);
    }
  }

  async function pickLocalDirectory() {
    setLoadingRoot(true);
    setPathHint(text.openingDirectoryPicker);
    try {
      const result = await fetchJson<{ directory: PendingDirectory }>("/api/skill-roots/pick-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language })
      });
      if ((result.directory.skillCount || 0) === 0) {
        toast.error(text.directoryNoSkills);
        setPendingDirectory(null);
        setDirectoryName("");
        setPathHint(selectedRoot ? text.loadedServer : text.defaultPath);
        return;
      }
      setPendingDirectory(result.directory);
      setDirectoryName(result.directory.suggestedLabel || "");
    } catch (error) {
      notifyError(error);
      setPathHint(selectedRoot ? text.loadedServer : text.defaultPath);
    } finally {
      setLoadingRoot(false);
    }
  }

  async function savePendingDirectory() {
    if (!pendingDirectory) {
      return;
    }
    setSavingDirectory(true);
    try {
      const label = directoryName.trim() || pendingDirectory.suggestedLabel || "Custom";
      const result = await fetchJson<{ root: SkillRoot; roots: SkillRoot[] }>("/api/skill-roots/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "server", label, value: pendingDirectory.path, language })
      });
      setPendingDirectory(null);
      applyRoots(result.roots || [], result.root?.id || "");
      toast.success(`${text.directorySaved}: ${label}`);
      await loadSkillsFromServer(result.root);
    } catch (error) {
      notifyError(error);
    } finally {
      setSavingDirectory(false);
    }
  }

  async function deleteSelectedRoot() {
    if (!selectedRoot?.removable) {
      return;
    }
    try {
      const result = await fetchJson<{ roots: SkillRoot[] }>(`/api/skill-roots/${encodeURIComponent(selectedRoot.id)}`, {
        method: "DELETE"
      });
      applyRoots(result.roots || []);
      const fallback = result.roots?.[0];
      if (fallback) {
        await loadSkillsFromServer(fallback);
      } else {
        setSkills([]);
        setSelectedSkill(null);
        setSelectedName("");
        setSkillTranslation(null);
        setSkillDocMode("original");
        setPathHint(text.noScannedDirectories);
      }
    } catch (error) {
      notifyError(error);
    }
  }

  async function handleRootChange(id: string) {
    const root = roots.find((item) => item.id === id);
    setRootId(id);
    if (root) {
      await loadSkillsFromServer(root);
    }
  }

  function showRootOverview() {
    setSelectedSkill(null);
    setSelectedName("");
    setSelectedNode(null);
    setLoadingSkill(false);
    setSkillTranslation(null);
    setSkillDocMode("original");
    setLogicMapMeta(text.logicMapMeta);
    setEvaluationStatus(text.rulesEvaluationPrompt);
  }

  async function loadSkillsFromServer(root: SkillRoot) {
    setLoadingRoot(true);
    setPathHint(text.readingRoot);
    try {
      const result = await fetchJson<{ root: string; skills: SkillListItem[] }>(`/api/skills?root=${encodeURIComponent(root.value || "")}&language=${language}`);
      setSkills(result.skills || []);
      setSelectedSkill(null);
      setSelectedName("");
      setSelectedNode(null);
      setSkillTranslation(null);
      setSkillDocMode("original");
      setPathHint(text.loadedServer);
      toast.success(`${text.skills}: ${result.skills.length}`);
    } catch (error) {
      notifyError(error);
    } finally {
      setLoadingRoot(false);
    }
  }

  async function selectSkill(skillName: string, skillPath = "") {
    if (!selectedRoot) {
      return;
    }
    setSelectedName(skillPath || skillName);
    setLoadingSkill(true);
    setSelectedNode(null);
    setSkillDocCollapsed(true);
    setSkillTranslation(null);
    setSkillDocMode("original");
    setLogicMapMeta(text.rulesAnalysis);
    setEvaluationStatus(text.rulesEvaluationPrompt);
    try {
      const pathQuery = skillPath ? `&path=${encodeURIComponent(skillPath)}` : "";
      const result = await fetchJson<{ skill: SkillDetail }>(
        `/api/skills/${encodeURIComponent(skillName)}?root=${encodeURIComponent(selectedRoot.value)}&language=${language}${pathQuery}`
      );
      setSelectedSkill(result.skill);
      setSelectedNode(result.skill.analysis.graph?.nodes?.[0] || null);
      await loadCachedLogicMap(result.skill);
    } catch (error) {
      notifyError(error);
    } finally {
      setLoadingSkill(false);
    }
  }

  async function loadCachedLogicMap(skill: SkillDetail) {
    const requestId = ++mapRequestRef.current;
    setLogicMapMeta(text.checkingCache);
    try {
      const result = await fetchJson<{ cached: boolean; analysis?: ModelAnalysis }>("/api/logic-map/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLogicMapPayload(skill, model, language))
      });
      if (requestId !== mapRequestRef.current) {
        return;
      }
      if (result.cached && result.analysis) {
        applyModelLogicMap(skill, result.analysis, getModelAnalysisMetaLabel(result.analysis, text));
        return;
      }
      setLogicMapMeta(text.rulesAnalysis);
      setEvaluationStatus(text.rulesEvaluationPrompt);
    } catch (error) {
      if (requestId === mapRequestRef.current) {
        setLogicMapMeta(text.rulesAnalysis);
        setEvaluationStatus(text.rulesEvaluationPrompt);
        notifyError(error);
      }
    }
  }

  async function loadCachedSkillTranslation(skill: SkillDetail) {
    if (!skill.description?.trim()) {
      setSkillTranslation(null);
      setSkillDocMode("original");
      return;
    }
    try {
      const result = await fetchJson<{ cached: boolean; translation?: SkillTranslation }>("/api/skill-translation/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLogicMapPayload(skill, model, language))
      });
      const translation = result.cached && result.translation?.content && !result.translation.skipped ? result.translation : null;
      setSkillTranslation(translation);
      setSkillDocMode(translation ? "translated" : "original");
    } catch (error) {
      setSkillTranslation(null);
      setSkillDocMode("original");
      notifyError(error);
    }
  }

  async function generateSkillTranslation(skill: SkillDetail, showToast = true, progressRequestId?: string) {
    setTranslatingSkillDoc(true);
    try {
      const result = await fetchJson<{ cached: boolean; translation?: SkillTranslation }>("/api/skill-translation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildLogicMapPayload(skill, model, language, progressRequestId))
      });
      const translation = result.translation?.content && !result.translation.skipped ? result.translation : null;
      if (result.translation?.skipped) {
        setSkillTranslation(null);
        setSkillDocMode("original");
        if (showToast) {
          toast.info(text.translationSkipped);
        }
        return result.translation;
      }
      setSkillTranslation(translation);
      if (translation) {
        setSkillDocMode("translated");
        if (showToast) {
          toast.success(result.cached ? text.translationLoaded : text.translationSaved);
        }
      }
      return translation;
    } catch (error) {
      notifyError(error);
      return null;
    } finally {
      setTranslatingSkillDoc(false);
    }
  }

  async function toggleSkillDocMode() {
    if (!selectedSkill) {
      return;
    }
    if (skillDocMode === "translated") {
      setSkillDocMode("original");
      return;
    }
    if (skillTranslation?.content) {
      setSkillDocMode("translated");
      return;
    }
    await generateSkillTranslation(selectedSkill);
  }

  async function refreshSelectedLogicMap() {
    if (!selectedSkill) {
      return;
    }
    const requestOrdinal = ++mapRequestRef.current;
    const progressRequestId = createProgressRequestId();
    let triggeredStandaloneTranslation = false;
    const triggerStandaloneTranslation = () => {
      if (skillTranslation?.content) {
        setSkillDocMode("translated");
        return;
      }
      if (triggeredStandaloneTranslation) {
        return;
      }
      triggeredStandaloneTranslation = true;
      void generateSkillTranslation(selectedSkill, false, progressRequestId);
    };
    if (String(selectedSkill.description || "").length > 12_000) {
      triggerStandaloneTranslation();
    }
    setGeneratingMap(true);
    setActiveProgressRequestId(progressRequestId);
    setLogicMapMeta(text.generatingLogicMap);
    setEvaluationStatus(text.generatingLogicMap);
    try {
      let result: { analysis: ModelAnalysis; translation?: SkillTranslation };
      try {
        result = await requestLogicMapGeneration(selectedSkill, progressRequestId, model);
      } catch (error) {
        if (!shouldRefreshModelsBeforeRetry(error, model)) {
          throw error;
        }
        result = await retryLogicMapWithRefreshedModels(selectedSkill, progressRequestId);
      }
      if (requestOrdinal !== mapRequestRef.current) {
        return;
      }
      applyModelLogicMap(selectedSkill, result.analysis, getModelAnalysisMetaLabel(result.analysis, text));
      if (result.translation?.content && !result.translation.skipped) {
        setSkillTranslation(result.translation);
        setSkillDocMode("translated");
        setTranslatingSkillDoc(false);
      } else if (result.translation?.skipped) {
        setSkillTranslation(null);
        setSkillDocMode("original");
        setTranslatingSkillDoc(false);
      } else {
        triggerStandaloneTranslation();
      }
      toast.success(text.modelAnalysisSaved);
    } catch (error) {
      if (requestOrdinal === mapRequestRef.current) {
        setLogicMapMeta(text.rulesAnalysis);
        setEvaluationStatus(selectedSkill.modelAnalysis ? formatEvaluationStatus(selectedSkill.modelAnalysis, language, text) : text.rulesEvaluationPrompt);
        triggerStandaloneTranslation();
        await promptForGitHubAuth(error);
      }
    } finally {
      if (requestOrdinal === mapRequestRef.current) {
        setGeneratingMap(false);
        setActiveProgressRequestId(null);
      }
    }
  }

  async function requestLogicMapGeneration(skill: SkillDetail, progressRequestId: string, selectedModel: string) {
    return fetchJson<{ analysis: ModelAnalysis; translation?: SkillTranslation }>("/api/logic-map/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildLogicMapPayload(skill, selectedModel, language, progressRequestId))
    });
  }

  async function retryLogicMapWithRefreshedModels(skill: SkillDetail, progressRequestId: string) {
    const liveModelsResult = await loadModels(model, { live: true, showAuthGuide: false });
    const liveModels = liveModelsResult.models || [];
    const retryModel = liveModels.some((item) => item.id === model) ? model : "github-default";
    if (retryModel !== model) {
      setModel(retryModel);
    }
    return requestLogicMapGeneration(skill, progressRequestId, retryModel);
  }

  function shouldRefreshModelsBeforeRetry(error: unknown, selectedModel: string) {
    if (selectedModel === "github-default") {
      return false;
    }
    if (error instanceof ApiRequestError && error.payload.authRequired) {
      return false;
    }
    const message = error instanceof Error ? error.message : String(error);
    return /model|unknown|unsupported|invalid|unavailable|not found|does not exist|not available/i.test(message);
  }

  async function promptForGitHubAuth(error: unknown) {
    if (error instanceof ApiRequestError && error.payload.authRequired) {
      notifyError(error);
      return;
    }
    try {
      const status = await fetchJson<GitHubStatus>("/api/auth/github/status?check=1");
      setGitHubStatus(status);
      if (!status.ready) {
        showGitHubAuthGuide(status, text, refreshGitHubStatus);
        return;
      }
    } catch {
      // Fall back to the original error below.
    }
    notifyError(error);
  }

  function applyModelLogicMap(skill: SkillDetail, modelAnalysis: ModelAnalysis, metaLabel: string) {
    const nextSkill = { ...skill, modelAnalysis };
    setSelectedSkill(nextSkill);
    setSelectedNode(modelAnalysis.graph?.nodes?.[0] || skill.analysis.graph?.nodes?.[0] || null);
    setLogicMapMeta(`${metaLabel} · ${modelAnalysis.model || model}`);
    setEvaluationStatus(formatEvaluationStatus(modelAnalysis, language, text));
  }

  const complexityScore = selectedSkill?.modelAnalysis?.complexity?.score;
  const complexityMeta = selectedSkill?.modelAnalysis?.complexity?.rationale
    ? `${text.modelScore} · ${selectedSkill.modelAnalysis.complexity.rationale}`
    : selectedSkill?.modelAnalysis
      ? text.modelScore
      : text.roiNotEvaluated;
  const roiScore = selectedSkill?.modelAnalysis?.roi?.score;
  const roiMeta = formatRoiMeta(selectedSkill?.modelAnalysis?.roi, text);
  const triggerPrompts = selectedSkill?.modelAnalysis?.activationPhrases?.length
    ? selectedSkill.modelAnalysis.activationPhrases
    : formatRuleActivationPrompts(selectedSkill?.analysis.triggers || []);
  const promptItems = triggerPrompts.map(formatPromptDisplayText).filter(Boolean);
  const skillDocContent = skillDocMode === "translated" && skillTranslation?.content
    ? skillTranslation.content
    : selectedSkill?.description || "";

  async function copyPromptToClipboard(prompt: string) {
    try {
      await copyTextToClipboard(prompt);
      toast.success(text.promptCopied);
    } catch (error) {
      notifyError(error);
    }
  }

  async function copyPathToClipboard(path: string) {
    try {
      await copyTextToClipboard(path);
      toast.success(text.pathCopied);
    } catch (error) {
      notifyError(error);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="app-shell grid min-h-screen min-w-0"
        data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
        data-skill-doc-collapsed={selectedSkill && skillDocCollapsed ? "true" : "false"}
      >
        <aside className={cn(
          "sticky top-0 h-screen min-w-0 overflow-hidden bg-[image:var(--app-side)] text-sidebar-foreground",
          sidebarCollapsed && "bg-background"
        )}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            aria-label={text.expandSidebar}
            title={text.expandSidebar}
            className={cn(
              "flex h-full w-full flex-col items-center gap-2 px-1 py-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              !sidebarCollapsed && "hidden"
            )}
          >
            <PanelLeftOpen className="size-3.5" />
            <span className="font-mono text-[9.5px] font-semibold [writing-mode:vertical-rl]">{text.sidebarRail}</span>
          </button>
          <div ref={sidebarScrollRef} className={cn("h-full overflow-y-auto", sidebarCollapsed && "hidden")} data-sidebar-scroll="true">
            <div className="sidebar-console flex h-full w-full min-w-0 flex-col">
              <div className="sidebar-brand-row">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="sidebar-brand-icon">
                    <BrainCircuit className="size-4" aria-hidden="true" />
                  </div>
                  <h1 className="min-w-0 truncate text-[15px] font-semibold leading-6 tracking-normal text-sidebar-foreground">{text.appTitle}</h1>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSidebarCollapsed(true)}
                  aria-label={text.collapseSidebar}
                  title={text.collapseSidebar}
                  className="sidebar-collapse-button"
                >
                  <PanelLeftClose data-icon="inline-start" />
                </Button>
              </div>

              <div className="sidebar-actions-block">
                <button type="button" className="sidebar-primary-action" onClick={scanDefaultDirectories} disabled={loadingRoot}>
                  <span className="sidebar-primary-icon"><ScanSearch className="size-4" aria-hidden="true" /></span>
                  <span className="min-w-0 truncate">{text.sidebarNewTask}</span>
                </button>

                <div className="sidebar-nav-list" aria-label="Skill console navigation">
                  <div className="sidebar-nav-group">
                    <button
                      type="button"
                      className="sidebar-nav-item is-active"
                      onClick={showRootOverview}
                    >
                      <FolderOpen className="size-4" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{text.skillDirectory}</span>
                      <Badge variant="secondary" className="sidebar-count-badge">{roots.length}</Badge>
                    </button>
                    <div className="sidebar-directory-panel">
                      <Select value={rootId} onValueChange={handleRootChange} disabled={!roots.length || loadingRoot}>
                        <SelectTrigger className="sidebar-select-trigger w-full min-w-0 [&_[data-slot=select-value]]:truncate">
                          <SelectValue placeholder={text.skillDirectory} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {roots.map((root) => (
                              <SelectItem key={root.id} value={root.id}>{root.label}: {root.value}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={pickLocalDirectory} disabled={loadingRoot} className="min-w-0 bg-card/70">
                          <FolderOpen data-icon="inline-start" />
                          {text.chooseDirectory}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={deleteSelectedRoot} disabled={!selectedRoot?.removable || loadingRoot} className="min-w-0">
                          <Trash2 data-icon="inline-start" />
                          {text.deleteDirectory}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sidebar-section flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <div className="sidebar-section-heading">
                  <span>{text.sidebarTaskList}</span>
                  <Badge variant="outline" className="sidebar-count-badge">{filteredSkills.length}</Badge>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input value={skillSearch} onChange={(event) => setSkillSearch(event.target.value)} placeholder={text.searchByName} className="sidebar-search-input pl-8 pr-9" />
                  {skillSearch ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setSkillSearch("")}
                      aria-label={text.clearSearch}
                      title={text.clearSearch}
                    >
                      <X data-icon="inline-start" />
                    </Button>
                  ) : null}
                </div>

                <div ref={skillListRef} className="sidebar-skill-list flex min-h-0 flex-col gap-1.5" role="listbox" aria-label="Available skills">
                  {loadingRoot ? <SkillListSkeleton /> : visibleSkills.length ? visibleSkills.map((skill) => (
                    <button
                      key={skill.path || skill.name}
                      type="button"
                      role="option"
                      aria-selected={(skill.path || skill.name) === selectedName}
                      onClick={() => selectSkill(skill.name, skill.path)}
                      className={cn("sidebar-skill-row", (skill.path || skill.name) === selectedName && "is-selected")}
                    >
                      <span className="sidebar-skill-icon"><BrainCircuit className="size-3.5" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1 truncate font-medium">{skill.name}</span>
                      {skill.hasDescription === false ? <Badge variant="outline" className="sidebar-count-badge">?</Badge> : null}
                    </button>
                  )) : (
                    <div className="sidebar-empty-state">
                      <MessageSquareText className="size-4" aria-hidden="true" />
                      <span>{skills.length ? text.noMatchingSkills : text.noSkills}</span>
                    </div>
                  )}
                </div>

                {showSkillPagination ? (
                  <div ref={skillPaginationRef} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="bg-card/70">
                      <ChevronLeft data-icon="inline-start" />
                      {text.previous}
                    </Button>
                    <span className="font-mono text-xs text-muted-foreground">{page}/{totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="bg-card/70">
                      {text.next}
                      <ChevronRight data-icon="inline-end" />
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="sidebar-account-bar">
                <Button variant="outline" size="icon" className="sidebar-account-icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Light theme" : "Dark theme"}>
                  {theme === "dark" ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
                </Button>
                <div className="relative flex h-9 min-w-0 items-center">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => githubStatus?.authenticated ? setSettingsOpen(true) : startGitHubLogin()}
                    className="sidebar-account-button"
                    aria-label={githubStatus?.authenticated ? text.settings : text.signIn}
                  >
                    {githubStatus?.authenticated ? <GitHubIdentity status={githubStatus} /> : <GitBranch data-icon="inline-start" />}
                    <span className={cn("min-w-0 truncate text-[13px] leading-5", githubStatus?.authenticated ? "max-w-28" : "hidden sm:inline")}>{githubStatus?.authenticated ? githubStatus.login || "GitHub" : text.signIn}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="detail-main">
          <div className="detail-surface">
            {!selectedSkill && !loadingSkill ? (
              <div className="empty-detail-state">
              <Card className="empty-hero-card overflow-hidden border-transparent bg-[image:var(--app-hero)] text-white shadow-[var(--app-shadow)]">
                <CardContent className="empty-hero-grid">
                  <div className="empty-hero-copy">
                    <CardDescription className="font-mono uppercase tracking-normal text-white/80">{text.heroEyebrow}</CardDescription>
                    <CardTitle className="max-w-5xl text-3xl font-semibold tracking-normal md:text-[40px] md:leading-[1.08] xl:text-[46px]">{text.heroTitle}</CardTitle>
                    <p className="max-w-3xl text-sm leading-6 text-white/82">{text.heroBody}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="empty-guide-card overflow-hidden">
                <CardHeader className="empty-guide-header">
                  <CardDescription>{text.emptyEyebrow}</CardDescription>
                  <CardTitle className="max-w-3xl text-2xl leading-tight">{text.emptyTitle}</CardTitle>
                  <CardDescription className="max-w-3xl">{text.emptyBody}</CardDescription>
                </CardHeader>
                <CardContent className="empty-guide-grid">
                  {[
                    { item: text.guideDirectory, Icon: ScanSearch },
                    { item: text.guideSkill, Icon: Target },
                    { item: text.guideGraph, Icon: Network }
                  ].map(({ item, Icon }, index) => (
                    <div key={item} className="empty-guide-item group" data-step={index + 1}>
                      <div className="empty-guide-icon"><Icon /></div>
                      <p>{item}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="empty-flow-card overflow-hidden">
                <CardContent className="empty-flow-stage" aria-hidden="true">
                  <div className="empty-flow-demo">
                    <div className="empty-flow-source">
                      <FolderOpen />
                      <span>Skills/</span>
                    </div>
                    <div className="empty-flow-files">
                      <span><FileText /> SKILL.md</span>
                      <span><FileCode2 /> tools.json</span>
                      <span><FileText /> refs.md</span>
                    </div>
                    <div className="empty-flow-stream" />
                    <div className="empty-flow-graph">
                      <span className="empty-flow-node empty-flow-node-a"><span>INPUT</span><strong>Intent</strong></span>
                      <span className="empty-flow-node empty-flow-node-b"><span>TOOLS</span><strong>Read</strong></span>
                      <span className="empty-flow-node empty-flow-node-c"><span>FLOW</span><strong>Graph</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ) : loadingSkill ? (
              <DetailSkeleton />
            ) : selectedSkill ? (
              <div className="detail-stack">
              <div className="detail-overview-grid">
                <Card>
                  <CardHeader>
                    <div className="skill-path-row">
                      <CardDescription className="skill-path-text font-mono" title={selectedSkill.path}>{selectedSkill.path}</CardDescription>
                      <Button type="button" variant="ghost" size="icon-sm" className="skill-path-copy" aria-label={text.copyPath} title={text.copyPath} onClick={() => copyPathToClipboard(selectedSkill.path)}>
                        <Copy data-icon="inline-start" />
                      </Button>
                    </div>
                    <SectionTitle icon={BrainCircuit} tone="input" className="text-2xl tracking-normal">{selectedSkill.name}</SectionTitle>
                    <CardDescription className="text-[13px] leading-5">{selectedSkill.modelAnalysis?.summary || selectedSkill.analysis.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <Button onClick={refreshSelectedLogicMap} disabled={generatingMap}>
                      {generatingMap ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <WandSparkles data-icon="inline-start" />}
                      {generatingMap ? text.generatingLogicMap : text.refreshLogicMap}
                    </Button>
                    <span className="text-xs text-muted-foreground" aria-live="polite">{evaluationProgressText}</span>
                  </CardContent>
                </Card>
                <ScoreCard label={text.complexity} score={complexityScore} meta={complexityMeta} icon={BrainCircuit} scale="risk" />
                <ScoreCard label={text.roi} score={roiScore} meta={roiMeta} icon={Sparkles} scale="benefit" tooltipAlign="end" />
              </div>

              <div className="detail-pair-grid">
                <Card className="model-insight-card">
                  <CardHeader>
                    <SectionTitle icon={Sparkles} tone="model">{text.modelInsight}</SectionTitle>
                    <CardDescription>{selectedSkill.modelAnalysis ? `${getModelAnalysisMetaLabel(selectedSkill.modelAnalysis, text)} · ${selectedSkill.modelAnalysis.model || model}` : text.rulesAnalysis}</CardDescription>
                  </CardHeader>
                  <CardContent className="model-insight-content">
                    <ScrollArea className="model-insight-scroll rounded-lg border bg-muted/20 p-3">
                      <p className="whitespace-pre-wrap text-sm leading-6">{selectedSkill.modelAnalysis?.insight || text.noCachedModelAnalysis}</p>
                      <ScrollBar />
                    </ScrollArea>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <SectionTitle icon={MessageSquareText} tone="input">{text.activationPhrases}</SectionTitle>
                    <CardDescription>{text.activationMeta}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {promptItems.length ? promptItems.map((prompt) => (
                      <div key={prompt} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
                        <p className="whitespace-normal break-words text-sm leading-6 text-card-foreground">{prompt}</p>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={text.copyPrompt} title={text.copyPrompt} onClick={() => copyPromptToClipboard(prompt)}>
                          <Copy data-icon="inline-start" />
                        </Button>
                      </div>
                    )) : <span className="text-sm text-muted-foreground">{text.noTriggers}</span>}
                  </CardContent>
                </Card>
              </div>

              <div className="detail-graph-grid">
                <Card>
                  <CardHeader>
                    <SectionTitle icon={Network} tone="method">{text.logicMap}</SectionTitle>
                    <CardDescription>{logicMapMeta}</CardDescription>
                    <CardAction><Badge variant="outline">{graph.nodes.length} {text.nodes} · {graph.edges.length} {text.edges}</Badge></CardAction>
                  </CardHeader>
                  <CardContent>
                    <GraphCanvas graph={graph} selectedNode={selectedNode} onSelectNode={setSelectedNode} hint={text.flowHint} labels={{ zoomIn: text.zoomIn, zoomOut: text.zoomOut, resetZoom: text.resetZoom }} />
                  </CardContent>
                </Card>

                <Card className="min-w-0 xl:sticky xl:top-20 xl:self-start">
                  <CardHeader>
                    <SectionTitle icon={getGraphNodeIcon(selectedNode?.type)} tone={getGraphNodeTone(selectedNode?.type)}>{selectedNode?.title || text.nodeDetail}</SectionTitle>
                    <CardDescription>{selectedNode?.type || text.selectNode}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm leading-6 text-muted-foreground">{selectedNode?.detail || text.nodeDetailEmpty}</p>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      {(selectedNode?.evidence?.length ? selectedNode.evidence : [text.nodeDetailEmpty]).map((item) => (
                        <div key={item} className="rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-5 text-muted-foreground">
                          <span className="text-fade-overflow">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="detail-triple-grid">
                <Card>
                  <CardHeader>
                    <SectionTitle icon={Wrench} tone="tool">{text.toolStack}</SectionTitle>
                    <CardDescription>{text.toolStackMeta}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="triple-card-scroll rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-wrap gap-2 pr-2">
                        {selectedSkill.analysis.tools.length ? selectedSkill.analysis.tools.map((tool) => <Badge key={`${tool.name}-${tool.role}`} variant="outline"><span className="font-semibold">{tool.name}</span> · {localizeToolRole(tool, language)}</Badge>) : <span className="text-sm text-muted-foreground">{text.noTools}</span>}
                      </div>
                      <ScrollBar />
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <SectionTitle icon={Route} tone="method">{text.runMethods}</SectionTitle>
                    <CardDescription>{text.runMethodsMeta}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="triple-card-scroll rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-col gap-2 pr-2">
                        {selectedSkill.analysis.methods?.length ? selectedSkill.analysis.methods.slice(0, 10).map((method, index) => (
                          <div key={method.id || index} className="rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-5">
                            <span className="text-fade-overflow">{method.label || method.detail}</span>
                          </div>
                        )) : <span className="text-sm text-muted-foreground">{text.nodeDetailEmpty}</span>}
                      </div>
                      <ScrollBar />
                    </ScrollArea>
                  </CardContent>
                </Card>

              </div>

              </div>
            ) : null}
          </div>
        </main>

        {selectedSkill ? (
          <SkillDocPanel
            collapsed={skillDocCollapsed}
            onCollapsedChange={setSkillDocCollapsed}
            selectedSkill={selectedSkill}
            content={skillDocContent}
            mode={skillDocMode}
            hasTranslation={Boolean(skillTranslation?.content)}
            translating={translatingSkillDoc}
            onToggleMode={toggleSkillDocMode}
            text={text}
          />
        ) : null}
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent onInteractOutside={(event) => preventDialogCloseFromSelectPortal(event)}>
          <DialogHeader>
            <DialogTitle>{text.settings}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium"><Languages className="size-4" />{text.displayLanguage}</label>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm font-medium"><BrainCircuit className="size-4" />{text.defaultModel}</label>
              <Select value={model} onValueChange={setModel} disabled={loadingSettingsModels}>
                <SelectTrigger className="w-full">
                  {loadingSettingsModels ? <span className="truncate text-muted-foreground">{text.loadingModels}</span> : <SelectValue />}
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {models.map((item) => <SelectItem key={item.id} value={item.id}>{item.name || item.id}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {loadingSettingsModels ? <p className="text-xs text-muted-foreground">{text.loadingModels}</p> : null}
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              {githubStatus?.authenticated ? (
                <>
                  <GitHubIdentity status={githubStatus} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">GitHub</p>
                    <p className="truncate font-medium text-foreground">{githubStatus.login || "GitHub"}</p>
                  </div>
                  <Button type="button" variant="ghost" className="ml-auto shrink-0 gap-2 text-destructive hover:text-destructive" onClick={signOutGitHub}>
                    <LogOut data-icon="inline-start" />
                    {text.signOut}
                  </Button>
                </>
              ) : text.notSignedIn}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsOpen(false)}>{text.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDirectory)} onOpenChange={(open) => !open && setPendingDirectory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.directoryConfirmTitle}</DialogTitle>
            <DialogDescription>{text.directoryConfirmEyebrow}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="break-all font-mono text-xs text-muted-foreground">{pendingDirectory?.path}</p>
              <p className="mt-2 text-sm font-medium">{pendingDirectory?.message}</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{text.directoryNameLabel}</label>
              <Input value={directoryName} onChange={(event) => setDirectoryName(event.target.value)} autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDirectory(null)}>{text.cancel}</Button>
            <Button onClick={savePendingDirectory} disabled={savingDirectory}>{text.saveDirectory}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors position="bottom-right" expand gap={12} visibleToasts={6} />
    </div>
  );
}

function SkillDocPanel({
  collapsed,
  onCollapsedChange,
  selectedSkill,
  content,
  mode,
  hasTranslation,
  translating,
  onToggleMode,
  text
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  selectedSkill: SkillDetail | null;
  content: string;
  mode: "original" | "translated";
  hasTranslation: boolean;
  translating: boolean;
  onToggleMode: () => void;
  text: Record<string, string>;
}) {
  const [activeTab, setActiveTab] = useState<"skill" | "files">("skill");
  useEffect(() => {
    setActiveTab("skill");
  }, [selectedSkill?.name]);

  const fileStats = selectedSkill?.analysis.fileStats;

  return (
    <aside className={cn("skill-doc-panel", collapsed && "is-collapsed")} aria-label={text.skillDocTitle}>
      {collapsed ? (
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          aria-label={text.expandSkillDoc}
          title={text.expandSkillDoc}
          className="skill-doc-rail"
        >
          <PanelRightOpen className="size-3.5" />
          <span className="font-mono text-[9.5px] font-semibold [writing-mode:vertical-rl]">{text.skillDocRail}</span>
        </button>
      ) : null}

      {!collapsed ? (
        <Card className="skill-doc-card flex h-full min-w-0 overflow-hidden shadow-[var(--app-shadow)]">
          <CardHeader className="border-b bg-card/95">
            <SectionTitle icon={FileText} tone="document">{text.skillDocTitle}</SectionTitle>
            <div className="skill-doc-tabs" role="tablist" aria-label={text.skillDocTitle}>
              <button type="button" role="tab" aria-selected={activeTab === "skill"} className="skill-doc-tab" onClick={() => setActiveTab("skill")}>
                {text.skillDocTab}
              </button>
              <button type="button" role="tab" aria-selected={activeTab === "files"} className="skill-doc-tab" onClick={() => setActiveTab("files")}>
                {text.fileDirectoryTab}
              </button>
            </div>
            <CardAction className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={() => onCollapsedChange(true)} aria-label={text.collapseSkillDoc} title={text.collapseSkillDoc}>
                <PanelRightClose data-icon="inline-start" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 px-3 pb-3 pt-[2px]">
            {activeTab === "skill" ? (
              <div className="skill-doc-tab-panel" role="tabpanel">
                <div className="skill-doc-reader-toolbar">
                  <Button type="button" variant="outline" size="sm" onClick={onToggleMode} disabled={!selectedSkill || translating || (!content && !hasTranslation)}>
                    {translating ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Languages data-icon="inline-start" />}
                    {translating ? text.translatingSkillDoc : mode === "translated" ? text.showOriginalSkillDoc : text.translateSkillDoc}
                  </Button>
                </div>
                <div className="skill-doc-reader rounded-lg border bg-muted/20">
                  <ScrollArea className="skill-doc-scroll">
                    <div className="px-4 py-4">
                      {content ? <MarkdownContent content={content} /> : <p className="text-sm text-muted-foreground">{text.translationUnavailable}</p>}
                    </div>
                    <ScrollBar />
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="skill-doc-tab-panel" role="tabpanel">
                <div className="skill-doc-file-summary rounded-lg border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  {fileStats ? `${fileStats.files} ${text.files} · ${fileStats.directories} ${text.folders}` : text.noFiles}
                </div>
                <div className="skill-doc-reader rounded-lg border bg-muted/20">
                  <ScrollArea className="skill-doc-scroll">
                    <SkillFileDirectory files={selectedSkill?.files || []} emptyLabel={text.noFiles} />
                    <ScrollBar />
                  </ScrollArea>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </aside>
  );
}

function SkillFileDirectory({ files, emptyLabel }: { files: SkillFile[]; emptyLabel: string }) {
  const tree = useMemo(() => buildSkillFileTree(files.slice(0, 220)), [files]);
  const defaultExpanded = useMemo(() => collectDefaultExpandedPaths(tree), [tree]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(defaultExpanded);

  useEffect(() => {
    setExpandedPaths(defaultExpanded);
  }, [defaultExpanded]);

  if (!files.length) {
    return <p className="p-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const setDirectoryOpen = (path: string, open: boolean) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (open) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  };

  return (
    <div className="skill-file-tree text-xs">
      {tree.map((node) => (
        <SkillFileTreeNodeView key={node.path} node={node} depth={0} expandedPaths={expandedPaths} onOpenChange={setDirectoryOpen} />
      ))}
    </div>
  );
}

function SkillFileTreeNodeView({ node, depth, expandedPaths, onOpenChange }: { node: SkillFileTreeNode; depth: number; expandedPaths: Set<string>; onOpenChange: (path: string, open: boolean) => void }) {
  const isDirectory = node.type === "directory";
  const isExpanded = expandedPaths.has(node.path);
  const FileNodeIcon = getSkillFileIcon(node.path);
  const FolderIcon = isExpanded ? FolderOpen : Folder;
  const rowStyle = { paddingLeft: `${0.75 + Math.min(depth, 9) * 0.875}rem` } as CSSProperties;

  return (
    <div className="skill-file-node">
      {isDirectory ? (
        <Collapsible open={isExpanded} onOpenChange={(open) => onOpenChange(node.path, open)}>
          <CollapsibleTrigger className="skill-file-row skill-file-directory" style={rowStyle} title={node.path}>
            <ChevronDown className={cn("skill-file-chevron", !isExpanded && "-rotate-90")} />
            <FolderIcon className={cn("skill-file-icon", isExpanded ? "text-primary" : "text-chart-2")} />
            <span className="skill-file-name text-fade-overflow">{node.name}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="skill-file-children">
            {node.children.map((child) => (
              <SkillFileTreeNodeView key={child.path} node={child} depth={depth + 1} expandedPaths={expandedPaths} onOpenChange={onOpenChange} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="skill-file-row" style={rowStyle} title={node.path}>
          <span className="skill-file-spacer" />
          <FileNodeIcon className={cn("skill-file-icon", getSkillFileIconTone(node.path))} />
          <span className="skill-file-name text-fade-overflow">{node.name}</span>
        </div>
      )}
    </div>
  );
}

function buildSkillFileTree(files: SkillFile[]) {
  const root: SkillFileTreeNode = { name: "", path: "", type: "directory", children: [] };
  const nodeMap = new Map<string, SkillFileTreeNode>([["", root]]);

  for (const file of files) {
    const parts = file.path.split("/").map((part) => part.trim()).filter(Boolean);
    let parent = root;
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = index === parts.length - 1;
      const type = isLeaf ? file.type : "directory";
      let node = nodeMap.get(currentPath);
      if (!node) {
        node = { name: part, path: currentPath, type, children: [] };
        nodeMap.set(currentPath, node);
        parent.children.push(node);
      } else if (type === "directory") {
        node.type = "directory";
      }
      parent = node;
    });
  }

  sortSkillFileTree(root.children);
  return root.children;
}

function sortSkillFileTree(nodes: SkillFileTreeNode[]) {
  nodes.sort((first, second) => {
    if (first.type !== second.type) {
      return first.type === "directory" ? -1 : 1;
    }
    return first.name.localeCompare(second.name, undefined, { numeric: true, sensitivity: "base" });
  });
  nodes.forEach((node) => sortSkillFileTree(node.children));
}

function collectDefaultExpandedPaths(nodes: SkillFileTreeNode[], depth = 0) {
  const expanded = new Set<string>();
  for (const node of nodes) {
    if (node.type !== "directory") continue;
    if (depth <= 1) {
      expanded.add(node.path);
    }
    for (const childPath of collectDefaultExpandedPaths(node.children, depth + 1)) {
      expanded.add(childPath);
    }
  }
  return expanded;
}

function getSkillFileIcon(path: string): LucideIcon {
  const extension = path.split(".").pop()?.toLowerCase();
  if (["md", "mdx", "txt", "rst"].includes(extension || "")) return FileText;
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs", "css", "html", "json", "yaml", "yml", "py", "java", "cs", "go", "rs", "sh"].includes(extension || "")) return FileCode2;
  if (["sqlite", "db", "sql", "csv"].includes(extension || "")) return Database;
  return FileIcon;
}

function getSkillFileIconTone(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (["md", "mdx"].includes(extension || "")) return "text-primary";
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(extension || "")) return "text-chart-3";
  if (["json", "yaml", "yml"].includes(extension || "")) return "text-chart-5";
  if (["css", "html"].includes(extension || "")) return "text-chart-4";
  return "text-muted-foreground";
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);
  return (
    <div className="markdown-content">
      {blocks.map((block, index) => renderMarkdownBlock(block, index))}
    </div>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language: string; text: string }
  | { type: "quote"; text: string }
  | { type: "rule" }
  | { type: "frontmatter"; text: string }
  | { type: "table"; rows: string[][] };

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, lineIndex) => lineIndex > 0 && line.trim() === "---");
    if (end > 0) {
      blocks.push({ type: "frontmatter", text: lines.slice(0, end + 1).join("\n") });
      index = end + 1;
    }
  }

  while (index < lines.length) {
    const line = lines[index] || "";
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```(.*)$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", language: fence[1]?.trim() || "text", text: codeLines.join("\n") });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    if (/^\|.+\|$/.test(trimmed)) {
      const rows: string[][] = [];
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        const cells = lines[index].trim().slice(1, -1).split("|").map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
          rows.push(cells);
        }
        index += 1;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    const listMatch = trimmed.match(/^([-*+] |\d+[.)] )(.+)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^([-*+] |\d+[.)] )(.+)$/);
        if (!item) break;
        items.push(item[2].trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index] || "";
      const currentTrimmed = current.trim();
      if (!currentTrimmed || /^```/.test(currentTrimmed) || /^(#{1,6})\s+/.test(currentTrimmed) || /^[-*_]{3,}$/.test(currentTrimmed) || currentTrimmed.startsWith(">") || /^\|.+\|$/.test(currentTrimmed) || /^([-*+] |\d+[.)] )/.test(currentTrimmed)) {
        break;
      }
      paragraphLines.push(currentTrimmed);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderMarkdownBlock(block: MarkdownBlock, index: number) {
  switch (block.type) {
    case "heading": {
      const children = renderInlineMarkdown(block.text);
      if (block.level === 1) return <h1 key={index}>{children}</h1>;
      if (block.level === 2) return <h2 key={index}>{children}</h2>;
      if (block.level === 3) return <h3 key={index}>{children}</h3>;
      return <h4 key={index}>{children}</h4>;
    }
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return <List key={index}>{block.items.map((item) => <li key={item}>{renderInlineMarkdown(item)}</li>)}</List>;
    }
    case "code":
      return <pre key={index}><code>{block.text}</code></pre>;
    case "quote":
      return <blockquote key={index}>{renderInlineMarkdown(block.text)}</blockquote>;
    case "frontmatter":
      return <pre key={index} className="markdown-frontmatter"><code>{block.text}</code></pre>;
    case "table":
      return (
        <div key={index} className="markdown-table-wrap">
          <table>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join("|")}`}>
                  {row.map((cell, cellIndex) => rowIndex === 0
                    ? <th key={`${cellIndex}-${cell}`}>{renderInlineMarkdown(cell)}</th>
                    : <td key={`${cellIndex}-${cell}`}>{renderInlineMarkdown(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "rule":
      return <Separator key={index} />;
    case "paragraph":
    default:
      return <p key={index}>{renderInlineMarkdown(block.text)}</p>;
  }
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  String(value || "").replace(pattern, (match, _group, offset) => {
    if (offset > lastIndex) {
      nodes.push(value.slice(lastIndex, offset));
    }
    if (match.startsWith("**")) {
      nodes.push(<strong key={`${match}-${offset}`}>{match.slice(2, -2)}</strong>);
    } else if (match.startsWith("`")) {
      nodes.push(<code key={`${match}-${offset}`}>{match.slice(1, -1)}</code>);
    } else {
      const link = match.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      nodes.push(<a key={`${match}-${offset}`} href={link?.[2] || "#"} target="_blank" rel="noreferrer">{link?.[1] || match}</a>);
    }
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }
  return nodes.length ? nodes : [value];
}

function GraphCanvas({ graph, selectedNode, onSelectNode, hint, labels }: { graph: LogicGraph; selectedNode: GraphNode | null; onSelectNode: (node: GraphNode) => void; hint: string; labels: { zoomIn: string; zoomOut: string; resetZoom: string } }) {
  const compactGraph = useMemo(() => compactLayoutGraph(graph), [graph]);
  const [zoom, setZoom] = useState(1);
  const [autoZoom, setAutoZoom] = useState(true);
  const graphFrameRef = useRef<HTMLDivElement | null>(null);
  const nodeMap = new Map(compactGraph.nodes.map((node) => [node.id, node]));
  const nodeWidth = 128;
  const nodeHeight = 126;
  const width = compactGraph.width ?? 760;
  const height = compactGraph.height ?? 360;
  const contentRight = getGraphContentRight(compactGraph.nodes, nodeWidth);
  const scaledWidth = Math.round(width * zoom);
  const scaledHeight = Math.round(height * zoom);
  const zoomPercent = Math.round(zoom * 100);
  const zoomOutDisabled = zoom <= graphMinZoom;
  const zoomInDisabled = zoom >= graphMaxZoom;

  const zoomOut = () => {
    setAutoZoom(false);
    setZoom((current) => clampGraphZoom(current - 0.1));
  };
  const zoomIn = () => {
    setAutoZoom(false);
    setZoom((current) => clampGraphZoom(current + 0.1));
  };
  const resetZoom = () => {
    setAutoZoom(true);
    setZoom(calculateGraphAutoZoom(graphFrameRef.current?.clientWidth || 0, contentRight));
  };

  useEffect(() => {
    setAutoZoom(true);
  }, [graph]);

  useEffect(() => {
    if (!autoZoom) return;
    const frame = graphFrameRef.current;
    if (!frame) return;

    let animationFrame = 0;
    const updateZoom = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        setZoom(calculateGraphAutoZoom(frame.clientWidth, contentRight));
      });
    };

    updateZoom();
    const resizeObserver = new ResizeObserver(updateZoom);
    resizeObserver.observe(frame);
    window.addEventListener("resize", updateZoom);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateZoom);
    };
  }, [autoZoom, contentRight]);

  return (
    <div className="rounded-lg border bg-muted/20">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2 font-mono text-xs text-muted-foreground">
        <span>{graph.nodes.length} nodes · {graph.edges.length} edges</span>
        <span className="hidden sm:inline">{hint}</span>
      </div>
      <div ref={graphFrameRef} className="relative">
        <ScrollArea className="h-[clamp(24rem,58vh,34rem)] w-full max-w-full overflow-hidden" data-graph-scroll="true">
          <div className="relative max-w-none" style={{ width: scaledWidth, height: scaledHeight }}>
            <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${zoom})` }}>
              <svg className="absolute inset-0" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
                <defs>
                  <marker id="arrowhead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                    <path d="M2,2 L10,6 L2,10 Z" className="fill-primary/70" />
                  </marker>
                </defs>
                {compactGraph.edges.map((edge, index) => {
                  const source = nodeMap.get(edge.source);
                  const target = nodeMap.get(edge.target);
                  if (!source || !target) {
                    return null;
                  }
                  const startX = source.x + nodeWidth;
                  const startY = source.y + nodeHeight / 2;
                  const endX = target.x;
                  const endY = target.y + nodeHeight / 2;
                  const curve = Math.max(42, Math.min(86, Math.abs(endX - startX) / 2));
                  const edgeLabel = fitGraphEdgeText(edge.label, Math.abs(endX - startX));
                  return (
                    <g key={`${edge.source}-${edge.target}-${index}`}>
                      <path
                        d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
                        markerEnd="url(#arrowhead)"
                        className="fill-none stroke-primary/50"
                        strokeWidth="2"
                      />
                      {edgeLabel ? (
                        <text x={(startX + endX) / 2} y={(startY + endY) / 2 - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">
                          {edgeLabel}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
              {compactGraph.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSelectNode(node)}
                  title={`${node.title}\n${node.detail}`}
                  className={cn(
                    "absolute flex h-[7.875rem] w-32 flex-col gap-1.5 rounded-lg border bg-card p-2.5 text-left text-card-foreground shadow-sm transition-colors hover:bg-accent",
                    selectedNode?.id === node.id && "border-primary ring-2 ring-ring/30",
                    node.type === "decision" && "border-[color:var(--chart-c)] bg-[color-mix(in_srgb,var(--chart-c)_8%,var(--card))]",
                    node.type === "tool" && "border-[color:var(--decline)] bg-[color-mix(in_srgb,var(--decline)_8%,var(--card))]",
                    node.type === "method" && "border-[color:var(--chart-b)] bg-[color-mix(in_srgb,var(--chart-b)_8%,var(--card))]"
                  )}
                  style={{ left: node.x, top: node.y }}
                >
                  <span className="graph-node-text graph-node-type font-mono text-[9px] font-semibold uppercase text-muted-foreground">{node.type}</span>
                  <span className="graph-node-text graph-node-title text-sm font-semibold leading-5">{node.title}</span>
                  <span className="graph-node-text graph-node-detail text-xs leading-4 text-muted-foreground">{node.detail}</span>
                </button>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar />
        </ScrollArea>
        <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur">
          <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.zoomOut} title={labels.zoomOut} onClick={zoomOut} disabled={zoomOutDisabled}>
            <ZoomOut data-icon="inline-start" />
          </Button>
          <span className="min-w-11 text-center font-mono text-xs text-muted-foreground tabular-nums">{zoomPercent}%</span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.zoomIn} title={labels.zoomIn} onClick={zoomIn} disabled={zoomInDisabled}>
            <ZoomIn data-icon="inline-start" />
          </Button>
          <Separator orientation="vertical" className="mx-0.5 h-5" />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.resetZoom} title={labels.resetZoom} onClick={resetZoom} disabled={autoZoom}>
            <RotateCcw data-icon="inline-start" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function clampGraphZoom(value: number, maxZoom = graphMaxZoom) {
  return Math.min(maxZoom, Math.max(graphMinZoom, Number(value.toFixed(2))));
}

function calculateGraphAutoZoom(containerWidth: number, contentRight: number) {
  if (!containerWidth || !contentRight) {
    return 1;
  }
  const availableWidth = Math.max(0, containerWidth - graphAutoZoomRightPadding);
  const targetZoom = availableWidth / contentRight;
  const steppedZoom = Math.floor(targetZoom / graphAutoZoomStep) * graphAutoZoomStep;
  return Math.min(graphMaxAutoZoom, Math.max(graphMinAutoZoom, Number(steppedZoom.toFixed(2))));
}

function getGraphContentRight(nodes: GraphNode[], nodeWidth: number) {
  if (!nodes.length) {
    return 0;
  }
  return Math.max(...nodes.map((node) => (Number(node.x) || 0) + nodeWidth));
}

function compactLayoutGraph(graph: LogicGraph): LogicGraph {
  const nodes = graph.nodes || [];
  if (!nodes.length) {
    return { nodes: [], edges: graph.edges || [], width: 760, height: 360 };
  }
  const nodeHeight = 126;
  const minimumVerticalGap = 96;
  const rowGap = nodeHeight + minimumVerticalGap;
  const leftPadding = 48;
  const topPadding = 54;
  const nodeWidth = 128;
  const uniqueX = Array.from(new Set(nodes.map((node) => Math.round(Number(node.x) || 0)))).sort((a, b) => a - b);
  const columnByX = new Map(uniqueX.map((x, index) => [x, index]));
  const columnByNodeId = new Map(nodes.map((node, index) => {
    const originalX = Math.round(Number(node.x) || 0);
    return [node.id, columnByX.get(originalX) ?? index];
  }));
  const columnOffsets = calculateGraphColumnOffsets(graph.edges || [], columnByNodeId, uniqueX.length, nodeWidth, leftPadding);
  const rowsByColumn = new Map<number, number>();
  const compactNodes = nodes.map((node, index) => {
    const originalX = Math.round(Number(node.x) || 0);
    const column = columnByX.get(originalX) ?? index;
    const row = rowsByColumn.get(column) || 0;
    rowsByColumn.set(column, row + 1);
    return {
      ...node,
      x: columnOffsets[column] ?? leftPadding,
      y: topPadding + row * rowGap
    };
  });
  return {
    nodes: compactNodes,
    edges: graph.edges || [],
    width: Math.max(...compactNodes.map((node) => node.x), 560) + 170,
    height: Math.max(...compactNodes.map((node) => node.y), 320) + nodeHeight + minimumVerticalGap
  };
}

function calculateGraphColumnOffsets(edges: GraphEdge[], columnByNodeId: Map<string, number>, columnCount: number, nodeWidth: number, leftPadding: number) {
  const baseGap = nodeWidth + estimateGraphLabelWidth("中中中中中");
  const columnGaps = Array.from({ length: Math.max(0, columnCount - 1) }, () => baseGap);

  edges.forEach((edge) => {
    const sourceColumn = columnByNodeId.get(edge.source);
    const targetColumn = columnByNodeId.get(edge.target);
    if (sourceColumn === undefined || targetColumn === undefined || sourceColumn === targetColumn) return;
    const from = Math.min(sourceColumn, targetColumn);
    const to = Math.max(sourceColumn, targetColumn);
    const span = to - from;
    const requiredGap = nodeWidth + estimateGraphLabelWidth(edge.label);
    const perColumnGap = Math.ceil(requiredGap / span);
    for (let column = from; column < to; column += 1) {
      columnGaps[column] = Math.max(columnGaps[column] || baseGap, perColumnGap);
    }
  });

  return Array.from({ length: columnCount }, (_, column) => {
    if (column === 0) return leftPadding;
    return leftPadding + columnGaps.slice(0, column).reduce((sum, gap) => sum + gap, 0);
  });
}

function estimateGraphLabelWidth(value: unknown) {
  const text = String(value || "").replace(/\s+/g, "").trim();
  const visualUnits = Math.max(5, Array.from(text).reduce((sum, character) => sum + (/[^\x00-\xff]/.test(character) ? 1 : 0.58), 0));
  return Math.ceil(visualUnits * 13 + 28);
}

function fitGraphEdgeText(value: unknown, availableWidth: number) {
  const text = String(value || "").replace(/\s+/g, "").trim();
  if (!text) return "";
  const unitsThatFit = Math.max(5, Math.floor((availableWidth - 28) / 13));
  if (estimateGraphLabelWidth(text) <= availableWidth) return text;
  return text.slice(0, Math.max(1, unitsThatFit));
}

type SectionTone = "input" | "decision" | "method" | "tool" | "document" | "model";

function SectionTitle({ children, icon, tone, className }: { children: ReactNode; icon: LucideIcon; tone: SectionTone; className?: string }) {
  return (
    <CardTitle className={cn("flex min-w-0 items-center gap-2", className)}>
      <SectionIcon icon={icon} tone={tone} />
      <span className="min-w-0 truncate">{children}</span>
    </CardTitle>
  );
}

function SectionIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: SectionTone }) {
  const toneClass = {
    input: "border-primary/45 bg-primary/10 text-primary",
    decision: "border-[color:var(--chart-c)] bg-[color-mix(in_srgb,var(--chart-c)_10%,var(--card))] text-[color:var(--chart-c)]",
    method: "border-[color:var(--chart-b)] bg-[color-mix(in_srgb,var(--chart-b)_12%,var(--card))] text-[color:var(--chart-b)]",
    tool: "border-[color:var(--decline)] bg-[color-mix(in_srgb,var(--decline)_12%,var(--card))] text-[color:var(--decline)]",
    document: "border-[color:var(--chart-a)] bg-[color-mix(in_srgb,var(--chart-a)_10%,var(--card))] text-[color:var(--chart-a)]",
    model: "border-[color:var(--chart-c)] bg-[color-mix(in_srgb,var(--chart-c)_10%,var(--card))] text-[color:var(--chart-c)]"
  }[tone];

  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border", toneClass)}>
      <Icon className="size-3.5" aria-hidden="true" />
    </span>
  );
}

function getGraphNodeTone(type?: string): SectionTone {
  if (type === "decision") return "decision";
  if (type === "tool") return "tool";
  if (type === "method") return "method";
  if (type === "document" || type === "files" || type === "output") return "document";
  return "input";
}

function getGraphNodeIcon(type?: string): LucideIcon {
  if (type === "decision") return Target;
  if (type === "tool") return Wrench;
  if (type === "method") return Route;
  if (type === "document" || type === "files" || type === "output") return FileText;
  return MessageSquareText;
}

function ScoreCard({ label, score, meta, icon: Icon, scale, tooltipAlign = "center" }: { label: string; score: unknown; meta: string; icon: typeof BrainCircuit; scale: "benefit" | "risk"; tooltipAlign?: "center" | "end" }) {
  const value = formatScore(score);
  const tone = getScoreToneClass(score, scale);
  return (
    <Card size="sm" className="relative min-w-0 overflow-visible">
      <CardHeader className="items-center gap-1.5 text-center">
        <div className={cn("flex size-9 items-center justify-center rounded-lg border", tone.icon)}>
          <Icon className="size-[18px]" />
        </div>
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <div data-score-value className={cn("font-mono text-[2.125rem] font-semibold leading-none tracking-normal tabular-nums", tone.text)}>{value}</div>
      </CardHeader>
      <CardContent>
        <AdaptiveTooltip content={meta} align={tooltipAlign}>
          <p tabIndex={0} className="line-clamp-2 max-w-full text-center text-xs leading-5 text-muted-foreground outline-none">{meta}</p>
        </AdaptiveTooltip>
      </CardContent>
    </Card>
  );
}

function AdaptiveTooltip({ children, content, align = "center" }: { children: ReactNode; content: string; align?: "center" | "end" }) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);

  function showTooltip() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(288, Math.max(192, window.innerWidth - 32));
    const estimatedHeight = Math.min(220, Math.max(56, Math.ceil(String(content || "").length / 18) * 20 + 24));
    const gap = 8;
    const topSpace = rect.top;
    const showBelow = topSpace < estimatedHeight + gap + 12;
    const preferredLeft = align === "end" ? rect.right - width : rect.left + rect.width / 2 - width / 2;
    const left = Math.min(window.innerWidth - width - 16, Math.max(16, preferredLeft));
    const top = showBelow ? Math.min(window.innerHeight - 16, rect.bottom + gap) : Math.max(16, rect.top - gap);
    setTooltipStyle({
      position: "fixed",
      left,
      top,
      width,
      maxHeight: "min(14rem, calc(100vh - 2rem))",
      transform: showBelow ? "none" : "translateY(-100%)"
    });
  }

  function hideTooltip(event?: FocusEvent<HTMLDivElement>) {
    if (event?.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setTooltipStyle(null);
  }

  return (
    <div ref={triggerRef} className="relative flex justify-center" onMouseEnter={showTooltip} onMouseLeave={() => hideTooltip()} onFocus={showTooltip} onBlur={hideTooltip}>
      {children}
      {tooltipStyle ? (
        <div role="tooltip" className="pointer-events-none z-[260] overflow-auto rounded-md border bg-popover px-3 py-2 text-left text-xs leading-5 text-popover-foreground shadow-lg" style={tooltipStyle}>
          {content}
        </div>
      ) : null}
    </div>
  );
}

function getScoreToneClass(score: unknown, scale: "benefit" | "risk") {
  const value = Number(score);
  if (!Number.isFinite(value)) {
    return {
      text: "text-muted-foreground",
      icon: "border-border bg-muted/40 text-muted-foreground"
    };
  }
  if (scale === "risk") {
    if (value >= 85) {
      return {
        text: "text-rose-600 dark:text-rose-400",
        icon: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/12 dark:text-rose-300"
      };
    }
    if (value >= 60) {
      return {
        text: "text-amber-600 dark:text-amber-400",
        icon: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-300"
      };
    }
    if (value >= 40) {
      return {
        text: "text-sky-600 dark:text-sky-400",
        icon: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-300"
      };
    }
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/12 dark:text-emerald-300"
    };
  }
  if (value >= 85) {
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      icon: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/12 dark:text-emerald-300"
    };
  }
  if (value >= 70) {
    return {
      text: "text-sky-600 dark:text-sky-400",
      icon: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/12 dark:text-sky-300"
    };
  }
  if (value >= 50) {
    return {
      text: "text-amber-600 dark:text-amber-400",
      icon: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-300"
    };
  }
  return {
    text: "text-rose-600 dark:text-rose-400",
    icon: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/12 dark:text-rose-300"
  };
}

function LegendDot({ label, tone }: { label: string; tone: "input" | "decision" | "method" | "tool" }) {
  const toneClass = {
    input: "bg-primary",
    decision: "bg-[color:var(--chart-c)]",
    method: "bg-[color:var(--chart-b)]",
    tool: "bg-[color:var(--decline)]"
  }[tone];
  return (
    <div className="flex items-center gap-2 text-white/80">
      <span className={cn("size-2 rounded-full", toneClass)} />
      {label}
    </div>
  );
}

function GitHubIdentity({ status }: { status: GitHubStatus }) {
  const login = status.login || status.name || "GitHub";
  const fallback = login.slice(0, 1).toUpperCase();
  return status.avatarUrl ? (
    <img
      src={status.avatarUrl}
      alt=""
      aria-hidden="true"
      className="size-6 shrink-0 rounded-full border border-border bg-muted object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold leading-none text-muted-foreground">
      {fallback}
    </span>
  );
}

function SkillListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-10 rounded-lg" />)}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-44 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <Skeleton className="h-[34rem] rounded-xl" />
    </div>
  );
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "Request returned a non-JSON response.");
  }
  if (!response.ok) {
    const errorPayload = payload as { content?: string; error?: string; authRequired?: boolean; authHelp?: string; authCommand?: string };
    throw new ApiRequestError(errorPayload.content || errorPayload.error || "Request failed.", errorPayload);
  }
  return payload as T;
}

class ApiRequestError extends Error {
  payload: { authRequired?: boolean; authHelp?: string; authCommand?: string };

  constructor(message: string, payload: { authRequired?: boolean; authHelp?: string; authCommand?: string }) {
    super(message);
    this.name = "ApiRequestError";
    this.payload = payload;
  }
}

function notifyError(error: unknown) {
  if (error instanceof ApiRequestError && error.payload.authRequired) {
    showGitHubAuthGuide({ authHelp: error.payload.authHelp, authCommand: error.payload.authCommand }, getActiveCopy(), undefined);
    return;
  }
  toast.error(error instanceof Error ? error.message : String(error));
}

function preventDialogCloseFromSelectPortal(event: Event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const selectContentOpen = Boolean(document.querySelector("[data-slot='select-content'][data-state='open']"));
  if (selectContentOpen || target?.closest("[data-slot='select-content'], [data-radix-popper-content-wrapper]")) {
    event.preventDefault();
  }
}

function getActiveCopy() {
  return document.documentElement.lang.toLowerCase().startsWith("zh") ? copy.zh : copy.en;
}

const githubAuthToastId = "github-auth-guide";

function showGitHubAuthGuide(guide: GitHubAuthGuide, text: Record<string, string>, refreshStatus?: (showToast?: boolean) => Promise<GitHubStatus>) {
  const command = guide.command || guide.authCommand || "gh auth login --web && gh auth refresh --scopes copilot";
  const message = localizeGitHubAuthMessage(guide.message || guide.authHelp || "", command, text);
  toast.warning(message, {
    id: githubAuthToastId,
    duration: Infinity,
    description: `${text.runCommand} ${command}\n${text.githubAuthAfterCommand}`,
    action: refreshStatus ? {
      label: text.checkStatus,
      onClick: () => void refreshStatus(true)
    } : undefined,
    cancel: {
      label: text.copyCommand,
      onClick: () => void copyTextToClipboard(command).then(() => toast.success(text.commandCopied)).catch(notifyError)
    }
  });
}

function localizeGitHubAuthMessage(message: string, command: string, text: Record<string, string>) {
  if (text === copy.en) {
    return message || text.githubAuthNeeded;
  }
  if (command.includes("brew install gh")) {
    return "需要先安装 GitHub CLI，然后登录并刷新 Copilot 权限。";
  }
  if (command.includes("auth refresh")) {
    return command.includes("auth login")
      ? "请先通过 GitHub CLI 登录，然后刷新 Copilot 权限。"
      : "已登录 GitHub，但 Copilot SDK 还需要 copilot 权限。";
  }
  return text.githubAuthNeeded;
}

async function copyTextToClipboard(value: string) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  if (copied) {
    return;
  }

  if (navigator.clipboard?.writeText) {
    await Promise.race([
      navigator.clipboard.writeText(value),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error("Copy failed.")), 500))
    ]);
    return;
  }

  throw new Error("Copy failed.");
}

function normalizeSearchText(value: string) {
  return String(value || "").toLocaleLowerCase().replace(/\s+/g, "");
}

function formatScore(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return Number.isFinite(Number(value)) ? String(Math.max(0, Math.min(99, Math.round(Number(value))))) : "—";
}

function formatRoiMeta(roi: ModelAnalysis["roi"] | undefined, text: Record<string, string>) {
  if (!roi) {
    return text.roiNotEvaluated;
  }
  const estimate = roi.manualTimeEstimate || roi.manualTime || "";
  const rationale = roi.rationale || "";
  return [estimate ? `${text.manualTimePrefix}${estimate}` : "", rationale].filter(Boolean).join(" · ") || text.modelScore;
}

function formatEvaluationStatus(modelAnalysis: ModelAnalysis | undefined, language: Language, text: Record<string, string>) {
  const timestamp = modelAnalysis?.cachedAt || modelAnalysis?.generatedAt;
  if (!timestamp) {
    return text.rulesEvaluationPrompt;
  }
  const date = new Date(timestamp);
  const formatted = Number.isNaN(date.getTime())
    ? String(timestamp)
    : new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  return `${text.lastEvaluation}: ${formatted}`;
}

function getModelAnalysisMetaLabel(modelAnalysis: ModelAnalysis | undefined, text: Record<string, string>) {
  return modelAnalysis?.cacheMatch && modelAnalysis.cacheMatch !== "exact"
    ? text.historicalModelAnalysis
    : text.cachedModelAnalysis;
}

function formatRuleActivationPrompts(triggers: string[]) {
  return (triggers || []).slice(0, 3).map((trigger) => {
    const trimmed = String(trigger || "").trim();
    if (!trimmed) {
      return "";
    }
    return trimmed;
  }).filter(Boolean);
}

function formatPromptDisplayText(value: string) {
  return String(value || "")
    .replace(/^\s*Prompt\s*[:：]\s*/i, "")
    .replace(/\s*[·。]?\s*(场景|Scenario)\s*[:：].*$/i, "")
    .trim();
}

function compactSkillFiles(files: SkillFile[]) {
  const priorityFiles: SkillFile[] = [];
  const regularFiles: SkillFile[] = [];
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

function buildLogicMapPayload(skill: SkillDetail, model: string, language: Language, requestId?: string) {
  return {
    model,
    language,
    requestId,
    skill: {
      name: skill.name,
      path: skill.path,
      description: skill.description,
      files: compactSkillFiles(skill.files || []),
      fileStats: skill.analysis?.fileStats || {
        total: skill.files?.length || 0,
        directories: (skill.files || []).filter((file) => file.type === "directory").length,
        files: (skill.files || []).filter((file) => file.type === "file").length
      }
    }
  };
}

function createProgressRequestId() {
  return `progress-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function localizeToolRole(tool: ToolInfo, language: Language) {
  if (language !== "zh") {
    return tool.role;
  }
  return {
    "command runner": "命令执行",
    "file reader": "文件读取",
    "code search": "代码搜索",
    "file discovery": "文件发现",
    "code editing": "代码编辑",
    "web retrieval": "网页读取",
    clarification: "澄清交互",
    delegation: "任务委派",
    "state tracking": "状态追踪",
    "cloud operations": "云操作",
    "cluster operations": "集群操作",
    "container workflow": "容器流程",
    infrastructure: "基础设施",
    "Azure deployment": "Azure 部署",
    "JavaScript workflow": "JavaScript 流程",
    "Python packages": "Python 包",
    "script execution": "脚本执行",
    runtime: "运行时",
    "source control": "源码管理",
    "browser automation": "浏览器自动化"
  }[tool.role] || tool.role;
}

const emptyGraph: LogicGraph = { nodes: [], edges: [], width: 1200, height: 560 };

export default App;
