# Architecture

[中文](architecture-CN.md) · [Docs index](README.md) · [Project home](../README.md)

## Runtime Topology

```text
React 19 + Vite + Tailwind CSS v4 + shadcn/Radix
  └─ HTTP API with per-launch token in desktop mode
     └─ Node/Express sidecar
        ├─ node:sqlite DatabaseSync
        ├─ filesystem Skill scanner and reader
        ├─ local rule analyzer and graph builder
        ├─ GitHub Device OAuth / optional gh CLI integration
        └─ GitHub Copilot SDK model, evaluation and translation workflows

Tauri 2 desktop shell
  ├─ embeds public/dist
  ├─ embeds official Node 24.11.1 runtime and sidecar resources
  ├─ starts sidecar on 127.0.0.1 with a random port and UUID token
  └─ stores SQLite in the platform app-data directory
```

The web development mode serves the same React build and Express API directly. Desktop mode keeps the API contract intact while Tauri controls process lifecycle, endpoint discovery, and application data placement.

## Main Flows

### Startup

1. The frontend requests `/api/config`, `/api/skill-roots`, and the first root's Skill list.
2. Fallback model metadata is available immediately.
3. GitHub status is checked in the background.
4. Live Copilot models are deferred until Settings first opens and then cached for the page session.

### Skill Inspection

1. Selecting a Skill requests `/api/skills/:name` with root, relative path, and language.
2. The server validates the requested path remains under the selected root.
3. It reads `SKILL.md`, description candidates, and bounded supporting-file samples.
4. Rule analysis extracts triggers, tools, methods, evidence, file statistics, and a horizontal graph.
5. The UI renders this result without waiting for AI.

### AI Evaluation

1. The frontend checks `/api/logic-map/cache`.
2. A cache miss calls `/api/logic-map/generate` with a request ID.
3. The server runs focused Copilot SDK calls for scores, insight/activation prompts, and graph generation.
4. Progress is available through `/api/progress/:requestId`.
5. The merged `ModelAnalysis` is cached with model, language, content hash, and schema metadata.

### Skill.md Translation

1. The frontend checks `/api/skill-translation/cache`.
2. A cache miss calls `/api/skill-translation/generate`.
3. The backend preserves Markdown structure while translating content.
4. The result is cached and displayed alongside the original document.

### Desktop Authentication and Sidecar

- Tauri starts the sidecar on `127.0.0.1` with `PORT=0` and a CSPRNG UUID token.
- The sidecar announces the selected port through `AGENT_SMC_READY`.
- Tauri injects the base URL and token into the WebView; reloads can recover both through a Tauri command.
- `/api/` requests reject missing or incorrect sidecar tokens.
- GitHub Device OAuth supports desktop users without requiring GitHub CLI.

## Repository Structure

```text
server.js                     Express API and application orchestration
core/utils/                   Shared hash and path behavior
server/                       Server config and response helpers
setup/                        SQLite schema, database bootstrap, default roots
src/                          React application and shadcn/Radix primitives
src-tauri/                    Rust desktop shell and Tauri platform config
scripts/                      Sidecar, DMG and process scripts
tests/                        Node contract and runtime tests
docs/                         Product and contributor documentation
web_template/                 Standalone reusable static workbench template
public/dist/                  Generated Vite output (ignored)
data/                         Local web runtime database (ignored)
release/                      Local release staging notes; binaries ignored
```

## Platform Boundaries

- macOS native folder selection currently uses `osascript` in the Node server.
- Windows supports default root discovery and custom paths through native drive, UNC, and home path semantics; users enter custom paths manually.
- Desktop bundles include target-native Node and Copilot runtime files, so users do not install Node.
- Sidecar APIs bind only to localhost and require a per-launch token.
