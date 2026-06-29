# 项目背景

这是一个本地优先的 Agent Skill Management Center，用于探索、审计、翻译和 AI 评估本机 Agent Skills。应用会扫描 Skill 根目录，读取 Skill 定义与文件树，立即展示规则分析和横向逻辑图，并可通过 GitHub Copilot SDK 生成模型驱动的复杂度、ROI、模型洞察、触发 Prompt 和 Skill.md 翻译。

技术栈：Node.js + Express + React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/Radix UI。数据库使用 Node `node:sqlite` 的 `DatabaseSync`，默认项目相对路径为 `data/analysis.sqlite`，`data/` 不进入 Git 版本控制。生产构建输出到 `public/dist`，由 `server.js` 和 API 一起提供服务。

主要入口：
- `server.js`：Express API、SQLite 初始化、Skill 扫描、GitHub CLI 状态、Copilot SDK 模型列表/AI 评估/翻译、进度轮询、错误日志。
- `src/App.tsx`：主前端状态与 UI 流程，包括设置、目录管理、Skill 列表、逻辑图、AI 评估、翻译和缓存读取。
- `src/components/ui/`：shadcn/Radix UI primitives。
- `src/index.css`：Tailwind v4、主题变量和本地字体。
- `vite.config.js`：Vite 配置，开发代理 `/api -> http://localhost:4173`，构建输出 `public/dist`。
- `scripts/stop.js`：停止监听 `PORT` 的本地服务。

# 工作规范

- 回答和协作默认使用中文；代码里的变量、函数、类型、文件名保持英文。
- 新增注释优先用中文，但只在复杂逻辑需要解释时添加；不要写显而易见的注释。
- 改动前先简要说明要改什么；如果用户给了明确修改请求，可以直接实现、验证并总结。
- 优先保持现有架构和风格：React 函数组件、shadcn/Radix 封装、lucide 图标、Sonner 通知、Express API、原生 Node 模块。
- 前端主逻辑集中在 `src/App.tsx`，新增抽象只有在明显降低复杂度或匹配现有模式时才做。
- UI 改动要考虑中文显示、移动/桌面布局、按钮文字不溢出、Dialog/Select Portal 的交互边界。
- Radix Select content 是 Portal；当前 Select Root 类型没有 `modal` 属性。Dialog 内嵌 Select 时，用 Dialog `onInteractOutside` guard 处理 Select Portal，避免误关闭。
- GitHub Copilot SDK 官方说明文档入口：https://github.com/github/copilot-sdk/blob/main/docs/README.md。涉及 Copilot SDK 的客户端创建、认证、模型列表、会话生命周期、持久化、工具权限、AI 评估或翻译调用时，先根据该文档及其链接的专题页核对实现，再进行开发。
- AI 评估准确性优先：不要为了避免超时压缩/丢弃 Skill 内容；可以拆分模型调用，但每一步应使用完整可用上下文和规则分析。
- AI 评估当前拆分为评分、洞察/触发 Prompt、图谱三段模型调用，合并成原有 `ModelAnalysis` 结构。
- 复杂度和 ROI 默认必须是未评估；只有 AI 评估返回模型分数后才展示分数。
- 设置中的 live Copilot 模型列表只在当前页面会话首次打开设置时读取；同一页面里再次打开设置应使用页面缓存。
- 数据库表名使用下划线命名，继续沿用 `skill_model_analyses`、`skill_markdown_translations`、`skill_directory_defaults`、`skill_directory_scan`、`app_error_logs`。
- 本地运行数据必须保持在 `data/` 或 `SKILL_ANALYSIS_DB` 指定路径，默认不要改回用户 home 目录。
- 读写文件时优先使用结构化 API 或现有 helper，不要用脆弱的字符串拼接替代已有解析/规范化逻辑。

# 构建、运行与验证

常用命令：

```bash
npm install
npm run check
npm run build
npm start
npm stop
```

