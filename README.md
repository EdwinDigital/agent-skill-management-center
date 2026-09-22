<p align="center">
  <img src="docs/images/app-icon.png" width="96" alt="Agent SMC application icon">
</p>

<h1 align="center">Agent Skill Management Center</h1>

<p align="center"><strong>A local-first workbench for discovering, auditing, translating, and AI-evaluating Agent Skills.</strong></p>

<p align="center">
  <a href="README-CN.md">中文</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.0">Download v1.0.0</a>
</p>

<p align="center">
  <a href="https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.0"><img src="https://img.shields.io/badge/release-v1.0.0-2563eb" alt="Release v1.0.0"></a>
  <a href="https://github.com/EdwinDigital/agent-skill-management-center/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-macOS%20ARM64%20%7C%20Windows%20passing-16a34a" alt="CI passing on macOS ARM64 and Windows"></a>
  <a href="docs/desktop-release.md"><img src="https://img.shields.io/badge/platform-macOS%20ARM64%20%7C%20Windows%20x64%2FARM64-2563eb" alt="macOS ARM64, Windows x64 and Windows ARM64"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a" alt="MIT License"></a>
</p>

![Agent SMC home workbench with local Skill registry and visual workflow](docs/images/home-workbench.png)

Agent SMC turns scattered local Skill folders into an auditable registry. It shows immediate rule evidence without a model call, then uses GitHub Copilot SDK on demand for complexity/ROI scores, insights, activation prompts, logic graphs, and Skill.md translation.

## Why Agent SMC

- **Local first** — scan known Skill locations or add custom roots; metadata and caches stay in local SQLite.
- **Evidence before AI** — inspect triggers, tools, files, run methods, and graph evidence immediately.
- **AI when useful** — run model-backed evaluation and translation only when requested.
- **Built for large Skill sets** — search, pagination, file trees, Markdown reading, and cache-aware workflows.
- **Desktop ready** — Tauri packages embed Node.js for macOS ARM64, Windows x64, and Windows ARM64.

## Download

| Platform | Package |
| --- | --- |
| Apple silicon, macOS 12+ | [Agent-SMC-1.0.0-macos-arm64.dmg](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/Agent-SMC-1.0.0-macos-arm64.dmg) |
| Intel/AMD Windows | [Agent-SMC-1.0.0-windows-x64-setup.exe](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/Agent-SMC-1.0.0-windows-x64-setup.exe) |
| Windows on ARM | [Agent-SMC-1.0.0-windows-arm64-setup.exe](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/Agent-SMC-1.0.0-windows-arm64-setup.exe) |
| Integrity | [SHA256SUMS.txt](https://github.com/EdwinDigital/agent-skill-management-center/releases/download/v1.0.0/SHA256SUMS.txt) |

The macOS package is ad-hoc signed but not notarized. Windows installers are unsigned and may trigger SmartScreen. Verify the checksum before approving an operating-system warning. See the [desktop release guide](docs/desktop-release.md).

## Product Tour

<p align="center">
  <img src="docs/images/skill-analysis.png" width="48%" alt="AI-assisted Skill analysis with complexity, ROI, prompts, and logic graph">
  <img src="docs/images/skill-document.png" width="48%" alt="Skill.md document reader alongside analysis">
</p>
<p align="center">
  <img src="docs/images/skill-file-tree.png" width="48%" alt="Expandable Skill file tree for large Skill packages">
  <img src="docs/images/settings-models.png" width="48%" alt="Settings dialog with live GitHub Copilot model selection">
</p>

## Quick Start from Source

Requires Node.js 22+ with `node:sqlite`; CI and desktop bundles use Node.js 24.

```bash
git clone https://github.com/EdwinDigital/agent-skill-management-center.git
cd agent-skill-management-center
npm install
npm start
```

Open `http://localhost:4173`, run **Global scan**, and select a Skill. For live Copilot features in web mode:

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

Desktop builds support GitHub Device OAuth and do not require GitHub CLI.

## Development Commands

```bash
npm test          # Node contract and runtime tests
npm run check     # server syntax + TypeScript
npm run build     # Vite production build
npm run dev       # Vite dev server; run node server.js separately
npm run desktop:dev
```

See the [development guide](docs/development.md) for Rust/Tauri checks and desktop builds.

## Documentation

| Topic | English | 中文 |
| --- | --- | --- |
| Product model and data | [Overview](docs/overview.md) | [产品概览](docs/overview-CN.md) |
| Runtime and flows | [Architecture](docs/architecture.md) | [技术架构](docs/architecture-CN.md) |
| Endpoints and configuration | [API reference](docs/api-reference.md) | [API 参考](docs/api-reference-CN.md) |
| Local development | [Development](docs/development.md) | [开发指南](docs/development-CN.md) |
| Installers and automation | [Desktop release](docs/desktop-release.md) | [桌面发布](docs/desktop-release-CN.md) |
| Common problems | [Troubleshooting](docs/troubleshooting.md) | [故障排查](docs/troubleshooting-CN.md) |

Browse the complete [documentation index](docs/README.md).

## Community

- Contributions: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security reports: [SECURITY.md](SECURITY.md)
- Support: [SUPPORT.md](SUPPORT.md)
- Code of conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- Changes: [CHANGELOG.md](CHANGELOG.md)

## License

Released under the [MIT License](LICENSE).
