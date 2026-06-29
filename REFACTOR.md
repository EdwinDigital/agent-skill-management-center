# Refactor Plan for Tauri Desktop Readiness

## 目标

本项目当前是本地优先的 Agent Skill Management Center：React/Vite 前端、Express/Node API、`node:sqlite` 本地数据库，并通过 GitHub Copilot SDK 做模型分析与翻译。未来目标是将它改造成可以用 Tauri 封装和发布的桌面应用，支持 macOS 和 Windows。

最终形态应该满足：

- 前端继续使用 React + Vite，作为 Tauri WebView UI。
- 核心业务逻辑从 Express HTTP 层中剥离，成为可被多种运行时复用的 core modules。
- 短期仍可用 `npm start` 作为本地 Web 控制台运行。
- 中期可用 Tauri + Node sidecar 快速打包桌面版。
- 长期逐步迁移高价值本地能力到 Rust/Tauri commands，减少对本地 HTTP server 的依赖。
- macOS 与 Windows 发布流程可复现，包括签名、公证、安装包和自动更新的预留设计。

## Tauri 相关判断

Tauri 的基本模型是：

- UI 使用任何能编译为 HTML/CSS/JS 的前端框架。
- 桌面窗口使用系统 WebView。
- 后端能力优先由 Rust binary 暴露 command/API 给前端调用。
- Tauri 不要求通过 localhost HTTP server 提供 UI，官方能力包含 native WebView protocol。
- 可以使用 sidecar 运行额外可执行文件，但 sidecar 更适合作为迁移阶段或不可迁移能力的兼容层。

因此，本项目不应该为了“桌面化”先引入更重的 Express 框架。真正重要的是把 `server.js` 中的业务逻辑、数据访问、系统能力和 HTTP adapter 解耦。

## 当前完成状态（2026-06-29 校验）

已完成和部分完成状态以当前仓库文件、测试和构建产物为准，不代表长期目标全部完成。

- [x] Phase 0 现状稳定与安全网：已建立 Node 测试、TypeScript/Node 检查和 Tauri/Rust 检查链路；`server.js` 仍保留为行为参考。
- [~] Phase 1 Express route 拆分：已完成 `server/config.js` 试点和启动配置集中化；尚未创建 `server/app.js`、`server/routes/*.routes.js` 和统一 middleware，因此 route 拆分整体未完成。
- [~] Phase 2 Core service 拆分：已完成 `core/utils/hash.js`、`core/utils/paths.js` 等低风险工具拆分；`progress.service.js`、Skill service、Copilot service、模型分析和翻译服务仍未拆出。
- [ ] Phase 3 Repository 拆分：SQLite repository 层尚未独立完成，SQL 仍主要保留在现有运行路径中。
- [~] Phase 4 Runtime adapter 抽象：桌面 sidecar 已通过环境变量区分 host、随机端口、token 和数据库路径；完整 `runtime` context、filesystem/picker/model provider 抽象尚未完成。
- [x] Phase 5 Tauri sidecar macOS 预览版：已添加 Tauri v2 scaffold、Node sidecar runtime、随机 localhost 端口、per-launch token、WebView API 注入、app data 目录数据库、应用退出清理 sidecar、macOS `.dmg` 发布产物和 DMG 图标处理。
- [ ] Phase 5 Windows 预览版：尚未构建或验证 Windows 安装包/开发版。
- [~] 前端桌面适配：已支持桌面注入 API base URL/token、设置页和快捷键百分比缩放；尚未引入正式 `src/lib/api/` client contract。
- [ ] Phase 6 Tauri command 迁移：尚未开始，Node sidecar 仍承担 API、SQLite、文件扫描和 Copilot SDK 能力。
- [ ] 正式发布签名/公证/自动更新：当前 DMG 是本地测试发布包，尚未完成 Developer ID 签名、公证、staple 或自动更新签名。

最近一次校验已通过：`node --test tests/*.test.mjs`、`npm run check`、`cargo check --manifest-path src-tauri/Cargo.toml`、`hdiutil verify release/Agent SMC_1.1.1_aarch64.dmg`。

## 代码结构改进目标

当前目录结构已经符合 Tauri 官方推荐的“双项目”形态：顶层 `src/` 是 React/Vite 前端项目，`src-tauri/` 是 Rust/Tauri 桌面项目。后续改进不应合并这两个 `src`，而应围绕源码、生成物、运行时资源和业务分层边界继续收敛。

