# 产品概览

[English](overview.md) · [文档索引](README.md) · [项目首页](../README-CN.md)

Agent Skill Management Center（Agent SMC）是一个本地优先的 Agent Skill 工作台，用于发现、检查、翻译和 AI 评估 Skill。它把分散的 Skill 文件夹整理成可搜索的注册表，并将即时静态证据与可选的 GitHub Copilot SDK 分析结合起来。

## 适用人群

- 同时维护多个 Agent、编码工具 Skill 的开发者。
- 审计触发条件、工具、文件和执行路径的 Agent 构建者。
- 需要判断哪些 Skill 值得深入 AI 评估的团队。
- 需要可重复桌面端和 Web 开发流程的贡献者。

## 核心能力

- **本地 Skill 注册表**：扫描已知约定和自定义根目录，将发现结果与索引保存到 SQLite。
- **即时规则分析**：无需模型调用即可提取摘要、触发信号、工具、运行方法、文件统计、图节点和证据。
- **按需 AI 评估**：生成模型驱动的复杂度、ROI、洞察、触发 Prompt 和逻辑图。
- **Skill.md 翻译**：提供原文/译文 Markdown 视图，并按缓存状态决定是否生成。
- **交互式证据**：将图谱节点与源文件、规则证据关联起来。
- **桌面分发**：提供 macOS ARM64、Windows x64、Windows ARM64 Tauri 应用，并内置 Node runtime。
- **双语界面**：支持英文和中文显示偏好。

## 工作台模型

界面分为三个区域：

| 区域 | 职责 |
| --- | --- |
| `SidebarConsole` | Skill 根目录、全局扫描、搜索、分页、主题、账号和设置。 |
| `DetailSurface` | Skill 概览、AI 操作、评分卡、模型洞察、触发 Prompt、图谱、工具和运行方法。 |
| `DocPanel` | Skill.md 原文/译文和文件树。 |

主内容轨道使用 `minmax(0, 1fr)`，避免长路径、Markdown、图节点、文件名和 Prompt 溢出。Radix Select 内容通过 Portal 渲染；Dialog 会保护 Select Portal 交互，避免选择选项时意外关闭。

## 本地优先数据模型

Web 开发默认使用 `data/analysis.sqlite`。桌面版使用 Tauri 应用数据目录。主要数据表：

| 表 | 用途 |
| --- | --- |
| `skill_directory_defaults` | 已知 Agent Skill 目录约定。 |
| `skill_directory_scan` | 侧栏展示的已扫描和自定义根目录。 |
| `skill_directory_index` | 已知根目录下的 Skill manifest 索引。 |
| `skill_model_analyses` | 按 Skill 路径和语言缓存 AI 评估。 |
| `skill_markdown_translations` | 按 Skill 路径和语言缓存 Skill.md 翻译。 |
| `app_error_logs` | 结构化 API 和运行时错误。 |
| `github_oauth_tokens` | 桌面端本地 GitHub Device OAuth 状态。 |

分析和翻译记录还保存模型、内容哈希、时间戳和 schema 元数据，用于区分精确、历史和过期结果。

## 评估规则

- AI 评估返回模型分数前，复杂度和 ROI 始终保持未评估。
- AI 工作拆为评分、洞察/触发 Prompt、图谱生成等聚焦调用。
- 准确性优先于缩短 Prompt；保留完整可用 Skill 上下文和规则证据。
- 当前浏览器页面会话首次打开设置时读取一次 live 模型列表。
- 仅在用户请求时进行 AI 评估和翻译；本地规则分析始终即时可用。

## 隐私边界

应用只读取已发现或显式配置的 Skill 根目录。只有请求 AI 评估或翻译时，Skill 描述和采样支撑文件才会发送到 GitHub Copilot SDK。根目录配置、缓存、OAuth 状态和错误信息保留在本地 SQLite 数据库。

## 可复用工作台模板

`web_template/` 是面向未来控制台类项目的独立静态起点，包含工作台 shell、语义设计 token、布局/组件 CSS、少量静态交互以及简洁的设计/组件标准。它与 Agent SMC 的运行时 API 和数据库代码刻意隔离。
