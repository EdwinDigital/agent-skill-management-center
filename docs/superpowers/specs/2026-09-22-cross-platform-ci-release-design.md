# Cross-Platform CI and v1.0.0 Release Design

## 背景与目标

Agent SMC 当前已有 Tauri v2 桌面壳和 Node/Express sidecar，但桌面资源只面向 macOS ARM64：sidecar 启动器依赖 zsh、Copilot native runtime 固定为 `darwin-arm64`，应用还要求目标机器预装 Node。根服务入口近期也丢失了 sidecar 的随机端口握手和 token 校验，现有测试已能复现该回归。

本次改造需要建立可重复执行的 GitHub CI 和自动化 Release，并发布首个公开稳定版本 `v1.0.0`。正式 Release 包含：

- macOS ARM64 DMG。
- Windows x64 NSIS 安装包。
- Windows ARM64 NSIS 安装包。
- 三个安装包的 SHA-256 校验文件。

桌面应用必须自带 Node runtime，不能要求最终用户预装 Node。Windows 首次启动时应使用 Windows 用户目录初始化默认 Skill 根目录，并能扫描 CSV 中以 `~/` 表示的默认 Skill 目录以及用户提供的盘符路径和 UNC 路径。

## 方案选择

### 采用：目标 runner 原生组装 Node sidecar

每个 GitHub Actions runner 都使用目标架构的 Node 和 npm optional dependencies。sidecar 构建脚本复制 `process.execPath`、服务端源码、生产依赖和当前平台的 Copilot native runtime 到 Tauri resource 目录。Rust 直接启动随包 Node 可执行文件并传入 `server.js`。

选择该方案的原因：

- 延续现有 Express、SQLite 和 Copilot SDK 架构，改动范围最小。
- native npm 包和 Node runtime 都在目标架构 runner 上获得，不做不可靠的交叉编译。
- 不引入 `pkg`、`nexe` 或新的二进制封装依赖。
- Windows 与 macOS 共用一份 sidecar 协议和资源布局。

### 不采用：将 sidecar 编译为单文件

单文件 Node 打包器会增加 Copilot SDK 动态加载、native addon 和资源发现的兼容风险，也会引入新的构建依赖。

### 不采用：本次将后端重写为 Rust commands

这会把 CI/发布任务扩大为业务层迁移，无法保持当前 API、SQLite schema 和 Copilot SDK 行为稳定。

## 运行时架构

Tauri bundle 中的 sidecar 资源统一为：

```text
sidecar-node/
  runtime/
    node       # macOS
    node.exe   # Windows
  server.js
  server/
  setup/
  core/
  public/
  node_modules/
```

`scripts/build-sidecar-runtime.js` 使用当前 runner 的 `process.platform` 和 `process.arch` 得到目标键，例如 `darwin-arm64`、`win32-x64`、`win32-arm64`。脚本只保留该键对应的 native prebuild，并生成 Copilot loader 所需的兼容文件名 `runtime.<platform>-<arch>.node`。

Rust 不再执行 shell launcher。`src-tauri/src/lib.rs` 根据目标系统选择 `runtime/node` 或 `runtime/node.exe`，以 `server.js` 为第一个参数启动进程。进程继续使用：

- `HOST=127.0.0.1`
- `PORT=0`
- `AGENT_SMC_SIDECAR=1`
- 每次启动随机生成的 `AGENT_SMC_TOKEN`
- Tauri app data 目录下的 `SKILL_ANALYSIS_DB`

Node server 必须恢复以下桌面协议：

- 只按 `HOST` 绑定本机地址。
- 实际监听后输出 `AGENT_SMC_READY {"host":"...","port":...}`。
- 当设置 `AGENT_SMC_TOKEN` 时，所有 `/api/` 请求必须携带匹配 token。
- Tauri 与 localhost 开发来源允许必要 CORS 请求。

## GitHub OAuth

恢复现有前端已经调用的 GitHub Device OAuth 后端端点和本地 token 缓存。发布版不能假设 Windows 或 macOS 用户已安装 GitHub CLI；Device OAuth 是桌面应用启用 Copilot SDK 的默认登录路径。GitHub CLI 仍作为开发环境的兼容认证方式保留。

## Windows Skill 路径

`core/utils/paths.js` 成为路径展开与规范化的唯一实现，`server.js`、`server/config.js` 和 `setup/database.js` 均复用它。

规则如下：

- 未设置 `SKILL_ROOT` 时使用 `path.join(os.homedir(), ".agents", "skills")`；Windows 上自然得到 `%USERPROFILE%\.agents\skills`。
- `~/skills` 与 `~\skills` 都展开到当前用户目录。
- Windows 原生运行时接受 `C:\...`、`D:/...` 和 `\\server\share\...`。
- 相对路径基于项目当前工作目录解析。
- `browser://` 根目录保持原值，不参与文件系统规范化。
- CSV 中的默认全局 Skill 路径先展开再检查；只有真实存在的目录才写入扫描表。
- 默认根目录和 CSV 展开后指向同一位置时复用规范化绝对路径，避免重复扫描。

测试通过注入 `path.win32` 在任意开发系统上固定 Windows 语义，并在 `windows-latest` CI 中再执行一次完整 Node 测试套件。

