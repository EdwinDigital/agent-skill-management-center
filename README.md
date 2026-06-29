# Agent Skill Management Center

Agent Skill Management Center is a local-first workbench for exploring, auditing, translating, and AI-evaluating Agent Skills. It scans local Skill roots, reads Skill definitions and file trees, renders immediate rule-based analysis, and can use GitHub Copilot SDK for model-backed complexity and ROI scores, model insights, trigger prompts, logic graphs, and Skill.md translations.

The app is built for developers and agent builders who maintain many Skills across different runtimes and need a fast way to understand when a Skill should trigger, what tools and files it depends on, and whether deeper AI evaluation is worth running.

## Highlights

- **Local-first Skill registry**: discovers known Skill directories, supports custom roots, and stores scanned roots in SQLite.
- **Workbench UI**: uses a three-area console layout: `SidebarConsole` for sources and lists, `DetailSurface` for analysis and graphs, and `DocPanel` for Skill.md and file context.
- **Immediate rule analysis**: selecting a Skill returns a local summary, triggers, tools, run methods, file stats, and a horizontal logic graph without waiting for a model call.
- **AI evaluation on demand**: model work is requested only when needed, then cached by Skill path, language, model, content hash, and schema.
- **Unrated score cards before AI**: complexity and ROI stay unevaluated until model scores are returned.
- **Split model workflow**: AI evaluation is designed as focused model steps for scores, insights/activation prompts, and graph generation, then merged into one `ModelAnalysis` shape.
- **Skill.md translation**: original and translated Markdown views are available in the right-side document panel, with translation caching.
- **Session-cached model list**: live Copilot model listing happens only the first time Settings is opened in a browser page session.
- **GitHub/Copilot guidance**: the app checks GitHub CLI and Copilot scope readiness and shows actionable auth guidance.
- **Reusable template package**: `web_template/` contains a standalone static workbench template and concise design/component standards for future projects.
- **Project-local data**: default runtime data is stored at `data/analysis.sqlite`; `data/` is ignored by Git.

## Current UI Standard

The current interface is a developer workbench, not a marketing site or generic dashboard.

```text
┌────────────────┬───────────────────────────────┬──────────┐
│ SidebarConsole │ DetailSurface                 │ DocPanel │
│ sources/search │ overview, scores, graph       │ docs/tree│
└────────────────┴───────────────────────────────┴──────────┘
```

- `SidebarConsole` owns root selection, global scan, search, paged Skill list, theme, and account/settings entry points.
- `DetailSurface` owns the selected Skill overview, AI evaluation action, score cards, model insight, trigger prompts, logic graph, node details, tools, and run methods.
- `DocPanel` owns Skill.md original/translated views and the file tree.
- The main column always uses `minmax(0, 1fr)`, and long paths, Markdown, graph nodes, file names, and prompt text must not overflow their containers.
- Radix Select content is portaled; Dialog interactions must guard Select portals so selecting an item does not close the Dialog accidentally.

## Solution Design

The product separates fast local inspection from slower model-assisted evaluation.

1. **Startup**
   - The browser loads `/api/config`, `/api/skill-roots`, and the first root's Skill list.
   - The frontend loads fallback model metadata only, then checks GitHub status in the background.
   - Live Copilot model listing is deferred until Settings is opened.

2. **Skill inspection**
   - Selecting a Skill calls `/api/skills/:name` with the active root, path, and language.
   - The server reads the Skill folder, chooses the best description file, samples supporting files, extracts triggers/tools/methods, and returns local rule analysis.
   - The UI immediately renders summary, triggers, tool stack, run methods, file tree, graph, and node evidence.

3. **AI evaluation**
   - The UI first checks `/api/logic-map/cache`.
   - Cache misses call `/api/logic-map/generate` with a progress request id.
   - The backend performs focused Copilot SDK work for model scores, model insight/activation prompts, and graph generation.
   - The normalized result is cached in SQLite and shown as one model-backed analysis.

4. **Skill.md translation**
   - The UI checks `/api/skill-translation/cache` before requesting generation.
   - `/api/skill-translation/generate` uses Copilot SDK only when translation is needed.
   - Results are cached by Skill path, language, model, and content hash.

