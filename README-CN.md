# Agent Skill Management Center

Agent Skill Management Center 是一个本地优先的工作台，用于探索、审计、翻译和 AI 评估 Agent Skills。它会扫描本地 Skill 根目录，读取 Skill 定义和文件树，立即渲染基于规则的分析，并可通过 GitHub Copilot SDK 生成模型驱动的复杂度和 ROI 评分、模型洞察、触发 Prompt、逻辑图和 Skill.md 翻译。

该应用面向维护大量 Skills 的开发者和 Agent 构建者，帮助他们快速理解一个 Skill 何时应被触发、依赖哪些工具和文件，以及是否值得运行更深入的 AI 评估。

## 应用亮点

- **本地优先 Skill 注册表**：发现已知 Skill 目录，支持自定义根目录，并将扫描结果存入 SQLite。
- **工作台 UI**：采用三段式控制台布局：`SidebarConsole` 管输入源和列表，`DetailSurface` 管分析和图谱，`DocPanel` 管 Skill.md 和文件上下文。
- **即时规则分析**：选择 Skill 后，不等待模型调用即可返回本地摘要、触发条件、工具、运行方法、文件统计和横向逻辑图。
- **按需 AI 评估**：仅在需要时请求模型工作，并按 Skill 路径、语言、模型、内容哈希和 schema 缓存结果。
- **AI 前评分卡不显示分数**：复杂度和 ROI 在模型评分返回前保持未评估状态。
- **拆分式模型流程**：AI 评估按评分、洞察/触发 Prompt、图谱生成等聚焦步骤执行，再合并为统一的 `ModelAnalysis` 结构。
- **Skill.md 翻译**：右侧文档面板支持原文和翻译 Markdown 视图，并缓存翻译结果。
- **会话级模型列表缓存**：live Copilot 模型列表只在当前浏览器页面会话首次打开设置时读取。
- **GitHub/Copilot 指引**：应用检查 GitHub CLI 和 Copilot scope 就绪状态，并给出可执行的认证提示。
- **可复用模板包**：`web_template/` 包含独立静态工作台模板，以及简洁的设计/组件标准，可用于后续项目。
- **项目本地数据**：默认运行数据存储在 `data/analysis.sqlite`，`data/` 被 Git 忽略。

## 当前 UI 标准

当前界面是开发者工作台，不是营销页或通用仪表盘。

```text
┌────────────────┬───────────────────────────────┬──────────┐
│ SidebarConsole │ DetailSurface                 │ DocPanel │
│ sources/search │ overview, scores, graph       │ docs/tree│
└────────────────┴───────────────────────────────┴──────────┘
```

- `SidebarConsole` 负责根目录选择、全局扫描、搜索、分页 Skill 列表、主题和账号/设置入口。
- `DetailSurface` 负责选中 Skill 概览、AI 评估动作、评分卡、模型洞察、触发 Prompt、逻辑图、节点详情、工具和运行方法。
- `DocPanel` 负责 Skill.md 原文/译文视图和文件树。
- 主列始终使用 `minmax(0, 1fr)`；长路径、Markdown、图谱节点、文件名和 Prompt 文本都不能溢出容器。
- Radix Select content 是 Portal；Dialog 交互必须保护 Select Portal，避免选择选项时误关闭 Dialog。

## 方案设计

产品将快速本地检查与较慢的模型辅助评估分离。

1. **启动**
   - 浏览器加载 `/api/config`、`/api/skill-roots` 和首个根目录的 Skill 列表。
   - 前端只加载 fallback 模型元数据，然后在后台检查 GitHub 状态。
   - live Copilot 模型列表延后到打开设置时再读取。

2. **Skill 检查**
   - 选择 Skill 时，前端带当前根目录、路径和语言调用 `/api/skills/:name`。
   - 服务端读取 Skill 文件夹，选择最合适的描述文件，采样支撑文件，提取触发条件、工具和运行方法，并返回本地规则分析。
   - UI 立即渲染摘要、触发条件、工具栈、运行方法、文件树、逻辑图和节点证据。

3. **AI 评估**
   - UI 先检查 `/api/logic-map/cache`。
   - 缓存未命中时，使用 progress request id 调用 `/api/logic-map/generate`。
   - 后端通过 Copilot SDK 分别执行模型评分、模型洞察/触发 Prompt 和图谱生成等聚焦工作。
   - 规范化后的结果写入 SQLite 缓存，并作为统一的模型分析展示。

4. **Skill.md 翻译**
   - UI 请求生成前先检查 `/api/skill-translation/cache`。
   - `/api/skill-translation/generate` 只在需要翻译时调用 Copilot SDK。
   - 结果按 Skill 路径、语言、模型和内容哈希缓存。

