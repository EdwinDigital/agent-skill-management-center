# 故障排查

[English](troubleshooting.md) · [文档索引](README.md) · [项目首页](../README-CN.md)

## 没有显示 Skills

- 运行**全局扫描**检查已知默认目录。
- 确认选中的根目录存在，并包含带 `SKILL.md` 的子目录。
- 手工添加自定义根目录，或在首次启动前设置 `SKILL_ROOT`。
- Windows 使用 `C:\Users\name\.agents\skills` 等本地盘符路径或有效 UNC 路径。

## AI 评估或模型列表提示认证

桌面用户在应用中完成 GitHub Device OAuth。Web 开发可使用：

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

随后检查 `/api/auth/github/status?check=1` 和 `/api/models?live=1`。本地 token 缺少 `copilot` scope 时，虽然已登录，但尚未 AI 就绪。

## 模型列表较慢

当前浏览器页面会话首次打开设置时会请求 Copilot SDK live 模型。刷新或关闭页面前，再次打开设置会复用页面缓存。

## AI 评估失败或超时

1. 检查 `/api/error-logs?limit=10`。
2. 验证认证状态和 live 模型列表。
3. 确认选中的模型仍然可用。
4. 保留完整 Skill 上下文；拆分模型调用，不要裁剪内容。
5. 上一次操作结束后，使用新的 request ID 重试。

## 重置数据库

Web 开发环境：

```bash
npm stop
rm data/analysis.sqlite
npm start
```

启动时会重建 schema 和默认值。桌面数据库位于平台应用数据目录，删除前先备份。

## 端口已占用

```bash
npm stop
```

使用自定义端口时，启动和停止必须使用相同值：

```bash
PORT=5173 npm start
PORT=5173 npm stop
```

## 桌面应用无法启动

- 确认安装包与 CPU 架构匹配。
- 使用 Release 校验文件验证 SHA-256。
- macOS：先将应用复制到“应用程序”，不要直接从挂载的 DMG 运行。
- Windows：只有确认来源和校验和后才放行 SmartScreen。
- 检查杀毒软件是否隔离了内置 Node 或原生 runtime 文件。

## 原生目录选择器

当前原生选择器使用 macOS `osascript`。Windows 用户可以通过全局扫描发现默认根目录，并手工添加自定义路径。

## 报告问题

可复现缺陷请使用 [Bug 报告表单](https://github.com/EdwinDigital/agent-skill-management-center/issues/new?template=bug_report.yml)。安全漏洞请按 [SECURITY.md](../SECURITY.md) 的私密流程报告，不要创建公开 Issue。
