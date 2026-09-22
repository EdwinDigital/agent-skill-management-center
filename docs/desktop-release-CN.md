# 桌面发布指南

[English](desktop-release.md) · [文档索引](README.md) · [项目首页](../README-CN.md)

## 已发布安装包

当前稳定版本为 [v1.0.0](https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.0)。

| 安装包 | 目标平台 |
| --- | --- |
| `Agent-SMC-1.0.0-macos-arm64.dmg` | Apple 芯片，macOS 12+。 |
| `Agent-SMC-1.0.0-windows-x64-setup.exe` | Intel/AMD Windows。 |
| `Agent-SMC-1.0.0-windows-arm64-setup.exe` | Snapdragon 和 Windows on ARM。 |
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

## CI

Pull Request 和 `main` 推送会触发 `.github/workflows/ci.yml`：

- macOS ARM64：Node 测试、源码检查、前端构建和 Rust/Tauri check。
- Windows x64：Node 测试（包括 Windows 路径和 sidecar 运行时行为）及源码检查。

CI 不构建或测试 Linux 桌面目标。

## 本地构建

```bash
npm run desktop:build:mac
npm run desktop:build:windows
```

Tauri 将 bundle 写入 `src-tauri/target/<target-triple>/release/bundle/`。本地产物说明见 [release/README.md](../release/README.md)。