5. **Settings and auth**
   - Settings manages display language, default model, and GitHub identity.
   - Live model listing is cached in memory for the current browser page session.
   - Missing auth shows GitHub CLI guidance such as `gh auth login --web` and `gh auth refresh --scopes copilot`.

## Technical Architecture

```text
Browser
  └─ React 19 + Vite + Tailwind CSS v4 + shadcn/Radix primitives
     ├─ SidebarConsole, DetailSurface, DocPanel, Settings Dialog
     ├─ Skill search, pagination, custom root workflow
     ├─ Score cards, model insight, activation prompts, run methods
     ├─ Interactive horizontal logic graph and node inspector
     └─ Skill.md original/translated document reader and file tree

Node/Express server (server.js)
  ├─ Static asset serving from public/dist and public
  ├─ SQLite setup with node:sqlite DatabaseSync
  ├─ Skill root registry and directory scanner
  ├─ Skill filesystem reader and local rule analyzer
  ├─ GitHub CLI auth/status/logout helpers through gh
  ├─ macOS folder picker through osascript
  ├─ GitHub Copilot SDK model listing, evaluation, and translation
  ├─ In-memory progress store for polling
  └─ Structured API/runtime error logging to SQLite

Local runtime data
  └─ data/analysis.sqlite
```

## Project Structure

```text
.
├─ server.js                  # Express API, SQLite, Skill scanning, Copilot SDK workflows
├─ package.json               # npm scripts and dependencies
├─ vite.config.js             # Vite config, /api dev proxy, public/dist output
├─ index.html                 # Vite entry HTML
├─ src/
│  ├─ main.tsx                # React bootstrap
│  ├─ App.tsx                 # Main app state, workbench UI, graph, settings, AI flows
│  ├─ index.css               # Tailwind v4 theme, workbench styling, local font imports
│  ├─ lib/utils.ts            # Shared className utility
│  └─ components/ui/          # shadcn/Radix UI primitive wrappers
├─ setup/
│  ├─ schema.sql              # SQLite schema
│  ├─ database.js             # Database setup helpers
│  └─ default-skill-directories.*
├─ scripts/
│  └─ stop.js                 # Stops the process listening on PORT
├─ web_template/              # Standalone reusable static workbench template
│  ├─ README.md
│  ├─ WEB_DESIGN_STANDARD.md
│  ├─ CORE_COMPONENTS.md
│  ├─ templates/workbench-shell.html
│  └─ assets/{design-tokens.css,workbench.css,workbench.js}
├─ public/
│  ├─ favicon.svg
│  └─ dist/                   # Vite production output, ignored by Git
├─ data/                      # Local SQLite runtime data, ignored by Git
├─ README.md
└─ README-CN.md
```

## Data and Cache Model

Default SQLite path:

```text
data/analysis.sqlite
```

`SKILL_ANALYSIS_DB` can override this path. Relative values resolve from the project directory; absolute paths and `~/...` are supported.

| Table | Purpose |
|---|---|
| `skill_directory_defaults` | Known Agent Skill directory conventions. |
| `skill_directory_scan` | Scanned and custom Skill roots shown in the sidebar. |
| `skill_model_analyses` | Cached AI evaluation results keyed by `(skill_path, language)`. |
| `skill_markdown_translations` | Cached translated Skill.md Markdown keyed by `(skill_path, language)`. |
| `app_error_logs` | Structured API/runtime error logs. |

AI analysis and translation cache entries also store `model`, `content_hash`, timestamps, and serialized JSON/Markdown so the app can distinguish exact, historical, and stale results.

## API Surface

