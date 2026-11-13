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

## Windows 安装时无法写入 node.exe

若出现 `Error opening file for writing`，且路径指向安装目录下的 `sidecar-node\runtime\node.exe`，通常是旧版本遗留的后台服务仍在占用文件。不要选择“忽略”；关闭 Agent SMC 后，仅结束可执行文件路径属于该安装目录的后台进程，再点“重试”或重新运行安装包。无需删除数据库，也不要批量结束系统中所有 `node.exe`。

修复后的桌面应用会在退出时显式清理后台服务，并通过父进程管道处理主程序异常退出。Windows 安装器在覆盖或卸载文件前还会清理当前安装目录内的残留服务；无法确认进程路径或无法释放文件时会中止，而不是跳过文件。此防护只配置在 Windows 安装器中，应用版本号仍为 1.0.1。

## 原生目录选择器

“添加路径”先打开应用内表单，可直接粘贴本机 Skill 根目录。保存时会校验目录及其中的 SKILL.md，验证通过后才更新目录列表。系统选择器为可选方式：Windows 使用系统自带的 Windows PowerShell STA 宿主和 Windows Forms，macOS 继续使用 `osascript`，不额外安装应用依赖。取消选择会保留当前目录且不报错。若系统弹窗不可用或超时，直接输入目录路径即可，无需修改 Copilot 认证。

## 报告问题

可复现缺陷请使用 [Bug 报告表单](https://github.com/EdwinDigital/agent-skill-management-center/issues/new?template=bug_report.yml)。安全漏洞请按 [SECURITY.md](../SECURITY.md) 的私密流程报告，不要创建公开 Issue。
