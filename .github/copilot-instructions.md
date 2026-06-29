# Repository instructions for GitHub Copilot

Read `AGENTS.md` first for the full project-specific agent guidance. This file is the official GitHub Copilot repository-wide custom instructions entry point.

## Project context

This repository contains Agent Skill Management Center, a local-first developer web console for exploring, auditing, translating, and AI-evaluating Agent Skills. It scans local Skill roots, reads Skill definitions and file trees, renders immediate rule-based analysis, and can use GitHub Copilot SDK for model-backed complexity/ROI scores, model insights, trigger prompts, logic graphs, and Skill.md translations.

Technology stack:
- Runtime/API: Node.js, Express, native `node:sqlite` `DatabaseSync`.
- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/Radix UI primitives, lucide icons, Sonner.
- Local database: project-relative `data/analysis.sqlite` by default; `data/` is Git-ignored.
- Production assets: Vite emits `public/dist`, served by `server.js` with the API routes.

Primary files:
- `server.js`: Express routes, SQLite initialization, Skill scanning/reading, GitHub CLI auth, Copilot SDK model listing/evaluation/translation, progress polling, error logging.
- `src/App.tsx`: main UI state and flows for settings, roots, Skill selection, graphs, AI evaluation, translation, caching, and notifications.
- `src/components/ui/`: shadcn/Radix UI wrappers.
- `src/index.css`: Tailwind v4 theme and local font imports.
- `vite.config.js`: Vite config, `/api` dev proxy, `public/dist` output.
- `scripts/stop.js`: stops the process listening on `PORT`.

## Working rules

- Use Chinese for user-facing collaboration unless the user asks otherwise.
- Keep code identifiers, file names, function names, and type names in English.
- Add comments sparingly; when a new comment is needed for complex logic, prefer Chinese.
- Preserve the existing architecture and style. Do not introduce new frameworks or broad abstractions unless they clearly reduce complexity.
- Do not proactively refactor unrelated files.
- Do not delete files or discard user changes unless the user explicitly asks.
- Do not run `npm install`, upgrade packages, or add dependencies without confirmation.
- Do not create commits unless the user explicitly asks to commit.
- Never commit `data/`, `public/dist/`, `node_modules/`, logs, or local database files.

## Build, run, and validation

Use these commands:

```bash
npm run check
npm run build
npm start
npm stop
npm run dev
```

Known behavior:
- `npm run check` runs `node --check server.js && tsc --noEmit`; run it before handing off code changes.
- `npm start` runs `npm run build && node server.js` and serves `http://localhost:4173` by default.
- `npm stop` terminates the process listening on `PORT` using `lsof` and `SIGTERM`.
- `npm run dev` starts Vite on `127.0.0.1:5173` and proxies `/api` to `http://localhost:4173`; run `node server.js` separately for API support.

When changing browser behavior, restart the server and verify in the browser. When changing AI evaluation, verify a real Skill through `/api/logic-map/generate` and cache behavior through `/api/logic-map/cache`.

## Architecture and data rules

- Default database path is `data/analysis.sqlite`; relative `SKILL_ANALYSIS_DB` values resolve from the project directory. Do not change the default back to a home-directory path.
- Main tables are `skill_directory_defaults`, `skill_directory_scan`, `skill_model_analyses`, `skill_markdown_translations`, and `app_error_logs`.
- Complexity and ROI are intentionally unrated before AI evaluation; show scores only after `modelAnalysis` returns model scores.
- Settings should load the live Copilot model list only once per browser page session, then reuse the in-page cache until refresh/reopen.
- AI evaluation accuracy has priority over shortening prompts. To avoid timeouts, split model calls into focused steps while keeping the full available Skill content and rule context.
- Current AI evaluation design splits model work into scores, insights/activation prompts, and graph generation, then merges into the existing `ModelAnalysis` shape.
- Radix Select content is portaled. This project's Select Root type does not support a `modal` prop; guard Dialog `onInteractOutside` when Select content is open.

## Troubleshooting hints

- If AI evaluation fails, first check `/api/error-logs?limit=10`, `/api/auth/github/status?check=1`, and `/api/models?live=1` before changing code.
- GitHub auth success requires GitHub CLI auth plus Copilot scope; use `gh auth login --web` and `gh auth refresh --scopes copilot` when needed.
- For a clean first-start database test, stop the server, delete `data/analysis.sqlite`, then run `npm start`.
- If port `4173` is busy, run `npm stop` or use a consistent custom `PORT` for both start and stop.

## Preserve during conversation compaction

Keep, in order:
1. Architecture decisions and rationale.
2. Files changed and exact behavior changed.
3. Current validation status and whether the service was restarted.
4. Remaining TODOs or unresolved errors.
5. User preferences: Chinese collaboration, accuracy first, no unrelated refactors, no unapproved dependency installs, no commits unless asked.