目标：

- 保持 `src/` 作为唯一前端 UI 源码目录，避免把 Tauri/Rust 逻辑、Node API 逻辑或构建产物放入前端源码树。
- 保持 `src-tauri/src/` 作为唯一 Rust/Tauri 桌面壳源码目录；`main.rs` 只保留桌面入口，Tauri 初始化、窗口生命周期、sidecar 管理和未来 commands 放在 `lib.rs` 或拆到 `src-tauri/src/commands/`、`src-tauri/src/services/`。
- 补齐 `src-tauri/capabilities/`。当开始使用 Tauri commands、dialog、fs、shell 或插件权限时，把最小权限写入 capability 文件，不把权限隐式散落在代码中。
- 将 `src-tauri/sidecar-node/` 明确为生成目录和打包资源目录，继续由 `scripts/build-sidecar-runtime.js` 生成并保持 Git 忽略；长期目标是缩小为 Copilot SDK provider，或被 Rust/Tauri commands 替代。
- 新增 `src/lib/api/`，把前端 API contract、HTTP client、desktop-sidecar client 和未来 Tauri invoke client 统一起来，避免 UI 组件直接拼接 `/api`、读取全局注入变量或处理 token。
- 继续把 `server.js` 变薄：`server/` 只作为 Express/HTTP adapter，业务逻辑迁入 `core/services/`，SQLite 访问迁入 `core/repositories/`，外部能力迁入 `core/providers/` 或 runtime adapters。
- 保持 `setup/` 只管理 schema、seed 和迁移初始化；不要让业务查询继续扩散到 setup 脚本。
- 保持 `public/dist/`、`data/`、`src-tauri/target/`、`src-tauri/gen/`、`src-tauri/sidecar-node/` 为构建/运行生成物，不进入源码管理。
- `release/` 仅作为本地发布产物暂存和发布说明目录；正式发布后优先由 CI artifact 或 GitHub Releases 管理 DMG/MSI/NSIS 等二进制产物。

结构改进优先级：

1. 前端先落 `src/lib/api/`，降低 UI 与 HTTP/desktop 注入细节耦合。
2. 后端先落 `server/app.js`、`server/routes/`、`server/middleware/`，把 Express 适配层从 `server.js` 拆出。
3. Core 先落 `progress.service.js`、`language/localization`、`skill-root/skill-index/skill-reader`，让扫描和读取能力能被 Web、sidecar 和未来 Tauri commands 复用。
4. Repository 再集中 SQLite 查询，避免迁移 Rust/Tauri 时重复理解 SQL 行为。
5. Tauri commands 最后按价值迁移 filesystem、picker、SQLite、progress、error logs；Copilot SDK provider 暂时保留 Node sidecar，直到确认有稳定替代方案。

## 当前问题

当前 `server.js` 集中了过多职责：

- Express app 初始化和中间件。
- API route 注册。
- 请求参数解析和错误响应。
- SQLite 查询和缓存写入。
- Skill root 扫描、索引、读取。
- 规则分析和逻辑图生成。
- GitHub CLI 授权检查。
- GitHub Copilot SDK 客户端、session、模型列表、分析和翻译调用。
- prompt 拼装和模型 JSON 解析。
- 进度状态存储和本地化消息。

这会带来几个问题：

- Express route 很难复用到 Tauri command。
- 数据访问和业务逻辑耦合，无法独立测试。
- Copilot SDK 生命周期逻辑分散在多个 route 中。
- 将来迁移 Rust/Tauri 时，不清楚哪些能力应该迁、哪些应该作为 sidecar 保留。
- 文件超过 2400 行，局部修改容易影响无关功能。

## 总体改造原则

1. 先拆边界，不换运行时。
2. 保持现有 API 行为不变，避免一次性重写。
3. 让 core modules 不依赖 Express 的 `request` 和 `response`。
4. 将数据库访问集中到 repository 层。
5. 将本地系统能力抽象为 adapter，方便未来换成 Tauri command。
6. 将 Copilot SDK 封装为独立 provider，避免 route 直接管理 session 生命周期。
7. 所有阶段都必须能通过 `npm run check` 和至少一次关键 API/browser 验证。
8. 不提交 `data/`、`public/dist/`、`node_modules/` 或本地运行产物。