5. **设置和认证**
   - 设置管理显示语言、默认模型和 GitHub 身份。
   - live 模型列表在当前浏览器页面会话中缓存于内存。
   - 认证缺失时展示 GitHub CLI 指引，例如 `gh auth login --web` 和 `gh auth refresh --scopes copilot`。

## 技术架构

```text
浏览器
  └─ React 19 + Vite + Tailwind CSS v4 + shadcn/Radix primitives
     ├─ SidebarConsole、DetailSurface、DocPanel、设置 Dialog
     ├─ Skill 搜索、分页、自定义根目录流程
     ├─ 评分卡、模型洞察、触发 Prompt、运行方法
     ├─ 交互式横向逻辑图和节点详情
     └─ Skill.md 原文/译文文档阅读器和文件树

Node/Express 服务端 (server.js)
  ├─ 从 public/dist 和 public 提供静态资源
  ├─ 使用 node:sqlite DatabaseSync 初始化 SQLite
  ├─ Skill 根目录注册表和目录扫描器
  ├─ Skill 文件系统读取和本地规则分析器
  ├─ 通过 gh 获取 GitHub CLI 认证/状态/注销能力
  ├─ 通过 osascript 调用 macOS 文件夹选择器
  ├─ GitHub Copilot SDK 模型列表、评估和翻译流程
  ├─ 用于轮询的内存进度存储
  └─ 将结构化 API/运行时错误写入 SQLite

本地运行数据
  └─ data/analysis.sqlite
```

## 项目结构

```text
.
├─ server.js                  # Express API、SQLite、Skill 扫描、Copilot SDK 流程
├─ package.json               # npm 脚本和依赖
├─ vite.config.js             # Vite 配置、/api 开发代理、public/dist 输出
├─ index.html                 # Vite 入口 HTML
├─ src/
│  ├─ main.tsx                # React 启动入口
│  ├─ App.tsx                 # 主应用状态、工作台 UI、图谱、设置、AI 流程
│  ├─ index.css               # Tailwind v4 主题、工作台样式、本地字体导入
│  ├─ lib/utils.ts            # 共享 className 工具
│  └─ components/ui/          # shadcn/Radix UI primitive wrappers
├─ setup/
│  ├─ schema.sql              # SQLite schema
│  ├─ database.js             # 数据库初始化 helper
│  └─ default-skill-directories.*
├─ scripts/
│  └─ stop.js                 # 停止监听 PORT 的进程
├─ web_template/              # 独立可复用静态工作台模板
│  ├─ README.md
│  ├─ WEB_DESIGN_STANDARD.md
│  ├─ CORE_COMPONENTS.md
│  ├─ templates/workbench-shell.html
│  └─ assets/{design-tokens.css,workbench.css,workbench.js}
├─ public/
│  ├─ favicon.svg
│  └─ dist/                   # Vite 生产输出，Git 忽略
├─ data/                      # 本地 SQLite 运行数据，Git 忽略
├─ VERSION.md                 # Version 1.0 定义和版本策略
├─ README.md
└─ README-CN.md
```

当前发布定义：**Agent Skill Management Center Version 1.0**。Version 1.0 范围、稳定性规则和发布验证要求见 `VERSION.md`。

## 数据和缓存模型

默认 SQLite 路径：

```text
data/analysis.sqlite
```

`SKILL_ANALYSIS_DB` 可以覆盖该路径。相对值从项目目录解析；绝对路径和 `~/...` 也受支持。

| 表 | 用途 |
|---|---|
| `skill_directory_defaults` | 已知 Agent Skill 目录约定。 |
| `skill_directory_scan` | 侧栏展示的已扫描和自定义 Skill 根目录。 |
| `skill_model_analyses` | 按 `(skill_path, language)` 缓存 AI 评估结果。 |
| `skill_markdown_translations` | 按 `(skill_path, language)` 缓存翻译后的 Skill.md Markdown。 |
| `app_error_logs` | 结构化 API/运行时错误日志。 |

AI 分析和翻译缓存还保存 `model`、`content_hash`、时间戳以及序列化 JSON/Markdown，因此应用可以区分精确匹配、历史匹配和过期结果。

## API 表面

