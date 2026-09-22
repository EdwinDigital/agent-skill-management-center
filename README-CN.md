<p align="center">
  <img src="docs/images/app-icon.png" width="96" alt="Agent SMC 应用图标">
</p>

<h1 align="center">Agent Skill Management Center</h1>

<p align="center"><strong>本地优先的 Agent Skill 发现、审计、翻译和 AI 评估工作台。</strong></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="docs/README.md">文档中心</a> ·
  <a href="https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.0">下载 v1.0.0</a>
</p>

<p align="center">
  <a href="https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/release-v1.0.0-2563eb" alt="Release v1.0.0"></a>
  <a href="https://github.com/EdwinDigital/agent-skill-management-center/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-macOS%20ARM64%20%7C%20Windows%20passing-16a34a" alt="macOS ARM64 与 Windows CI 通过"></a>
  <a href="docs/desktop-release-CN.md"><img src="https://img.shields.io/badge/platform-macOS%20ARM64%20%7C%20Windows%20x64%2FARM64-2563eb" alt="macOS ARM64、Windows x64 与 Windows ARM64"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a" alt="MIT License"></a>
</p>

![Agent SMC 本地 Skill 注册表与可视化工作台](docs/images/home-workbench.png)

Agent SMC 将散落在本机的 Skill 文件夹整理成可审计的注册表。它无需模型调用即可展示规则证据，并按需通过 GitHub Copilot SDK 生成复杂度/ROI 评分、模型洞察、触发 Prompt、逻辑图和 Skill.md 翻译。

## 为什么选择 Agent SMC

- **本地优先**：扫描已知 Skill 目录或添加自定义根目录；元数据和缓存留在本地 SQLite。
- **先看证据，再用 AI**：立即查看触发条件、工具、文件、运行方法和图谱证据。
- **只在需要时调用 AI**：按需执行模型评估和翻译。
- **适合大型 Skill 集合**：支持搜索、分页、文件树、Markdown 阅读和缓存感知流程。
- **桌面端可直接使用**：Tauri 安装包内置 Node.js，支持 macOS ARM64、Windows x64 和 Windows ARM64。

## 下载

| 平台 | 安装包 |
| --- | --- |
| Apple 芯片，macOS 12+ | [Agent-SMC-1.0.0-macos-arm64.dmg](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/Agent-SMC-1.0.0-macos-arm64.dmg) |
| Intel/AMD Windows | [Agent-SMC-1.0.0-windows-x64-setup.exe](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/Agent-SMC-1.0.0-windows-x64-setup.exe) |
| Windows on ARM | [Agent-SMC-1.0.0-windows-arm64-setup.exe](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/Agent-SMC-1.0.0-windows-arm64-setup.exe) |
| 完整性校验 | [SHA256SUMS.txt](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/SHA256SUMS.txt) |

macOS 安装包使用 ad-hoc 签名但未公证；Windows 安装包未签名，可能触发 SmartScreen。放行系统提示前请先验证校验和。详见[桌面发布指南](docs/desktop-release-CN.md)。

## 产品截图

<p align="center">
  <img src="docs/images/skill-analysis.png" width="48%" alt="包含复杂度、ROI、触发 Prompt 和逻辑图的 AI Skill 分析">
  <img src="docs/images/skill-document.png" width="48%" alt="分析结果旁的 Skill.md 文档阅读器">
</p>
<p align="center">
  <img src="docs/images/skill-file-tree.png" width="48%" alt="大型 Skill 包的可展开文件树">
  <img src="docs/images/settings-models.png" width="48%" alt="支持 GitHub Copilot live 模型选择的设置面板">
</p>

## 从源码快速开始

需要支持 `node:sqlite` 的 Node.js 22+；CI 和桌面安装包使用 Node.js 24。

```bash
git clone https://github.com/EdwinDigital/agent-skill-management-center.git
cd agent-skill-management-center
npm install
npm start
```

打开 `http://localhost:4173`，运行**全局扫描**并选择 Skill。Web 模式启用 live Copilot 功能：

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

桌面版支持 GitHub Device OAuth，不要求安装 GitHub CLI。

## 开发命令

```bash
npm test          # Node 契约与运行时测试
npm run check     # 服务端语法 + TypeScript
npm run build     # Vite 生产构建
npm run dev       # Vite 开发服务器；需另行运行 node server.js
npm run desktop:dev
```

Rust/Tauri 检查和桌面构建见[开发指南](docs/development-CN.md)。

## 文档

| 主题 | 中文 | English |
| --- | --- | --- |
| 产品模型与数据 | [产品概览](docs/overview-CN.md) | [Overview](docs/overview.md) |
| 运行架构与流程 | [技术架构](docs/architecture-CN.md) | [Architecture](docs/architecture.md) |
| 接口与配置 | [API 参考](docs/api-reference-CN.md) | [API reference](docs/api-reference.md) |
| 本地开发 | [开发指南](docs/development-CN.md) | [Development](docs/development.md) |
| 安装包与自动化 | [桌面发布](docs/desktop-release-CN.md) | [Desktop release](docs/desktop-release.md) |
| 常见问题 | [故障排查](docs/troubleshooting-CN.md) | [Troubleshooting](docs/troubleshooting.md) |

完整导航见[文档中心](docs/README.md)。

## 社区

- 参与贡献：[CONTRIBUTING.md](CONTRIBUTING.md)
- 安全报告：[SECURITY.md](SECURITY.md)
- 获取支持：[SUPPORT.md](SUPPORT.md)
- 行为准则：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 版本变化：[CHANGELOG.md](CHANGELOG.md)

## 许可证

本项目采用 [MIT License](LICENSE)。