## 桌面 UI 布局与缩放规范

Tauri WebView、浏览器调试页和 macOS 桌面窗口在滚动条、视口单位、固定定位和缩放行为上存在细微差异。后续 UI 调整必须遵守以下规则，避免重复出现侧栏错位、详情页宽度异常、滚动条遮挡和缩放后留白问题。

### 缩放实现

- 应用级缩放只使用 `--app-zoom-scale` 驱动 `.app-root { transform: scale(...) }`；不要再使用 CSS `zoom`，因为 `zoom` 会改变布局计算并导致详情页宽度和断点误判。
- `body` 和 `#root` 保持物理视口尺寸：`width: 100vw`、`min-height: 100vh`。
- `.app-root` 使用逻辑视口尺寸：`--app-viewport-width: calc(100vw / var(--app-zoom-scale))` 和 `--app-viewport-height: calc(100vh / var(--app-zoom-scale))`，再通过 transform 显示为目标比例。
- 不要在 `#root`、`.app-shell`、`.detail-main` 等嵌套容器重复应用 `--app-viewport-width`。缩放补偿只应发生在 `.app-root` 这一层。
- 修改缩放相关 CSS 时，必须验证 `tests/app-zoom.test.mjs`，并在调试浏览器中至少检查 100%、120%、140% 三档下详情页右边界不越界、不出现异常大边距。

### 左侧菜单

- 左侧菜单必须使用专用类 `.app-sidebar` 承载固定定位规则，不要使用 `.app-shell > aside` 这类宽泛选择器，避免误伤右侧 `SkillDocPanel`。
- 左侧菜单固定在窗口左侧，账户栏固定在菜单底部；页面滚动时侧栏整体不应跟随主内容滚动。
- 左侧栏内部只能让 Skill 列表区域滚动，账户栏、目录选择、扫描按钮和顶部品牌区不应被滚动带走。
- 折叠态宽度统一使用 `--app-rail-width`；展开态宽度使用 `clamp(14.5rem, 22vw, 16rem)`，不要写散落的魔法宽度。

### 右侧 Skill 定义栏

- 右侧 `SkillDocPanel` 和折叠 rail 的定位规则只能写在 `.skill-doc-panel` / `.skill-doc-panel.is-collapsed` 下，不能和左侧菜单共用 `aside` 选择器。
- 页面需要稳定预留浏览器滚动条空间，使用 CSS 原生 `scrollbar-gutter: stable`。不要用 JS 计算 `window.innerWidth - document.documentElement.clientWidth` 并写入像素偏移来规避滚动条。
- 右侧栏默认 `right: 0`，依赖 `scrollbar-gutter` 让它贴齐内容可用区域，而不是覆盖系统滚动条。
- 右侧折叠 rail 的宽度统一使用 `--skill-doc-rail-width`，不要与左侧 rail 宽度脱钩。

### 详情页内容区

- `.detail-main`、`.detail-surface`、`.detail-stack` 等主内容容器必须保持 `min-width: 0`，并用 `width: 100%` / `max-width: 100%` 限制在 grid 分配的列宽内。
- 详情页不应自行使用 viewport 宽度参与布局；它只消费 `.app-shell` 的中间列宽。
- 图谱、长路径、Prompt 列表等可能横向撑开的内容必须在内部 scroll area 中处理，不允许撑大 `.detail-main`。

### 调试与验收

- 日常 UI 调整优先用调试浏览器 `http://127.0.0.1:5173` 和 `npm run desktop:dev` 验证，不默认打包或安装 DMG。
- 只有涉及 DMG 文件本身、安装流程、Finder 图标、签名/公证、从 DMG 运行拦截或推出问题时，才运行 `npm run desktop:build:mac` 和 `hdiutil verify`。
- 修改布局、缩放或左右侧栏时，至少执行：`node --test tests/app-zoom.test.mjs`、`npm run check`、`npm run build`。
- 视觉验证时至少覆盖：侧栏展开/折叠、右侧 Skill 定义栏展开/折叠、页面滚动、100%/120%/140% 缩放、详情页宽度边界。

## 推荐目标目录结构

