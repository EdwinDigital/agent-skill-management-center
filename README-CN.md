# AI Agent Skills Console

AI Agent Skills Console 是一个本地优先的 Web 控制台，用于探索、审计、翻译和 AI 评估 Agent Skills。它会扫描本机 Skill 目录，读取每个 Skill 的定义和文件树，立即构建基于规则的执行地图，并可通过 GitHub Copilot SDK 生成更丰富的模型驱动逻辑图、复杂度评分、ROI 评分、人工耗时估算、触发 Prompt，以及中英文 Skill 文档视图。

该应用面向维护大量 Skills 的开发者和 AI Agent 构建者，帮助他们快速可视化理解每个 Skill 如何触发、使用哪些工具、依赖哪些文件，以及是否值得进一步做 AI 深度评估。

## 应用亮点

- **本地 Skill 注册表**：发现多个 Agent 生态的默认 Skill 路径，并将已扫描/自定义根目录存入 SQLite。
- **多个 Skill 根目录**：通过 macOS 原生目录选择器添加本地目录，预览检测到的 Skill 数量，设置显示名称，在多个根目录间切换，并删除可移除的自定义根目录。
- **快速首屏**：应用优先加载配置、根目录和 Skill 列表；较慢的 GitHub CLI 和 Copilot 模型列表调用会延后执行，避免刷新页面变慢。
- **会话级模型列表缓存**：完整 Copilot 模型列表只在当前浏览器页面会话首次打开设置时读取一次。再次打开设置会复用页面内缓存；刷新或重新打开网站后缓存重置。
- **默认规则分析**：每个选中的 Skill 都会立即获得本地分析，包括摘要、触发 Prompt、工具面、运行方法、文件、决策节点和横向逻辑图。
- **按需 AI 评估**：点击 AI 评估按钮后，生成并缓存模型驱动的逻辑图、复杂度评分、ROI 评分、人工工作量估算、模型洞察，以及真实触发 Prompt/使用场景示例。
- **AI 评估前评分卡保持未评估**：复杂度和 ROI 在模型评估完成前都显示 `未评估`，避免展示误导性的规则派生分数。
- **Skill.md 翻译流程**：Skill 文档可查看原文或翻译后的 Markdown；翻译结果按 Skill 路径和语言缓存。
- **进度反馈**：长时间运行的评估和翻译通过 `/api/progress/:requestId` 汇报状态，前端可以展示当前阶段而不阻塞界面。
- **双语界面**：支持英文和中文标签、设置项、进度文案，以及生成/可读内容模式。
- **精致的 shadcn 风格界面**：基于 React 19、Vite、Tailwind CSS v4、shadcn/Radix primitives、lucide 图标和 Sonner 通知，支持主题切换、响应式侧栏、文件树面板、评分卡片和交互式执行图。
- **GitHub/Copilot 集成**：读取 GitHub CLI 状态，引导配置 Copilot scope，按需加载 Copilot SDK 模型，并在所选模型不可用时刷新模型后重试 AI 评估。
- **默认本地数据**：运行数据位于项目相对路径 `data/analysis.sqlite`，且 `data/` 不进入 Git 版本控制。

## 方案设计

产品将即时本地检查与较慢的模型辅助评估分离。

1. **启动路径**
   - 浏览器请求 `/api/config`、`/api/skill-roots`，以及首个选中根目录的 Skill 列表。
   - 前端只加载 fallback 模型元数据，然后在后台检查 GitHub 状态。
   - 首次页面加载不会读取 live Copilot 模型列表。

2. **Skill 检查路径**
   - 选择 Skill 时，前端按当前根目录和语言调用 `/api/skills/:name`。
   - 服务端读取 Skill 文件夹，选择最合适的描述文件，采样支撑文件，提取工具、触发条件和运行方法，并返回规则图。
   - UI 立即渲染逻辑图、节点详情、触发 Prompt、运行方法、工具栈和文件树。

3. **AI 评估路径**
   - UI 先调用 `/api/logic-map/cache`，检查是否已有匹配的模型分析。
   - 如果缓存未命中，`/api/logic-map/generate` 启动 Copilot SDK 评估，并把进度写入内存供轮询。
   - 模型响应会被规范化为图节点/连线、复杂度、ROI、人工耗时估算、Prompt 示例和洞察章节。
   - 当 Skill 路径、语言、内容哈希、模型和 schema 兼容时，结果会写入 SQLite 并复用。

4. **翻译路径**
   - Skill 文档面板可展示原始 Markdown 或翻译版本。
   - `/api/skill-translation/cache` 会先检查已保存翻译。
   - `/api/skill-translation/generate` 在需要翻译时调用 Copilot SDK，然后将 Markdown 结果写入 SQLite。
   - 如果内容已经是目标语言，服务端会返回跳过翻译的结果。

5. **设置与认证路径**
   - 设置页展示语言、默认模型和 GitHub 身份。
   - 完整模型列表只在当前页面会话首次打开设置时读取。
   - 如果 Copilot 认证缺失，UI 会展示 GitHub CLI 指引，例如 `gh auth login --web && gh auth refresh --scopes copilot`。

