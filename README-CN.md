# Skill Logic Visualizer

Skill Logic Visualizer 是一个本地优先的 Web 应用，用于审计 Agent Skills。它可以扫描 Skill 目录、列出可用 Skills、读取每个 Skill 的描述与文件结构，并基于规则分析和可选的 GitHub Copilot SDK AI 评估，渲染交互式执行逻辑图。

## 应用亮点

- **目录注册与扫描**：在本地 SQLite 数据库中维护默认 Skill 目录、已扫描目录和自定义目录。内置扫描能力可以发现 `.agents/skills`、`.copilot/skills`、`.claude/skills` 等受支持 Agent 的 Skill 路径。
- **多个自定义 Skill 根目录**：支持添加多个本地 Skill 目录。应用会打开原生目录选择器，保存前先扫描所选路径，展示发现的 Skill 文件夹数量，允许自定义目录显示名称，然后将完整绝对路径写入数据库。
- **Skill 侧边栏**：支持目录切换、名称搜索、自定义目录删除，以及每页 10 条的分页展示。
- **默认规则分析**：选择 Skill 后，本地解析其摘要、触发 Prompt、工具、运行方法、文件、决策节点、复杂度和逻辑图。
- **按需 AI 评估**：点击 **AI评估** 按钮后，通过 GitHub Copilot SDK 生成模型驱动的逻辑图、统一复杂度评分、ROI 评分、人工耗时估算、模型洞察和触发 Prompt/使用场景示例。
- **持久化分析缓存**：AI 评估结果存储在 `~/.skill-logic-visualizer/analysis.sqlite` 中；当 Skill 内容、模型、语言和分析 schema 匹配时会直接复用缓存。
- **触发 Prompt 场景**：Activation 输出以真实用户 Prompt 和典型使用场景呈现，而不只是关键词。
- **Startup 风格 UI**：响应式中英文界面，支持浅色/深色主题、Flowise 风格横向逻辑图、节点详情面板、评分卡片和目录遥测。
- **GitHub 账号集成**：通过 GitHub CLI 读取登录状态，并提示 Copilot scope 配置。

## 技术架构

```text
浏览器 UI (public/)
  ├─ 侧边栏：目录注册、搜索、分页
  ├─ Skill 详情：评分、模型洞察、触发 Prompt、文件
  └─ 逻辑图：交互式横向图谱 + 节点详情面板

Express 服务端 (server.js)
  ├─ Skill 文件系统读取与规则分析
  ├─ 基于 node:sqlite 的 SQLite 注册表/缓存
  ├─ macOS 原生本地目录选择器（osascript）
  ├─ GitHub CLI 登录状态
  └─ GitHub Copilot SDK 模型评估

本地数据库
  └─ ~/.skill-logic-visualizer/analysis.sqlite
     ├─ skill_directory_defaults
     ├─ skill_directory_scan
     └─ skill_model_analyses
```

### 主要 API

| API | 用途 |
| --- | --- |
| `GET /api/skill-roots` | 从 SQLite 读取已扫描和自定义 Skill 目录。 |
| `POST /api/skill-roots/scan` | 扫描已知默认 Agent Skill 路径，并添加实际存在的路径。 |
| `POST /api/skill-roots/pick-local` | 打开原生本地目录选择器，并在保存前检查所选目录。 |
| `POST /api/skill-roots/custom` | 保存自定义 Skill 目录路径和显示名称。 |
| `DELETE /api/skill-roots/:id` | 删除可移除的自定义目录。 |
| `GET /api/skills` | 列出选中根目录下的 Skill 文件夹。 |
| `GET /api/skills/:name` | 读取 Skill 描述、文件和规则分析结果。 |
| `POST /api/logic-map/cache` | 为当前 Skill/模型/语言/内容加载已缓存的 AI 评估。 |
| `POST /api/logic-map/generate` | 通过 GitHub Copilot SDK 生成并缓存 AI 评估。 |
| `GET /api/auth/github/status` | 通过 `gh` 读取 GitHub 登录状态和 Copilot scope 状态。 |

## 前置条件

- **支持 `node:sqlite` 的 Node.js**。项目使用 `node:sqlite` 中的 `DatabaseSync`；推荐 Node 22+ 或更新版本。
- **npm**，用于安装依赖。
- **GitHub CLI (`gh`)**，用于 GitHub 登录状态和 Copilot scope 刷新。
- **GitHub Copilot 权限**，用于通过 `@github/copilot-sdk` 执行 AI 评估。
- **macOS**，用于 `POST /api/skill-roots/pick-local` 的原生本地目录选择器（`osascript`）。默认路径扫描和显式服务端路径读取通过 Node 文件系统访问完成。

按需登录 GitHub CLI 并刷新 Copilot scope：

```bash
gh auth login
gh auth refresh --scopes copilot
```

## 本地开发

安装依赖：

```bash
npm install
```

运行语法检查：

```bash
npm run check
node --check public/app.js
```

启动本地服务：

```bash
npm start
```

打开：

```text
http://localhost:4173
```

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `4173` | 本地 Web 服务端口。 |
| `SKILL_ROOT` | `~/.agents/skills` | 当路径存在时，作为初始默认 Skill 根目录写入扫描表。 |
| `SKILL_ANALYSIS_DB` | `~/.skill-logic-visualizer/analysis.sqlite` | SQLite 数据库路径，用于目录注册和 AI 分析缓存。 |

示例：

```bash
PORT=5173 SKILL_ROOT=/Users/me/.agents/skills npm start
```

## 使用流程

1. 启动应用并打开 `http://localhost:4173`。
2. 点击 **扫描**，从默认目录表中发现已知 Agent Skill 路径。
3. 点击 **选择本地 Skills 目录** 添加自定义路径。应用会先扫描目录，展示 Skill 数量，允许设置显示名称，然后保存完整路径。
4. 从侧边栏选择一个 Skill。
5. 查看默认规则分析：逻辑图、工具、触发 Prompt、运行方法、文件和复杂度。
6. 点击 **AI评估**，生成模型驱动的逻辑图、复杂度、ROI、人工耗时估算和 Prompt/使用场景。结果会缓存在 SQLite 中。

## 部署与运行说明

该应用设计为本地开发者工具，典型部署方式是在本机启动绑定到 `localhost` 的 Node 进程。

长期运行本地进程：

```bash
nohup npm start > /tmp/skill-logic-visualizer.log 2>&1 &
```

如果按生产方式托管，需要保持 Node 服务端和静态资源一起部署，因为前端依赖服务端 API 完成文件系统访问、SQLite 存储、GitHub 登录状态读取和 Copilot SDK 评估。如果将服务暴露到 localhost 之外，请做好访问保护：该服务可以读取数据库中配置的本地 Skill 目录。

## 数据存储

应用运行状态存储在 SQLite 中，不写入仓库：

```text
~/.skill-logic-visualizer/analysis.sqlite
```

其中包含默认目录、已扫描/自定义目录和模型分析缓存。删除该文件会重置已发现目录和 AI 评估缓存。