| API | Purpose |
|---|---|
| `GET /api/config` | Returns default root, languages, and fallback model. |
| `GET /api/progress/:requestId` | Reads progress for AI evaluation or translation. |
| `GET /api/skill-roots` | Lists scanned/custom Skill roots. |
| `POST /api/skill-roots/scan` | Scans known default Skill paths. |
| `POST /api/skill-roots/pick-local` | Opens the native folder picker and inspects the selected directory. |
| `POST /api/skill-roots/custom` | Saves a custom Skill root. |
| `DELETE /api/skill-roots/:id` | Deletes a removable custom root. |
| `GET /api/skills` | Lists Skills under the selected root. |
| `GET /api/skills/:name` | Reads Skill details, files, and local rule analysis. |
| `GET /api/auth/github/status` | Reads GitHub CLI and Copilot readiness. |
| `POST /api/auth/github/login` | Returns GitHub CLI login/scope guidance. |
| `POST /api/auth/github/logout` | Logs out the current GitHub CLI identity. |
| `GET /api/models` | Returns fallback models or live Copilot models with `?live=1`. |
| `POST /api/logic-map/cache` | Checks cached model analysis. |
| `POST /api/logic-map/generate` | Generates and caches model-backed analysis. |
| `POST /api/skill-translation/cache` | Checks cached Skill Markdown translation. |
| `POST /api/skill-translation/generate` | Generates and caches Skill Markdown translation. |
| `GET /api/error-logs` | Returns recent structured server errors. |

## Requirements

- Node.js with `node:sqlite` support. Node 22+ is recommended.
- npm.
- GitHub CLI (`gh`) for auth status, logout, and Copilot scope guidance.
- GitHub Copilot access for live model listing, AI evaluation, and Skill.md translation.
- macOS for the native folder picker endpoint (`osascript`). Direct filesystem scanning still uses Node APIs.

GitHub CLI setup:

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

## Scripts

```bash
npm install      # install dependencies
npm run check    # node --check server.js && tsc --noEmit
npm run build    # build frontend to public/dist
npm start        # npm run build && node server.js
npm stop         # stop the process listening on PORT
npm run dev      # Vite dev server on 127.0.0.1:5173 with /api proxy
```

For `npm run dev`, run `node server.js` separately for the API on `http://localhost:4173`.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4173` | Express server port. |
| `SKILL_ROOT` | `~/.agents/skills` | Initial root inserted when it exists. |
| `SKILL_ANALYSIS_DB` | `data/analysis.sqlite` | SQLite path for roots, caches, and error logs. |

Examples:

```bash
PORT=5173 npm start
```

```bash
SKILL_ROOT=/Users/me/.copilot/skills SKILL_ANALYSIS_DB=data/dev.sqlite npm start
```

Stop a custom-port server with the same `PORT`:

```bash
PORT=5173 npm stop
```

## Local Workflow

1. Start with `npm start` and open `http://localhost:4173`.
2. Run **Global scan** to discover supported default Skill directories.
3. Add a custom Skill root when needed.
4. Select a root and choose a Skill from the sidebar list.
5. Review immediate rule analysis, graph nodes, file tree, trigger prompts, tools, and run methods.
6. Open **Settings** to change language or select a live Copilot model.
7. Run **AI evaluation** to generate model-backed scores, insight, activation prompts, and graph content.
8. Use the document panel to switch between original and translated Skill.md when available.

## Reusable Workbench Template

`web_template/` is a standalone static template package for future console-style projects. It is intentionally separate from the running app.

- `templates/workbench-shell.html` provides the static shell.
- `assets/design-tokens.css` defines semantic tokens and base styles.
- `assets/workbench.css` defines layout and components.
- `assets/workbench.js` provides small static interactions.
- `WEB_DESIGN_STANDARD.md` and `CORE_COMPONENTS.md` document visual standards and component boundaries.

Use this package as a clean starting point; do not copy runtime APIs, database code, or Copilot SDK workflows unless the new project needs them.

## Security and Privacy

- The app reads only discovered or explicitly configured Skill roots.
- Custom root paths are stored locally in SQLite.
- Skill descriptions and sampled supporting files are sent to GitHub Copilot SDK only for requested AI evaluation or translation.
- Error details are stored locally in `app_error_logs`.
- Exposing the server beyond localhost can expose filesystem-backed APIs; add authentication and path-access controls first.

## Troubleshooting

- **No Skills appear**: run **Global scan**, add a custom directory, or set `SKILL_ROOT` before first startup.
- **AI evaluation asks for auth**: run `gh auth login --web` and `gh auth refresh --scopes copilot`, then recheck status in the app.
- **Model list is slow**: expected on first Settings open in a page session; reopening Settings uses the in-page cache.
- **Database reset**: stop the server and remove `data/analysis.sqlite`; it will be recreated on next startup.
- **Port already in use**: run `npm stop`, or use the same custom `PORT` for start and stop.