Windows 文件夹选择器不继续调用 macOS `osascript`。本次发布保留手工输入本地路径作为 Windows 添加目录的可用路径；原生 Windows picker 属于后续 Tauri dialog 迁移范围，不阻塞默认目录初始化与扫描。

## 平台配置与产物

主 `tauri.conf.json` 保存共享窗口、资源和图标配置。平台覆盖文件负责 bundle target：

- `tauri.macos.conf.json`：DMG、macOS 12.0 最低版本、ad-hoc signing。
- `tauri.windows.conf.json`：NSIS、per-user 安装。

产物上传前统一重命名：

```text
Agent-SMC-1.0.0-macos-arm64.dmg
Agent-SMC-1.0.0-windows-x64-setup.exe
Agent-SMC-1.0.0-windows-arm64-setup.exe
SHA256SUMS.txt
```

本次不发布 macOS Intel/x64、Linux、MSI 或 universal macOS 包。

## CI 工作流

`.github/workflows/ci.yml` 在 pull request 和 `main` push 时执行：

1. Ubuntu 质量检查：`npm ci`、Node tests、`npm run check`、`npm run build`、`cargo check`。
2. Windows x64 路径检查：`npm ci`、Node tests、`npm run check`。

CI 使用并发取消，新的同分支运行会取消旧运行。所有 jobs 使用最小只读仓库权限。

## Release 工作流

`.github/workflows/desktop-release.yml` 参考 ACR Dashboard 的 prepare/build/publish 三阶段：

1. `prepare` 校验 tag 必须严格等于 `v${package.json.version}`，并校验 package、Cargo 和 Tauri 三处版本一致；创建或复用草稿 Release。
2. `build` 使用 `fail-fast: false` 的三目标矩阵，每个 runner 原生执行 `npm ci`、测试、检查和 Tauri bundle。
3. 每个平台将重命名后的安装包作为 Actions artifact 上传，不直接并发写 Release。
4. `publish` 下载三个 artifact，验证目标集合完整，生成 `SHA256SUMS.txt`，上传到草稿 Release。
5. 仅 tag push 会把草稿转为公开 Release；手动运行只保留草稿，避免测试构建意外公开。

矩阵为：

| 名称 | Runner | Rust/Tauri 目标 | Bundle |
| --- | --- | --- | --- |
| macos-arm64 | `macos-14` | `aarch64-apple-darwin` | DMG |
| windows-x64 | `windows-latest` | `x86_64-pc-windows-msvc` | NSIS |
| windows-arm64 | `windows-11-arm` | `aarch64-pc-windows-msvc` | NSIS |

若 GitHub 账号对 `windows-11-arm` runner 不可用，该 job 会明确失败，Release 保持草稿且不会产生不完整正式版本。

## 版本与文档

`package.json`、`package-lock.json`、`src-tauri/Cargo.toml`、`src-tauri/Cargo.lock` 和 `src-tauri/tauri.conf.json` 统一为 `1.0.0`。README 与 `release/README.md` 补充三个下载包、平台架构选择、无签名提示和本地数据目录。

Release Notes 明确：

- Windows 安装包未代码签名，可能触发 SmartScreen。
- macOS 使用 ad-hoc 签名但未 Apple notarization，首次打开可能需要在隐私与安全性中确认。
- macOS 数据位于 `~/Library/Application Support/com.edwindigital.agent-smc/` 对应的 Tauri app data 目录。
- Windows 数据位于系统为该 bundle identifier 提供的 AppData 目录。

## 安全与失败处理

- Release workflow 仅授予 `contents: write`；CI 保持 `contents: read`。
- sidecar 仅绑定 `127.0.0.1`，并以每次启动 token 保护 API。
- token 不写入日志、数据库或 Release artifact。
- 构建日志不得打印 OAuth token 或完整认证响应。
- 任一目标失败时 `publish` 不执行，Release 保持草稿。
- 安装包数量或命名不符合预期时发布 job 失败。

## 测试策略

遵循红绿重构：

1. 扩展路径测试，先验证 `~\`、盘符、UNC 和 browser root 行为失败，再实现共享 helper。
2. 扩展 sidecar 静态契约测试，先验证随包 Node、动态 native target 和 Rust 直接启动失败，再修改构建脚本和 Rust。
3. 保留现有失败测试，恢复 sidecar 握手与 Device OAuth 后确认转绿。
4. 新增 workflow 契约测试，校验触发器、权限、三目标矩阵、完整产物 gate 和版本 gate。
5. 运行完整 Node tests、`npm run check`、`npm run build`、`cargo test`/`cargo check`。
6. 推送普通提交后确认 CI 成功，再创建并推送 `v1.0.0` tag。
7. 监控 Release workflow，核对三个安装包和校验文件，再确认 Release 已公开。

## 验收标准

- pull request 与 `main` push 自动运行 CI。
- `v1.0.0` tag 自动构建三个目标并创建正式 GitHub Release。
- 三个平台的 app 不依赖系统预装 Node。
- macOS ARM64、Windows x64、Windows ARM64 安装包均附加到 Release。
- Windows 默认 Skill 根目录来自 Windows 用户目录，默认目录扫描和自定义绝对路径可用。
- 完整测试、TypeScript 检查、前端构建与 Rust 检查通过。
- Release 公开前经过版本一致性、产物完整性和 SHA-256 校验 gate。
