export type Language = "en" | "zh";

export type SkillRoot = {
  id: string;
  label: string;
  value: string;
  type?: string;
  removable?: boolean;
  expandedPath?: string;
};

export type SkillListItem = {
  name: string;
  path: string;
  summary?: string;
  hasDescription?: boolean;
  descriptionFile?: string | null;
};

export type SkillFile = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
};

export type ToolInfo = {
  name: string;
  role: string;
};

export type MethodInfo = {
  id: string;
  label: string;
  detail: string;
};

export type DecisionInfo = {
  id: string;
  label: string;
  detail: string;
  outcome: string;
};

export type GraphNode = {
  id: string;
  type: string;
  title: string;
  detail: string;
  evidence: string[];
  x: number;
  y: number;
};

export type GraphEdge = {
  source: string;
  target: string;
  label?: string;
};

export type SkillGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
};

export type SkillAnalysis = {
  summary: string;
  triggers: string[];
  tools: ToolInfo[];
  artifacts: string[];
  methods: MethodInfo[];
  decisions: DecisionInfo[];
  graph: SkillGraph;
  fileStats: {
    total: number;
    directories: number;
    files: number;
  };
};

export type SkillDetail = {
  name: string;
  path: string;
  descriptionFile?: string | null;
  description: string;
  files: SkillFile[];
  analysis: SkillAnalysis;
  modelAnalysis?: ModelAnalysis;
};

export type ModelAnalysis = {
  summary?: string;
  model?: string;
  insight?: string;
  cachedAt?: string;
  generatedAt?: string;
  complexity?: {
    score?: number;
    rationale?: string;
  };
  roi?: {
    score?: number;
    rationale?: string;
    manualTimeEstimate?: string;
    manualTime?: string;
  };
  activationPhrases?: string[];
  graph?: SkillGraph;
};

export type ModelOption = {
  id: string;
  name?: string;
  source?: string;
};

export type GitHubStatus = {
  authenticated?: boolean;
  login?: string;
  name?: string;
  avatarUrl?: string;
  needsCopilotScope?: boolean;
};