## 技术架构

```text
浏览器
  └─ React 19 + Vite + Tailwind CSS v4 + shadcn/Radix 组件
     ├─ 应用外壳、侧栏、设置弹窗、主题/语言控制
     ├─ Skill 列表搜索、分页、自定义根目录流程
     ├─ 评分卡片、模型洞察、触发 Prompt、运行方法
     ├─ 交互式横向逻辑图和节点详情面板
     └─ Skill.md 原文/译文文档面板

Node/Express 服务端 (server.js)
  ├─ 从 public/dist 和 public 提供静态资源
  ├─ Skill 根目录注册表和目录扫描器
  ├─ Skill 文件系统读取与本地规则分析
  ├─ 通过 node:sqlite DatabaseSync 管理 SQLite 运行数据
  ├─ 通过 gh 获取 GitHub CLI 认证/状态/注销能力
  ├─ 通过 osascript 调用 macOS 目录选择器
  ├─ GitHub Copilot SDK 模型列表、评估和翻译流程
  ├─ 用于轮询的内存进度存储
  └─ 将 JSON 错误日志写入 SQLite

本地运行数据
  └─ data/analysis.sqlite  （首次启动服务时创建）
```

## 项目结构

```text
.
├─ server.js                  # Express API、SQLite 初始化、扫描、Copilot SDK 流程
├─ package.json               # npm 脚本和运行依赖
├─ vite.config.js             # Vite 构建配置、开发代理、public/dist 输出
├─ index.html                 # Vite 入口 HTML
├─ src/
│  ├─ main.tsx                # React 启动入口
│  ├─ App.tsx                 # 主应用状态、UI 流程、图谱、设置、评估、翻译
│  ├─ index.css               # Tailwind v4/主题样式和本地字体导入
│  ├─ lib/utils.ts            # 共享 className 工具
│  └─ components/ui/          # 应用使用的 shadcn/Radix UI primitives
├─ public/
│  ├─ favicon.svg
│  ├─ dist/                   # Vite 生产构建输出，Git 忽略
│  └─ legacy static assets    # 保留用于兼容/参考的旧静态文件
├─ scripts/
│  └─ stop.js                 # 停止监听 PORT 的进程
├─ data/                      # 本地 SQLite 运行数据，Git 忽略
├─ README.md
└─ README-CN.md
```

## 数据结构

SQLite 数据库会在启动时自动创建。默认路径是项目相对路径：

```text
data/analysis.sqlite
```

可以通过 `SKILL_ANALYSIS_DB` 覆盖该路径。相对路径会从项目工作目录解析；绝对路径和 `~/...` 也受支持。

### 数据表

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `skill_directory_defaults` | 已知 Agent Skill 目录约定目录表。 | `agent_slug`, `agent_name`, `project_path`, `global_path` |
| `skill_directory_scan` | 侧栏展示的已扫描和自定义 Skill 根目录。 | `id`, `source_type`, `label`, `path`, `expanded_path`, `exists_on_disk`, `removable` |
| `skill_model_analyses` | AI 评估结果缓存。 | `skill_path`, `language`, `model`, `content_hash`, `analysis_json`, timestamps |
| `skill_markdown_translations` | 翻译后的 Skill.md Markdown 缓存。 | `skill_path`, `language`, `model`, `content_hash`, `translated_markdown`, timestamps |
| `app_error_logs` | 结构化 API/运行时错误日志。 | `created_at`, `level`, `scope`, `method`, `route`, `status`, `message`, `details_json` |

分析和翻译缓存表都使用 `(skill_path, language)` 作为主键，同时保存 `model` 和 `content_hash`，以便服务端判断缓存是精确匹配、历史匹配还是已过期。

## API 表面

| API | 用途 |
| --- | --- |
| `GET /api/config` | 返回默认根目录、支持语言和 fallback 模型 id。 |
| `GET /api/progress/:requestId` | 读取 AI 评估或翻译进度。 |
| `GET /api/skill-roots` | 从 SQLite 列出已扫描/自定义 Skill 根目录。 |
| `POST /api/skill-roots/scan` | 扫描已知默认 Agent Skill 路径并记录存在的路径。 |
| `POST /api/skill-roots/pick-local` | 打开原生目录选择器并检查所选目录。 |
| `POST /api/skill-roots/custom` | 保存自定义 Skill 根目录和显示名称。 |
| `DELETE /api/skill-roots/:id` | 删除可移除的自定义 Skill 根目录。 |
| `GET /api/skills` | 列出选中根目录下的 Skills。 |
| `GET /api/skills/:name` | 读取 Skill 详情、文件和本地规则分析。 |
| `GET /api/auth/github/status` | 读取 GitHub CLI 和 Copilot 认证就绪状态。 |
| `POST /api/auth/github/login` | 返回 GitHub CLI 登录/scope 指引。 |
| `POST /api/auth/github/logout` | 为当前认证身份执行 GitHub CLI logout。 |
| `GET /api/models` | 返回 fallback 模型；带 `?live=1` 时返回 live Copilot 模型。 |
| `POST /api/logic-map/cache` | 检查 Skill/模型/语言/内容组合的模型分析缓存。 |
| `POST /api/logic-map/generate` | 生成并缓存模型驱动的逻辑图和评分。 |
| `POST /api/skill-translation/cache` | 检查已缓存的 Skill Markdown 翻译。 |
| `POST /api/skill-translation/generate` | 生成并缓存 Skill Markdown 翻译。 |
| `GET /api/error-logs` | 返回最近的结构化服务端错误。 |