```text
src/
  App.tsx
  main.tsx
  index.css
  components/
    ui/
  lib/
    api/
      client.ts
      contracts.ts
      http-client.ts
      desktop-sidecar-client.ts
      tauri-client.ts
    utils.ts
  types.ts
src-tauri/
  Cargo.toml
  Cargo.lock
  build.rs
  tauri.conf.json
  icons/
  capabilities/
    default.json
  src/
    main.rs
    lib.rs
    commands/
    services/
  sidecar-node/          # generated, git-ignored
server.js
server/
  app.js
  config.js
  routes/
    config.routes.js
    progress.routes.js
    skill-roots.routes.js
    skills.routes.js
    github-auth.routes.js
    models.routes.js
    analysis.routes.js
    translation.routes.js
    error-logs.routes.js
  middleware/
    error-handler.js
    request-size-handler.js
  adapters/
    express-response.js
core/
  constants.js
  services/
    progress.service.js
    skill-root.service.js
    skill-index.service.js
    skill-reader.service.js
    rule-analysis.service.js
    graph-layout.service.js
    analysis-cache.service.js
    translation-cache.service.js
    copilot.service.js
    github-auth.service.js
    model-analysis.service.js
    markdown-translation.service.js
  repositories/
    skill-root.repository.js
    skill-index.repository.js
    analysis.repository.js
    translation.repository.js
    error-log.repository.js
  prompts/
    logic-map.prompts.js
    translation.prompts.js
  utils/
    errors.js
    hash.js
    json.js
    language.js
    localization.js
    paths.js
    filesystem.js
desktop/
  tauri-contract.md
  commands/
    skills.contract.md
    analysis.contract.md
    settings.contract.md
release/
  README.md
```

说明：

- `src/` 是前端源码层，继续遵循 React/Vite 约定；`src/lib/api/` 是后续 API contract 和运行时 client 的收敛点。
- `src-tauri/` 是 Tauri/Rust 项目层，继续遵循 Tauri 官方结构；`capabilities/` 在启用 Tauri commands/plugins 时承载最小权限配置。
- `server/` 是当前 Web/HTTP 适配层。
- `core/` 是可被 Express、Tauri sidecar、测试脚本和未来 Rust command 迁移参考复用的业务层。
- `desktop/` 存放 Tauri 适配规划和 command contract，不立即引入 Tauri 依赖也能先定义边界。
- `release/` 只保留发布说明或本地临时产物；正式二进制发布应由 CI artifact 或 release 系统承载。

## 分层设计

### 1. Route 层

Route 层只负责：

- 读取 `request.query`、`request.params`、`request.body`。
- 调用 service。
- 返回 JSON。
- 把异常交给统一错误处理。

不要在 route 中写：

- SQL。
- 文件系统递归。
- Copilot SDK session 管理。
- prompt 拼接。
- 复杂业务判断。

示例目标：

```js
router.get('/api/skills', asyncHandler(async (request, response) => {
  const root = resolveRequestedRoot(request.query.root);
  const language = normalizeLanguage(request.query.language);
  const skills = await skillReaderService.listSkills({ root, language });
  response.json({ root, skills });
}));
```

### 2. Service 层

Service 层负责业务用例：

- list skill roots。
- scan default roots。
- inspect local skill root。
- list skills。
- read skill details。
- generate rule analysis。
- generate model-backed logic map。
- generate markdown translation。
- cache lookup and save。

Service 输入输出应该是普通 JSON-like object，不依赖 Express。

### 3. Repository 层

Repository 层负责 SQLite 读写：

- `skill_directory_scan`
- `skill_directory_index`
- `skill_model_analyses`
- `skill_markdown_translations`
- `app_error_logs`

注意：当前运行时的 `node:sqlite` `DatabaseSync` 没有 `.transaction()` helper，多步写入继续使用显式：

```js
BEGIN IMMEDIATE
COMMIT
ROLLBACK
```

### 4. Provider/Adapter 层

需要抽象以下能力：

- filesystem provider：读取目录、文件、检查存在性、路径规范化。
- picker provider：macOS 现在用 `osascript`，Tauri 后可用 dialog plugin/command。
- auth provider：当前用 GitHub CLI 与环境变量，未来桌面端可能需要更明确的登录引导和凭据存储策略。
- model provider：当前是 GitHub Copilot SDK，未来可能仍由 Node sidecar 承担，也可能接入其它 provider。
- database provider：短期 `node:sqlite`，长期可考虑 Rust `rusqlite` 或 Tauri SQL plugin。