| API | 用途 |
|---|---|
| `GET /api/config` | 返回默认根目录、语言和 fallback 模型。 |
| `GET /api/progress/:requestId` | 读取 AI 评估或翻译进度。 |
| `GET /api/skill-roots` | 列出已扫描/自定义 Skill 根目录。 |
| `POST /api/skill-roots/scan` | 扫描已知默认 Skill 路径。 |
| `POST /api/skill-roots/pick-local` | 打开原生文件夹选择器并检查所选目录。 |
| `POST /api/skill-roots/custom` | 保存自定义 Skill 根目录。 |
| `DELETE /api/skill-roots/:id` | 删除可移除的自定义根目录。 |
| `GET /api/skills` | 列出选中根目录下的 Skills。 |
| `GET /api/skills/:name` | 读取 Skill 详情、文件和本地规则分析。 |
| `GET /api/auth/github/status` | 读取 GitHub CLI 和 Copilot 就绪状态。 |
| `POST /api/auth/github/login` | 返回 GitHub CLI 登录/scope 指引。 |
| `POST /api/auth/github/logout` | 注销当前 GitHub CLI 身份。 |
| `GET /api/models` | 返回 fallback 模型；带 `?live=1` 时返回 live Copilot 模型。 |
| `POST /api/logic-map/cache` | 检查缓存的模型分析。 |
| `POST /api/logic-map/generate` | 生成并缓存模型驱动分析。 |
| `POST /api/skill-translation/cache` | 检查缓存的 Skill Markdown 翻译。 |
| `POST /api/skill-translation/generate` | 生成并缓存 Skill Markdown 翻译。 |
| `GET /api/error-logs` | 返回最近的结构化服务端错误。 |

## 运行要求

- 支持 `node:sqlite` 的 Node.js。推荐 Node 22+。
- npm。
- GitHub CLI (`gh`)，用于认证状态、注销和 Copilot scope 指引。
- GitHub Copilot 权限，用于 live 模型列表、AI 评估和 Skill.md 翻译。
- macOS，用于原生文件夹选择器接口（`osascript`）。直接文件系统扫描仍使用 Node API。

GitHub CLI 设置：

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

## 脚本

```bash
npm install      # 安装依赖
npm run check    # node --check server.js && tsc --noEmit
npm run build    # 构建前端到 public/dist
npm start        # npm run build && node server.js
npm stop         # 停止监听 PORT 的进程
npm run dev      # Vite 开发服务器，运行在 127.0.0.1:5173，并代理 /api
```

使用 `npm run dev` 时，需要单独运行 `node server.js`，让 API 监听 `http://localhost:4173`。

## 配置

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `4173` | Express 服务端口。 |
| `SKILL_ROOT` | `~/.agents/skills` | 当路径存在时写入的初始根目录。 |
| `SKILL_ANALYSIS_DB` | `data/analysis.sqlite` | SQLite 路径，用于根目录、缓存和错误日志。 |

示例：

```bash
PORT=5173 npm start
```

```bash
SKILL_ROOT=/Users/me/.copilot/skills SKILL_ANALYSIS_DB=data/dev.sqlite npm start
```

停止自定义端口服务时使用相同 `PORT`：

```bash
PORT=5173 npm stop
```

## 本地使用流程

1. 使用 `npm start` 启动，并打开 `http://localhost:4173`。
2. 运行 **全局扫描**，发现支持的默认 Skill 目录。
3. 按需添加自定义 Skill 根目录。
4. 选择根目录，并从侧栏列表选择 Skill。
5. 查看即时规则分析、图谱节点、文件树、触发 Prompt、工具和运行方法。
6. 打开 **设置** 修改语言或选择 live Copilot 模型。
7. 运行 **AI 评估**，生成模型驱动评分、洞察、触发 Prompt 和图谱内容。
8. 在文档面板中按需切换原始和翻译后的 Skill.md。

## 可复用工作台模板

`web_template/` 是面向未来控制台类项目的独立静态模板包，和当前运行应用刻意分离。

- `templates/workbench-shell.html` 提供静态 shell。
- `assets/design-tokens.css` 定义语义 token 和基础样式。
- `assets/workbench.css` 定义布局和组件。
- `assets/workbench.js` 提供少量静态交互。
- `WEB_DESIGN_STANDARD.md` 和 `CORE_COMPONENTS.md` 记录视觉标准和组件边界。

可以把该目录作为干净起点；除非新项目确实需要，不要复制运行时 API、数据库代码或 Copilot SDK 流程。

## 安全和隐私

- 应用只读取已发现或显式配置的 Skill 根目录。
- 自定义根目录路径存储在本地 SQLite。
- 只有在请求 AI 评估或翻译时，Skill 描述和采样支撑文件才会发送到 GitHub Copilot SDK。
- 错误详情存储在本地 `app_error_logs`。
- 将服务暴露到 localhost 之外可能暴露文件系统相关 API；请先添加认证和路径访问控制。

## 故障排查

- **没有显示 Skills**：运行 **全局扫描**，添加自定义目录，或在首次启动前设置 `SKILL_ROOT`。
- **AI 评估提示认证**：运行 `gh auth login --web` 和 `gh auth refresh --scopes copilot`，然后在应用中重新检查状态。
- **模型列表较慢**：当前页面会话首次打开设置时这是预期行为；再次打开设置会使用页面内缓存。
- **重置数据库**：停止服务并删除 `data/analysis.sqlite`；下次启动会自动重建。
- **端口已占用**：运行 `npm stop`，或为启动和停止使用相同的自定义 `PORT`。
