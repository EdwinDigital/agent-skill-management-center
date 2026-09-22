# Changelog

All notable changes to Agent Skill Management Center are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- Reorganized the project homepage and detailed bilingual documentation.
- Added screenshots and GitHub community health files.

## [1.0.0] - 2026-09-22

### Added

- Local Skill root discovery, custom roots, search, pagination, and file trees.
- Immediate rule-based analysis with triggers, tools, run methods, evidence, and logic graphs.
- GitHub Copilot SDK evaluation for complexity, ROI, insights, activation prompts, and model-generated graphs.
- Skill.md translation with local cache support.
- GitHub Device OAuth for desktop use and optional GitHub CLI integration for web development.
- Tauri packages for macOS ARM64, Windows x64, and Windows ARM64 with embedded Node.js.
- macOS/Windows CI and atomic cross-platform GitHub Release automation.

### Security

- Bound the desktop sidecar to localhost and protected API routes with a per-launch UUID token.
- Added SHA-256 checksums for every published installer.

[Unreleased]: https://github.com/EdwinDigital/agent-skill-management-center/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.0
