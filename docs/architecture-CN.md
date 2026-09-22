# 技术架构

[English](architecture.md) · [文档索引](README.md) · [项目首页](../README-CN.md)

## 运行拓扑

```text
React 19 + Vite + Tailwind CSS v4 + shadcn/Radix
  └─ 桌面模式下携带每次启动 token 的 HTTP API
     └─ Node/Express sidecar
        ├─ node:sqlite DatabaseSync
        ├─ 文件系统 Skill 扫描与读取
        ├─ 本地规则分析与图谱构建
        ├─ GitHub Device OAuth / 可选 gh CLI 集成
        └─ GitHub Copilot SDK 模型、评估与翻译流程

Tauri 2 桌面壳
  ├─ 内嵌 public/dist
  ├─ 内嵌官方 Node 24.11.1 runtime 和 sidecar 资源
  ├─ 使用随机端口和 UUID token 在 127.0.0.1 启动 sidecar
  └─ 将 SQLite 保存到平台应用数据目录
```

Web 开发模式直接提供相同的 React 构建和 Express API。桌面模式保持 API 合同不变，由 Tauri 管理进程生命周期、端点发现和应用数据位置。

## 主要流程

### 启动

1. 前端请求 `/api/config`、`/api/skill-roots` 和首个根目录的 Skill 列表。
2. fallback 模型元数据立即可用。
3. 后台检查 GitHub 状态。
4. live Copilot 模型延后到首次打开设置时读取，并在页面会话内缓存。

### Skill 检查

1. 选择 Skill 时，携带根目录、相对路径和语言请求 `/api/skills/:name`。
2. 服务端验证请求路径仍在选中根目录内。
3. 读取 `SKILL.md`、描述候选文件和受限的支撑文件样本。
4. 规则分析提取触发条件、工具、方法、证据、文件统计和横向图谱。
5. UI 不等待 AI 即可渲染结果。

### AI 评估

1. 前端检查 `/api/logic-map/cache`。
2. 缓存未命中时，携带 request ID 调用 `/api/logic-map/generate`。
3. 服务端分别执行评分、洞察/触发 Prompt、图谱生成等 Copilot SDK 调用。
4. `/api/progress/:requestId` 提供进度。
5. 合并后的 `ModelAnalysis` 连同模型、语言、内容哈希和 schema 元数据写入缓存。

### Skill.md 翻译

1. 前端检查 `/api/skill-translation/cache`。
2. 缓存未命中时调用 `/api/skill-translation/generate`。
3. 后端在保持 Markdown 结构的同时翻译内容。
4. 结果写入缓存，并与原文并列展示。

### 桌面认证与 Sidecar

- Tauri 使用 `PORT=0` 和 CSPRNG UUID token 在 `127.0.0.1` 启动 sidecar。
- sidecar 通过 `AGENT_SMC_READY` 报告实际端口。
- Tauri 将 base URL 和 token 注入 WebView；页面重载后可通过 Tauri command 恢复。
- `/api/` 请求拒绝缺失或错误的 sidecar token。
- GitHub Device OAuth 让桌面用户无需安装 GitHub CLI 即可登录。

## 仓库结构

```text
server.js                     Express API 和应用编排
core/utils/                   共享 hash 与路径行为
server/                       服务端配置和响应 helper
setup/                        SQLite schema、数据库启动、默认根目录
src/                          React 应用和 shadcn/Radix primitives
src-tauri/                    Rust 桌面壳和 Tauri 平台配置
scripts/                      sidecar、DMG 和进程脚本
tests/                        Node 契约与运行时测试
docs/                         产品与贡献文档
web_template/                 独立可复用静态工作台模板
public/dist/                  生成的 Vite 输出（忽略）
data/                         Web 本地运行数据库（忽略）
release/                      本地发布暂存说明；二进制忽略
```

## 平台边界

- macOS 原生目录选择当前由 Node 服务端通过 `osascript` 实现。
- Windows 支持本地盘符、UNC 和 home 语义的默认目录发现与自定义路径；当前通过手工输入添加自定义路径。
- 桌面安装包内置目标平台 Node 和 Copilot runtime，用户无需安装 Node。
- sidecar API 仅绑定 localhost，并要求每次启动 token。
