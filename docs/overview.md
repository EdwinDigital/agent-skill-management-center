# Product Overview

[中文](overview-CN.md) · [Docs index](README.md) · [Project home](../README.md)

Agent Skill Management Center (Agent SMC) is a local-first workbench for discovering, inspecting, translating, and AI-evaluating Agent Skills. It turns Skill folders into a searchable registry and combines immediate static evidence with optional GitHub Copilot SDK analysis.

## Who It Is For

- Developers maintaining Skills across multiple agents and coding tools.
- Agent builders auditing activation conditions, tools, files, and execution paths.
- Teams deciding which Skills justify deeper AI-assisted review.
- Contributors who need a reproducible desktop and web development workflow.

## Core Capabilities

- **Local Skill registry** — scans known conventions and custom roots, then stores the discovered roots and indexes in SQLite.
- **Immediate rule analysis** — extracts summaries, trigger signals, tools, run methods, file statistics, graph nodes, and evidence without a model call.
- **On-demand AI evaluation** — generates model-backed complexity and ROI scores, insight, activation prompts, and logic graphs.
- **Skill.md translation** — provides original and translated Markdown views with cache-aware generation.
- **Interactive evidence** — connects graph nodes to source files and rule evidence.
- **Desktop distribution** — ships Tauri applications for macOS ARM64, Windows x64, and Windows ARM64 with an embedded Node runtime.
- **Bilingual UI** — supports English and Chinese display preferences.

## Workbench Model

The interface uses three areas:

| Area | Responsibility |
| --- | --- |
| `SidebarConsole` | Skill roots, global scan, search, pagination, theme, account and settings. |
| `DetailSurface` | Skill overview, AI action, score cards, model insight, trigger prompts, graph, tools and run methods. |
| `DocPanel` | Skill.md original/translated content and the file tree. |

The main content track uses `minmax(0, 1fr)` so long paths, Markdown, graph nodes, file names, and prompts remain contained. Radix Select content is portaled; dialogs guard Select portal interaction to avoid accidental closure.

## Local-First Data Model

Web development defaults to `data/analysis.sqlite`. Desktop builds use the Tauri application data directory. The primary tables are:

| Table | Purpose |
| --- | --- |
| `skill_directory_defaults` | Known Agent Skill directory conventions. |
| `skill_directory_scan` | Scanned and custom roots visible in the sidebar. |
| `skill_directory_index` | Indexed Skill manifests under known roots. |
| `skill_model_analyses` | Cached AI evaluations keyed by Skill path and language. |
| `skill_markdown_translations` | Cached Skill.md translations keyed by Skill path and language. |
| `app_error_logs` | Structured API and runtime errors. |
| `github_oauth_tokens` | Locally stored GitHub Device OAuth state for desktop use. |

Analysis and translation records also retain model, content hash, timestamps, and schema metadata so exact, historical, and stale results can be distinguished.

## Evaluation Rules

- Complexity and ROI remain unrated until an AI evaluation returns model scores.
- AI work is split into focused score, insight/activation prompt, and graph generation calls.
- Accuracy takes priority over shortening prompts; full available Skill context and rule evidence are retained.
- Live model listing is loaded once per browser page session when Settings first opens.
- AI evaluation and translation happen only when requested; local rule analysis is always available immediately.

## Privacy Boundary

The application reads discovered or explicitly configured Skill roots. Skill descriptions and sampled supporting files are sent to GitHub Copilot SDK only for a requested AI evaluation or translation. Root configuration, caches, OAuth state, and errors remain in the local SQLite database.

## Reusable Workbench Template

`web_template/` is a standalone static starting point for future console-style projects. It contains the workbench shell, semantic design tokens, layout/component CSS, small static interactions, and concise design/component standards. It is intentionally isolated from Agent SMC runtime APIs and database code.