其中 picker provider 是桌面化后优先迁移的本地能力。当前 Web/Node 模式通过 Express 调用 `osascript` 间接打开 macOS 文件夹选择器，首次触发 Finder/AppleEvents 时存在明显冷启动开销；并且当前请求会等待用户选择目录后继续做目录 inspect，用户体感上会把系统对话框启动、目录选择和 Skill 扫描混成一次慢操作。Tauri 版应改为前端通过 Tauri dialog plugin 或 native command 直接打开目录选择器，绕开 `localhost -> Node -> osascript -> Finder` 的链路；选中目录后再调用 core service 扫描和索引。

## Tauri 适配路线

### 路线 A：Node sidecar 快速桌面版

这是最快可发布桌面 beta 的路线。

架构：

```text
Tauri WebView UI
  -> HTTP localhost
    -> Node sidecar Express server
      -> core services
      -> node:sqlite
      -> filesystem
      -> GitHub Copilot SDK
```

优点：

- 对现有代码改动最小。
- Express API 可以继续使用。
- Copilot SDK 兼容性风险较低。
- 可以较快产出 macOS/Windows 桌面应用。

缺点：

- 桌面包体更大，需要打包 Node runtime 或可执行 sidecar。
- 要管理 sidecar 端口、生命周期、崩溃重启。
- localhost API 需要做好只绑定 `127.0.0.1` 和随机端口/握手 token，避免本机其它进程误访问。
- 安全模型不如纯 Tauri command。

适合阶段：

- 第一版 desktop preview。
- 保留 Copilot SDK Node 能力。
- 快速验证桌面 UX、安装包、自动更新流程。

### 路线 B：Tauri Rust commands 长期版

长期目标是把本地系统能力迁到 Rust command。

架构：

```text
Tauri WebView UI
  -> invoke(command)
    -> Rust command layer
      -> Rust services/repositories
      -> SQLite
      -> filesystem/dialog/shell APIs
  -> optional Node sidecar only for Copilot SDK provider
```

优点：

- 更符合 Tauri 安全与小体积目标。
- 不需要常驻 localhost server。
- 文件系统、SQLite、系统对话框等能力更自然。
- macOS/Windows 打包体验更统一。

缺点：

- 需要把大量 JS 业务逻辑迁移或重写为 Rust。
- Copilot SDK 如果只能在 Node 环境稳定运行，仍需要 sidecar 或远程 provider。
- 迁移成本高，不适合一开始就做。

适合阶段：

- 桌面版功能稳定后。
- 逐步迁移 Skill 扫描、索引、SQLite、配置管理。
- 保留模型 provider 作为独立可替换模块。

## 桌面发布目标

### macOS

需要考虑：

- `.app` bundle。
- `.dmg` 安装包。
- Apple Developer ID 签名。
- notarization 公证。
- Gatekeeper 兼容。
- 后续自动更新签名。
- 文件访问权限和用户选择目录权限。

如果后续不上架 App Store，而是通过 `.dmg` 直接下载分发，Tauri 官方支持这种路径，但正式分发仍需要满足 Apple 的桌面应用安全要求：

- `.dmg` 只是安装载体，内部核心仍是 `.app` bundle。
- 构建 `.app`/`.dmg` 需要在 macOS 环境完成。
- 面向外部用户的正式版本需要付费 Apple Developer Program。
- App Store 外分发应使用 `Developer ID Application` 证书签名，而不是 App Store 使用的 `Apple Distribution` 证书。
- 只有 Apple Developer 账号的 `Account Holder` 可以创建 Developer ID Application 证书。
- 免费 Apple Developer 账号只适合开发测试，不能完成 notarization，用户打开时仍会看到未验证提示。
- App Store 外分发需要 notarization 公证，并在产物上 staple 公证票据，才能减少 Gatekeeper 拦截和“无法验证开发者”的体验问题。
- 公证可通过 App Store Connect API Key 或 Apple ID 凭据完成；CI 中更适合使用 API Key 和密钥文件。
- 如果第一版采用 Node sidecar，sidecar 可执行文件、嵌入资源、额外 dylib/framework 也必须被正确打包和签名，否则 notarization 或 Gatekeeper 可能失败。
- Tauri 支持 ad-hoc signing（`signingIdentity` 为 `-`），但这只适合内部测试；用户仍可能需要在系统“隐私与安全性”里手动允许打开。