脚本含义：
- `npm run check`：执行 `node --check server.js && tsc --noEmit`，提交或交付前至少运行一次。
- `npm run build`：Vite 构建前端到 `public/dist`。
- `npm start`：执行 `npm run build && node server.js`，服务地址默认 `http://localhost:4173`。
- `npm stop`：通过 `lsof` 找到监听 `PORT` 的进程并发送 `SIGTERM`。
- `npm run dev`：启动 Vite dev server 到 `127.0.0.1:5173`，需要另行运行 `node server.js` 提供 API。

验证建议：
- 后端或前端代码改动后运行 `npm run check`。
- 影响构建/静态资源时运行 `npm run build` 或 `npm start`。
- 影响浏览器交互时重启服务并用浏览器验证 `http://localhost:4173`。
- 影响 AI 评估时至少用一个真实 Skill 验证 `/api/logic-map/generate` 和 `/api/logic-map/cache`。
- 影响数据库路径或表结构时验证首次启动能自动创建 `data/analysis.sqlite`。

# 数据结构与缓存约定

默认 SQLite 路径：`data/analysis.sqlite`。

主要表：
- `skill_directory_defaults`：内置 Agent Skill 目录约定。
- `skill_directory_scan`：已扫描/自定义 Skill 根目录。
- `skill_model_analyses`：AI 评估缓存，主键为 `(skill_path, language)`，并保存 `model`、`content_hash` 和 `analysis_json`。
- `skill_markdown_translations`：Skill.md 翻译缓存，主键为 `(skill_path, language)`。
- `app_error_logs`：结构化 API/运行时错误日志。

缓存规则：
- AI 评估和翻译需要按 Skill 路径、语言、模型、内容哈希和 schema 判断是否可复用。
- 不要把 `data/`、`public/dist/`、`node_modules/` 加入 Git。
- 清空数据库用于首次启动验证时，删除 `data/analysis.sqlite` 后再启动服务即可。

# 禁止项

- 不要主动重构用户没有要求的文件。
- 不要删除任何源码、文档或配置文件，除非用户明确要求；临时数据清理也要说明目的。
- 不要在未确认的情况下执行 `npm install`、升级依赖或引入新包。
- 不要提交 Git commit，除非用户明确说“提交”。
- 不要使用 `git reset --hard`、`git checkout --` 等会丢弃用户改动的命令，除非用户明确要求。
- 不要把本地数据库、构建产物、日志或 `node_modules` 纳入版本控制。
- 不要把 GitHub/Copilot 认证问题误判为模型生成问题；先检查 `/api/auth/github/status?check=1` 和 `/api/models?live=1`。
- 不要为了规避 AI 超时而压缩掉 Skill 内容导致分析失真；优先拆分步骤或调整超时/重试策略。
- 不要把 `SKILL_ANALYSIS_DB` 默认值改回 `~/.skill-logic-visualizer/analysis.sqlite`。

# 官方 Copilot 自定义指令约定

- 根目录 `AGENTS.md` 是 AI agents 的仓库级说明。若未来添加子目录级 `AGENTS.md`，最近的文件优先生效。
- `.github/copilot-instructions.md` 是 GitHub Copilot 仓库级 custom instructions。
- `.github/instructions/*.instructions.md` 可用于路径特定规则，必须包含 `applyTo` frontmatter；不要随意用 `applyTo: "**"` 增加全局上下文，除非规则确实适用于所有文件。
- 若多个指令文件同时生效，避免互相冲突；以本文件和 `.github/copilot-instructions.md` 的项目事实为准。

# 压缩时保留

长对话被自动压缩时，按优先级保留：

1. 架构决策和它背后的理由，尤其是 AI 评估拆分、数据库项目相对路径、设置模型列表会话缓存、复杂度/ROI 未评估默认态。
2. 改过哪些文件、改了什么、是否已提交，以及提交号。
3. 当前运行状态：服务端口、是否已重启、最近一次 `npm run check` 或浏览器验证结果。
4. 当前未完成 TODO、失败原因、错误日志中的关键信息。
5. 用户明确偏好：中文协作、准确性优先、不主动重构、不擅自安装依赖、不擅自提交。
