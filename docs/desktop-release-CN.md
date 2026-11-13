# 桌面发布指南

[English](desktop-release.md) · [文档索引](README.md) · [项目首页](../README-CN.md)

## 已发布安装包

当前稳定版本为 [v1.0.1](https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.1)。

| 安装包 | 目标平台 |
| --- | --- |
| `Agent-SMC-1.0.1-macos-arm64.dmg` | Apple 芯片，macOS 12+。 |
| `Agent-SMC-1.0.1-windows-x64-setup.exe` | Intel/AMD Windows。 |
| `Agent-SMC-1.0.1-windows-arm64-setup.exe` | Snapdragon 和 Windows on ARM。 |
| `SHA256SUMS.txt` | 三个安装包的 SHA-256。 |

桌面安装包内置官方 Node.js 24.11.1 和目标平台原生 Copilot runtime，终端用户无需安装 Node。

## 签名状态

- macOS 使用 ad-hoc 签名但未公证。Gatekeeper 可能要求在**系统设置 → 隐私与安全性**中确认。
- Windows 安装包未签名。验证来源后，Microsoft Defender SmartScreen 可能需要选择**更多信息 → 仍要运行**。
- 绕过系统提示前，应先与 `SHA256SUMS.txt` 比对安装包。

## 应用数据

- macOS：Tauri 应用数据目录，通常为 `~/Library/Application Support/com.edwindigital.agent-smc/`。
- Windows：Tauri 应用数据目录，通常为 `%APPDATA%\com.edwindigital.agent-smc\`。
- Web 开发：默认使用项目相对 `data/analysis.sqlite`，可由 `SKILL_ANALYSIS_DB` 覆盖。

## 自动发布流程

推送 `v*` Tag 时，`.github/workflows/desktop-release.yml` 会执行：

1. 校验 package、Cargo、Tauri 版本与 Tag 一致。
2. 创建或严格校验指向 Tag commit 的草稿 Release。
3. 在原生 runner 构建 macOS ARM64、Windows x64、Windows ARM64。
4. 每个安装包构建前运行测试和源码检查。
5. 挂载 macOS DMG 并验证内部 app 签名。
6. 将安装包上传为临时 Actions artifacts。
7. 校验精确三文件集合，生成 `SHA256SUMS.txt`，再次验证草稿目标。
8. 清除草稿旧资产，上传完整集合后公开 Release。

任一构建失败都会让 Release 保持草稿。构建 job 不直接向公开 Release 上传文件。

### 重建尚未发布的 Tag

若打 Tag 后托管 runner 配置发生变化，可从 `main` 调用修正后的工作流，保持原 Tag 和源码 commit 不变：

```bash
gh workflow run desktop-release.yml --ref main -f release_tag=v1.0.1 -f publish=true
```

三个安装包均从同一个固定 Tag commit 重新构建。只有全部构建、签名检查、资产检查和草稿目标校验通过后才发布。省略 `publish=true` 则保留草稿，已有公开 Release 不允许覆盖。

## 仅构建 Windows ARM64，不发布 Release

构建指定分支，不创建 Tag，也不修改任何 Release：

```bash
gh workflow run windows-arm64-build.yml --ref main
```

此只读工作流先执行测试和源码检查，再在原生 Windows ARM64 runner 上构建 NSIS 安装包，并校验桌面程序、内置 Node 和 Copilot runtime 的架构。构建完成后，可从该次运行的 Actions artifact 下载安装包、`SHA256SUMS.txt` 和 `build-info.json`，产物保留七天。

安装包文件名包含源码提交号，例如 `Agent-SMC-1.0.1-windows-arm64-abcdef0-setup.exe`。这类安装包是当前源码的测试构建，不代表新的稳定版，应用版本号保持不变。

## CI

Pull Request 和 `main` 推送会触发 `.github/workflows/ci.yml`：

- macOS ARM64（`macos-15`）：Node 测试、源码检查、前端构建和 Rust/Tauri check。应用配置的最低 macOS 版本仍为 12.0。
- Windows x64：Node 测试（包括 Windows 路径和 sidecar 运行时行为）及源码检查。

CI 不构建或测试 Linux 桌面目标。

## 本地构建

```bash
npm run desktop:build:mac
npm run desktop:build:windows
```

Tauri 将 bundle 写入 `src-tauri/target/<target-triple>/release/bundle/`。本地产物说明见 [release/README.md](../release/README.md)。