DMG 体验层面可以配置背景图、窗口尺寸、App 图标位置和 Applications 文件夹图标位置，但这些不是合规门槛。真正的发布门槛是 `.app` bundle 的签名、公证、Gatekeeper 兼容，以及 sidecar/额外二进制的签名完整性。

### Windows

需要考虑：

- `.msi` 或 `.exe` 安装包。
- 代码签名证书。
- WebView2 runtime 依赖。
- 用户数据目录位置。
- 防火墙/本地端口策略，如果使用 Node sidecar。
- 自动更新签名。

### 用户数据目录

当前数据库默认在项目相对路径：

```text
data/analysis.sqlite
```

桌面版不应继续使用项目目录作为默认数据位置。应迁移为平台应用数据目录：

- macOS：`~/Library/Application Support/<AppName>/analysis.sqlite`
- Windows：`%APPDATA%/<AppName>/analysis.sqlite` 或 Tauri app data dir
- Linux：`~/.local/share/<AppName>/analysis.sqlite`

迁移策略：

- [x] Web/dev 模式保留 `data/analysis.sqlite`。
- [x] Desktop sidecar 模式使用 Tauri app data dir，并通过 `SKILL_ANALYSIS_DB` 指向 `analysis.sqlite`。
- [ ] 启动时检测旧数据库并提供迁移/复制。
- [~] 不在常规 UI 中暴露绝对内部路径；调试/日志场景仍需继续审计。

## 分阶段实施计划

### Phase 0：现状稳定与安全网（已完成）

目标：在拆分前建立基本安全网。

任务：

- [x] 保持现有 API 行为不变。
- [x] 整理关键验证命令：`npm run check`、`npm run build`、浏览器核心流程。
- [x] 记录关键 API：
  - `/api/config`
  - `/api/skill-roots`
  - `/api/skills`
  - `/api/skills/:name`
  - `/api/logic-map/cache`
  - `/api/logic-map/generate`
  - `/api/skill-translation/cache`
  - `/api/skill-translation/generate`
  - `/api/error-logs`
- [x] 保留现有 `server.js` 作为行为参考。

验收：

- [x] 无功能改动。
- [x] `npm run check` 通过。

### Phase 1：Express route 拆分（部分完成）

目标：把 HTTP route 从 `server.js` 中拆出。

任务：

- [x] 创建 `server/config.js` 作为低风险启动配置拆分试点。
- [ ] 创建 `server/app.js` 负责 Express app 创建、中间件、静态资源和 route 挂载。
- [ ] 创建 `server/routes/*.routes.js`。
- [ ] 创建 `server/middleware/error-handler.js`。
- [ ] `server.js` 变成启动入口：加载 config、创建 app、listen。

注意：

- 不先改业务逻辑。
- route 可以暂时从 service barrel 导入原函数。
- 每拆一个路由文件都跑 `npm run check`。

验收：

- [x] 所有 API 路径保持不变。
- [x] `npm run check` 通过。
- [ ] `npm start` 可正常启动的最新轮次验证待补充。

### Phase 2：Core service 拆分

目标：把业务逻辑从 route 和 `server.js` 中拆出。

优先顺序：

1. `progress.service.js`
2. `language/localization` utils
3. `paths/filesystem` utils
4. `skill-root.service.js`
5. `skill-index.service.js`
6. `skill-reader.service.js`
7. `rule-analysis.service.js`
8. `graph-layout.service.js`
9. `github-auth.service.js`
10. `copilot.service.js`
11. `model-analysis.service.js`
12. `markdown-translation.service.js`

验收：

- service 函数不接收 Express request/response。
- route 层只做参数组装和响应。
- `server.js` 明显缩小。

### Phase 3：Repository 拆分

目标：集中 SQLite 访问。

任务：

- `skill-root.repository.js`
- `skill-index.repository.js`
- `analysis.repository.js`
- `translation.repository.js`
- `error-log.repository.js`

约定：

- repository 接收 `database` 实例或通过 context 注入。
- repository 不做 UI 文案本地化。
- transaction 显式 `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`。

验收：

- SQL 不再散落在 route/service 之外。
- 缓存读写逻辑可独立测试或脚本调用。

### Phase 4：Runtime adapter 抽象

目标：为 Tauri 做准备。

新增概念：

