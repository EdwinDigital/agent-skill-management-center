# API 参考

[English](api-reference.md) · [文档索引](README.md) · [项目首页](../README-CN.md)

Express API 默认位于 `http://localhost:4173`。Vite 开发服务器将 `/api` 代理到该地址。桌面模式下，Tauri 发现 sidecar 随机端口，并为每个 API 请求发送 `X-Agent-SMC-Token`。

## 接口

| 方法和路径 | 用途 |
| --- | --- |
| `GET /api/config` | 默认 Skill 根目录、语言和 fallback 模型。 |
| `GET /api/progress/:requestId` | AI 评估或翻译进度。 |
| `GET /api/skill-roots` | 已扫描和自定义 Skill 根目录。 |
| `POST /api/skill-roots/scan` | 扫描已知全局 Skill 路径约定并刷新索引。 |
| `POST /api/skill-roots/pick-local` | 打开 macOS 原生目录选择器并检查目录。 |
| `POST /api/skill-roots/custom` | 校验并保存自定义文件系统或浏览器根目录。 |
| `DELETE /api/skill-roots/:id` | 删除可移除的自定义根目录。 |
| `GET /api/skills` | 列出选中根目录下已索引的 Skills。 |
| `GET /api/skills/:name` | 读取 Skill 内容、文件、统计和规则分析。 |
| `GET /api/auth/github/status` | 读取 OAuth/环境变量/CLI 就绪状态；`?check=1` 执行实时检查。 |
| `POST /api/auth/github/login` | 返回 Web 开发环境的 GitHub CLI 指引。 |
| `POST /api/auth/github/device/start` | 启动 GitHub Device OAuth，返回验证 URI 和 code。 |
| `POST /api/auth/github/device/poll` | 轮询 Device OAuth 请求并保存 token。 |
| `POST /api/auth/github/logout` | 清除本地 OAuth，并在存在时注销 GitHub CLI 身份。 |
| `GET /api/models` | 返回 fallback 模型；`?live=1` 返回 Copilot SDK live 模型。 |
| `POST /api/analyze-skill` | 兼容旧版的模型洞察接口，失败时使用规则 fallback。 |
| `POST /api/logic-map/cache` | 检查模型分析缓存元数据和结果。 |
| `POST /api/logic-map/generate` | 生成并缓存评分、洞察、Prompt 和图谱。 |
| `POST /api/skill-translation/cache` | 检查 Skill.md 翻译缓存。 |
| `POST /api/skill-translation/generate` | 翻译并缓存 Skill.md。 |
| `GET /api/error-logs` | 最近的结构化服务端错误。 |

## 配置

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | Node 默认值 | 绑定地址。桌面端固定设置为 `127.0.0.1`。 |
| `PORT` | `4173` | Express 端口；桌面端使用 `0` 选择随机端口。 |
| `SKILL_ROOT` | `~/.agents/skills` | 存在时写入的初始根目录。 |
| `SKILL_ANALYSIS_DB` | `data/analysis.sqlite` | SQLite 路径；桌面端覆盖为应用数据目录。 |
| `AGENT_SMC_SIDECAR` | 未设置 | 启用 `AGENT_SMC_READY` 启动消息。 |
| `AGENT_SMC_TOKEN` | 未设置 | 提供时保护 `/api/` 路由。 |
| `COPILOT_GITHUB_TOKEN` | 未设置 | 最高优先级 GitHub token。 |
| `GH_TOKEN` / `GITHUB_TOKEN` | 未设置 | 其他环境 token 来源。 |
| `GITHUB_OAUTH_CLIENT_ID` | 内置 client ID | Device OAuth client 覆盖值。 |
| `GITHUB_OAUTH_SCOPES` | `read:user user:email copilot` | Device OAuth 请求的 scopes。 |

相对数据库路径从项目目录解析。文件系统根目录支持本地绝对路径、相对路径、`~/...` 和 `~\...`。Windows 使用盘符和 UNC 语义。`browser://selected` 等浏览器根目录不会进行文件系统规范化。

## 认证

Token 优先级依次为 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN`、本地 Device OAuth。只有 scopes 包含 `copilot` 时，本地 token 才视为 Copilot 就绪。

Web 开发可使用 GitHub CLI：

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

桌面用户可以在应用中完成 Device OAuth，无需安装 `gh`。

## 错误行为

API 错误返回包含用户可读消息的 JSON，并在可行时写入 `app_error_logs`。模型列表失败时可返回 fallback 模型和认证指引，而不是让设置页完全失败。请求体过大时返回 HTTP 413。