## 前置条件

- **支持 `node:sqlite` 的 Node.js**。推荐 Node 22+，因为应用使用 `node:sqlite` 中的 `DatabaseSync`。
- **npm**，用于安装依赖和运行脚本。
- **GitHub CLI (`gh`)**，用于认证状态、注销和 Copilot scope 指引。
- **GitHub Copilot 权限**，用于通过 `@github/copilot-sdk` 读取 live 模型列表、AI 评估和 Skill.md 翻译。
- **macOS**，用于原生本地目录选择器接口（`osascript`）。直接路径扫描和服务端文件系统访问仍使用 Node API。

按需登录 GitHub CLI 并刷新 Copilot OAuth scope：

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

## 开发脚本

安装依赖：

```bash
npm install
```

运行生产风格的本地服务：

```bash
npm start
```

`npm start` 会执行：

```bash
npm run build && node server.js
```

停止监听配置端口的进程：

```bash
npm stop
```

运行类型检查和服务端语法检查：

```bash
npm run check
```

只构建前端：

```bash
npm run build
```

运行带 API 代理的 Vite 开发服务器：

```bash
npm run dev
```

使用开发服务器流程时，需要单独在 `4173` 端口运行 `node server.js`；Vite 会在 `127.0.0.1:5173` 提供前端，并将 `/api` 代理到 Express。

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4173` | Express 服务端口。 |
| `SKILL_ROOT` | `~/.agents/skills` | 当路径存在时，作为初始默认 Skill 根目录写入扫描表。 |
| `SKILL_ANALYSIS_DB` | `data/analysis.sqlite` | SQLite 数据库路径，用于目录注册、AI 分析缓存、翻译缓存和错误日志。相对路径从项目目录解析。 |

示例：

```bash
PORT=5173 npm start
```

```bash
SKILL_ROOT=/Users/me/.copilot/skills SKILL_ANALYSIS_DB=data/dev.sqlite npm start
```

使用相同的 `PORT` 停止自定义端口实例：

```bash
PORT=5173 npm stop
```

## 本地使用流程

1. 使用 `npm start` 启动应用，并打开 `http://localhost:4173`。
2. 点击 **全局扫描**，发现本机支持的默认 Skill 目录。
3. 点击 **添加目录**，通过原生目录选择器添加自定义 Skill 根目录。
4. 从目录切换器选择根目录，然后从分页侧栏选择一个 Skill。
5. 查看即时规则分析：文件树、触发 Prompt、工具栈、运行方法、逻辑图和节点证据。
6. 如果想指定 Copilot 模型，打开 **设置**；模型列表在每个页面会话中只读取一次。
7. 点击 **AI 评估**，生成模型驱动的复杂度/ROI 评分和更丰富的图谱/洞察内容。
8. 在 Skill 文档面板中，当翻译可用时，可在原文和译文 Markdown 之间切换。

## 部署说明

本项目定位为本地开发者控制台。Express 服务会读取用户配置的本地目录，写入本地 SQLite 数据库，并调用本地工具，例如 `gh`、`osascript` 和 `lsof`。除非额外添加认证和路径访问控制，否则建议保持绑定 localhost。

推荐本地运行方式：

```bash
npm start
npm stop
```

服务启动后打开 `http://localhost:4173`。

生产构建输出到 `public/dist`，并由 `server.js` 与 API 路由一起提供服务。`public/dist/` 和 `data/` 会被 Git 忽略，因此部署自动化应在目标机器上运行 `npm install` 和 `npm run build`（或 `npm start`）。

## 安全与隐私说明

- 应用只读取已发现或显式配置的 Skill 根目录。
- 自定义根目录路径只存储在本地 SQLite 中。
- 只有在请求 AI 评估或翻译时，Skill 描述和采样的支撑文件才会发送给 GitHub Copilot SDK。
- 错误详情会存储在本地 `app_error_logs` 中，用于诊断失败的 API 调用。
- 将服务暴露到 localhost 之外会暴露文件系统相关 API；远程使用前请先做好保护。

## 故障排查

- **没有显示 Skills**：运行 **全局扫描**，添加自定义目录，或在首次启动前设置 `SKILL_ROOT`。
- **AI 评估提示认证**：运行 `gh auth login --web` 和 `gh auth refresh --scopes copilot`，然后在应用中重新检查状态。
- **模型列表较慢**：这是当前页面会话首次打开设置时的预期行为，因为需要启动 Copilot SDK 并读取 live 模型。再次打开设置会复用页面内缓存。
- **重置数据库**：停止服务并删除 `data/analysis.sqlite`；下次启动时会自动重建。
- **端口已占用**：运行 `npm stop`，或为启动和停止命令设置相同的其他 `PORT`。