```js
const runtime = {
  mode: 'web' | 'desktop-sidecar' | 'tauri',
  filesystem,
  database,
  picker,
  auth,
  modelProvider,
  appDataDir
};
```

任务：

- 抽象 `filesystem`：stat/read/readdir/exists。
- 抽象 `picker`：当前 macOS `osascript`，未来 Tauri dialog。
- 抽象 `databasePath`：Web/dev 与 desktop app data dir 分开。
- 抽象 `modelProvider`：Copilot SDK 不直接散落在业务服务。

picker 抽象需要把“打开选择器”和“扫描目录”拆成两个步骤：picker 只返回用户授权的目录路径；Skill inspect/index 由 service 层异步执行。这样 Web/Node 模式可以继续保留 `osascript` fallback，Tauri 模式则使用原生 dialog，避免 AppleScript 冷启动和 localhost 往返造成的点击延迟。

验收：

- core service 可接收 runtime context。
- 不依赖 process.cwd() 作为唯一数据根。

### Phase 5：Tauri sidecar 预览版（macOS 已完成，Windows 待验证）

目标：先发布一个可用的桌面 preview。

任务：

- [x] 添加 `src-tauri/`。
- [x] 让 Vite build 作为 Tauri frontendDist。
- [x] 将 Node server 打成 sidecar 并作为应用资源打包。
- [x] Tauri 主进程负责：
  - [x] 启动 sidecar。
  - [x] 分配/读取 localhost 随机端口。
  - [x] 向前端注入 API base URL。
  - [x] 应用退出时关闭 sidecar。
- [x] Express server 在 desktop sidecar 模式只绑定 `127.0.0.1`。
- [x] 增加本地握手 token，前端请求带 token header。
- [x] macOS `.dmg` 产物输出到 `release/Agent SMC_1.1.1_aarch64.dmg`。
- [x] DMG 文件自身 Finder 图标已通过构建后脚本处理。
- [x] 关闭主窗口时退出应用并清理 sidecar，避免安装镜像无法推出。

验收：

- [x] macOS 可构建 `.app` 和 `.dmg`。
- [ ] Windows 可打开安装包或开发版。
- [~] Skill 扫描、逻辑图、缓存、翻译核心流程沿用 sidecar API；桌面实机完整流程仍需按测试用例逐项回归。

### Phase 6：Tauri command 迁移

目标：逐步减少 Node sidecar 依赖。

优先迁移：

1. app config。
2. app data dir。
3. folder picker。
4. filesystem scan/read。
5. SQLite repository。
6. progress store。
7. error logs。

暂缓迁移：

- GitHub Copilot SDK model provider。
- 复杂 prompt orchestration。
- 需要 Node ecosystem 的能力。

验收：

- sidecar 缩小为 model provider，或完全移除。
- 前端 API 调用可通过 adapter 切换 HTTP 与 Tauri invoke。
- “添加路径”在 Tauri 模式下使用 native dialog，不再通过 Express 调 `osascript` 打开 macOS 文件夹选择器。

## 前端适配建议

当前前端直接通过 `/api/...` 调用后端。为了适配 Tauri，应引入 API client 层：

```text
src/lib/api/
  client.ts
  http-client.ts
  tauri-client.ts
  contracts.ts
```

目标：

- UI 不直接写 fetch URL。
- Web 模式用 HTTP client。
- Tauri 模式可用 invoke client。
- 类型和 payload contract 在一处维护。

示例：

```ts
const api = createApiClient(runtimeMode);
await api.skills.list({ root, language });
await api.logicMap.generate({ skill, model, language, requestId });
```

## 安全设计

桌面版尤其要注意：

- 如果使用 localhost sidecar，只绑定 `127.0.0.1`。
- 使用随机端口，不固定暴露 4173。
- 使用 per-launch token，前端请求必须带 token。
- 不允许任意路径读写，只允许用户授权的 Skill roots 和 app data dir。
- 记录错误日志时避免写入 token、密钥、完整敏感路径。
- GitHub token 优先使用系统安全存储或用户环境，不写入普通配置文件。
- 对外部命令调用设置 timeout 和参数白名单。

## 发布流水线建议

### macOS

需要准备：

