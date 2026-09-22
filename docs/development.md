# Development Guide

[中文](development-CN.md) · [Docs index](README.md) · [Project home](../README.md)

## Prerequisites

- Node.js 24 is used in CI and bundled desktop runtime; Node 22+ with `node:sqlite` is required for local web development.
- npm.
- Rust stable for Tauri checks and desktop builds.
- Platform build prerequisites from the [Tauri v2 documentation](https://v2.tauri.app/start/prerequisites/).
- Optional GitHub CLI for web-mode authentication checks.

## Install and Run

```bash
npm install
npm start
```

`npm start` builds the frontend and serves the app at `http://localhost:4173`.

For live frontend development, run the API and Vite separately:

```bash
node server.js
npm run dev
```

Vite listens on `127.0.0.1:5173` and proxies `/api` to port `4173`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run Node contract and runtime tests. |
| `npm run check` | Check `server.js` syntax and run TypeScript without emitting. |
| `npm run build` | Build Vite assets into `public/dist`. |
| `npm start` | Build and start the Express server. |
| `npm stop` | Stop the process listening on `PORT`. |
| `npm run dev` | Start the Vite development server. |
| `npm run build:sidecar` | Assemble target-native sidecar resources. |
| `npm run desktop:dev` | Run Tauri development mode. |
| `npm run desktop:build` | Build the current target's configured Tauri bundle. |
| `npm run desktop:build:mac` | Build a macOS DMG on macOS. |
| `npm run desktop:build:windows` | Build a Windows NSIS installer on Windows. |

## Quality Gate

Before handing off changes:

```bash
npm test
npm run check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
```

Browser behavior changes should also be tested in the running app. AI evaluation changes should exercise a real Skill through `/api/logic-map/generate` and `/api/logic-map/cache`.

## Repository Conventions

- Keep React UI state and primary flows in `src/App.tsx` unless a focused abstraction clearly reduces complexity.
- Use existing shadcn/Radix wrappers and lucide icons.
- Keep runtime data in `data/` or `SKILL_ANALYSIS_DB`; never commit databases, logs, `public/dist`, `node_modules`, `src-tauri/target`, sidecar output, or installers.
- Preserve the project-relative web database default.
- Keep comments sparse and focused on non-obvious logic.
- Do not compress away Skill content to avoid model timeouts; split model work into focused calls instead.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for issue and pull-request expectations.