- Tauri build profile。
- app icon。
- bundle identifier。
- Apple Developer ID certificate。
- notarization credentials。
- `.dmg` 产物。
- 自动更新 signing key。
- 如果使用 Node sidecar，准备 sidecar 打包、签名和生命周期管理策略。
- 如果使用 GitHub Actions 等 CI，准备 `.p12` 证书的 base64 Secret、证书密码、App Store Connect API Key、Issuer ID 和 Key ID。

CI 可分阶段：

1. `npm run check`
2. `npm run build`
3. `cargo test`（引入 Tauri 后）
4. `tauri build --target universal-apple-darwin --bundles dmg` 或按架构构建
5. codesign `.app`、sidecar 和嵌入的额外二进制
6. notarize `.dmg` 或待分发产物
7. staple 公证票据
8. 在干净 macOS 机器上下载、打开并验证 Gatekeeper 行为
9. upload artifacts

### Windows

需要准备：

- WebView2 runtime 策略。
- code signing certificate。
- MSI/NSIS 配置。
- 自动更新 signing key。

CI 可分阶段：

1. `npm run check`
2. `npm run build`
3. `cargo test`
4. `tauri build`
5. sign installer
6. upload artifacts

## 不建议立即做的事

- 不建议立刻换 NestJS。它会引入大量框架结构，但不会直接解决 Tauri command 适配问题。
- 不建议立刻把所有 Node 逻辑迁 Rust。当前业务逻辑还在快速变化，应先稳定边界。
- 不建议把 Express route 和 Tauri command 同时写两套业务逻辑。应该共用 core service 或先明确 contract。
- 不建议在桌面版继续默认写 `data/analysis.sqlite` 到项目目录。
- 不建议提交构建产物 `public/dist` 或本地数据库。

## 推荐近期落地任务

第一批小步改造：

1. [x] 新增 `server/config.js`，集中端口、路径、schema version、常量。
2. [ ] 新增 `core/utils/language.js`，迁移 `normalizeLanguage`、`localize`、progress 文案。
3. [x] 新增 `core/utils/hash.js`，迁移 `hashText`。
4. [x] 新增 `core/utils/paths.js`，迁移 `expandHomePath`、`resolveProjectPath`、`normalizeScanPath`。
5. [ ] 新增 `core/services/progress.service.js`，迁移 progress store。
6. [ ] 新增 `server/routes/config.routes.js` 和 `server/routes/progress.routes.js` 作为最小 route 拆分试点。

这批任务风险低，能验证目录结构和 import 方式，不触碰 Copilot SDK 主流程。

第二批改造：

1. 拆 `skill-root.service.js` 和 `skill-root.repository.js`。
2. 拆 `skill-index.service.js` 和 `skill-index.repository.js`。
3. 拆 `skill-reader.service.js`。
4. 让 `/api/skill-roots`、`/api/skills`、`/api/skills/:name` route 变薄。

第三批改造：

1. 拆规则分析和 graph layout。
2. 拆 Copilot SDK provider。
3. 拆模型分析和翻译服务。
4. 定义 Tauri command contract。

## 验收标准

每个阶段完成时至少满足：

- `npm run check` 通过。
- `npm run build` 通过，如果前端或打包相关变更。
- 本地 `npm start` 能启动。
- Skill root 扫描可用。
- Skill 列表可用。
- Skill 详情可读。
- 规则逻辑图可显示。
- AI 评估缓存接口不回归。
- 错误日志接口可用。
- 未提交 `data/`、`public/dist/`、`node_modules/`。

## 长期目标状态

理想最终状态：

```text
React/Vite UI
  -> api client contract
    -> Web mode: Express adapter
    -> Desktop mode: Tauri invoke adapter

Core domain modules
  -> Skill scanning
  -> Skill reading
  -> Rule analysis
  -> Logic graph layout
  -> Translation orchestration
  -> Model analysis orchestration

Runtime providers
  -> filesystem: Node or Tauri
  -> database: node:sqlite or Rust SQLite
  -> picker: osascript/browser/Tauri dialog
  -> model: Copilot SDK sidecar/provider
  -> progress: memory/store
```

这样项目可以同时支持：

- 开发期 Web 控制台。
- 本地 Node 服务运行。
- Tauri sidecar 桌面版。
- 长期 Tauri native command 桌面版。

最关键的是：不要把业务逻辑继续写进 Express route，也不要把未来 Tauri command 写成另一套重复业务逻辑。所有改造都应该朝向一个共享 core，多个 adapter。