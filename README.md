# AI Agent Skills Console

AI Agent Skills Console is a local-first web console for exploring, auditing, translating, and AI-evaluating Agent Skills. It scans Skill directories on the local machine, reads each Skill's definition and file tree, builds a rule-based execution map immediately, and can ask GitHub Copilot SDK for a richer model-backed logic map, complexity score, ROI score, manual-time estimate, trigger prompts, and Chinese/English Skill documentation views.

The app is designed for developers and AI-agent builders who maintain many Skills across different runtimes and want a fast visual way to understand how each Skill is triggered, what tools it uses, what files support it, and whether it is worth deeper AI evaluation.

## Highlights

- **Local Skill registry**: discovers default Skill locations for many agent ecosystems and stores scanned/custom roots in SQLite.
- **Multiple Skill roots**: add local directories with a native macOS folder picker, preview the detected Skill count, choose a display name, switch between roots, and delete removable custom roots.
- **Fast first screen**: the app loads config, roots, and Skill lists first; slow GitHub CLI and Copilot model-list calls are deferred so page refreshes stay responsive.
- **Session-cached model list**: the full Copilot model list is loaded only the first time Settings is opened in a browser session. Reopening Settings uses the in-page cache; refreshing or reopening the site resets that cache.
- **Rule analysis by default**: every selected Skill gets an immediate local analysis with summary, trigger prompts, tool surfaces, run methods, files, decision nodes, and a horizontal logic graph.
- **AI evaluation on demand**: the AI evaluation button generates and caches a model-backed logic map, complexity score, ROI score, manual work estimate, model insight, and realistic trigger prompt/use-case examples.
- **Unrated score cards before AI evaluation**: Complexity and ROI stay `Not evaluated` until model evaluation completes, avoiding misleading rule-derived scores.
- **Skill.md translation workflow**: Skill documentation can be viewed as original or translated Markdown; translations are cached by Skill path and language.
- **Progress feedback**: long-running evaluation and translation work reports status through `/api/progress/:requestId`, so the UI can show what is happening without blocking.
- **Bilingual UI**: English and Chinese labels, settings, progress text, and generated/readable content modes are supported.
- **Polished shadcn-style interface**: React 19, Vite, Tailwind CSS v4, shadcn/Radix primitives, lucide icons, Sonner notifications, theme switching, responsive sidebars, file-tree panels, score cards, and an interactive execution graph.
- **GitHub/Copilot integration**: reads GitHub CLI status, guides Copilot scope setup, lazily loads Copilot SDK models, and retries AI evaluation after refreshing models when a selected model is unavailable.
- **Local data by default**: runtime data lives under project-relative `data/analysis.sqlite`, and `data/` is ignored by Git.

## Solution design

The product separates instant local inspection from slower model-assisted evaluation.

1. **Startup path**
   - The browser requests `/api/config`, `/api/skill-roots`, and the first selected root's Skill list.
   - The frontend loads fallback model metadata only, then checks GitHub status in the background.
   - No live Copilot model listing is performed on first page load.

2. **Skill inspection path**
   - Selecting a Skill calls `/api/skills/:name` with the active root and language.
   - The server reads the Skill folder, picks the best description file, samples supporting files, extracts tools/triggers/methods, and returns a rule graph.
   - The UI renders the graph, node inspector, trigger prompts, run methods, tool stack, and file tree immediately.

3. **AI evaluation path**
   - The UI first calls `/api/logic-map/cache` to check whether a matching model analysis exists.
   - If cache misses, `/api/logic-map/generate` starts Copilot SDK evaluation and stores progress in memory for polling.
   - The model response is normalized into graph nodes/edges, complexity, ROI, manual-time estimate, prompt examples, and insight sections.
   - Results are saved in SQLite and reused when the Skill path, language, content hash, model, and schema are compatible.

4. **Translation path**
   - The Skill document panel can show original Markdown or a translated version.
   - `/api/skill-translation/cache` checks saved translation first.
   - `/api/skill-translation/generate` uses Copilot SDK when translation is needed, then stores the Markdown result in SQLite.
   - If the content is already in the requested language, the server returns a skipped translation result.

5. **Settings and authentication path**
   - Settings shows language, default model, and GitHub identity.
   - The full model list is fetched only on the first Settings open in the current page session.
   - If Copilot auth is missing, the UI presents GitHub CLI guidance such as `gh auth login --web && gh auth refresh --scopes copilot`.

## Technical architecture

```text
Browser
  └─ React 19 + Vite + Tailwind CSS v4 + shadcn/Radix components
     ├─ App shell, sidebar, settings dialog, theme/language controls
     ├─ Skill list search, pagination, custom root workflow
     ├─ Score cards, model insights, trigger prompts, run methods
     ├─ Interactive horizontal logic graph and node inspector
     └─ Skill.md original/translated document panel

Node/Express server (server.js)
  ├─ Static asset serving from public/dist and public
  ├─ Skill root registry and directory scanner
  ├─ Skill filesystem reader and local rule analyzer
  ├─ SQLite runtime storage through node:sqlite DatabaseSync
  ├─ GitHub CLI auth/status/logout helpers through gh
  ├─ macOS folder picker through osascript
  ├─ GitHub Copilot SDK model listing, evaluation, and translation
  ├─ In-memory progress store for polling
  └─ JSON error logging to SQLite

Local runtime data
  └─ data/analysis.sqlite  (created on first server start)
```

## Project structure

```text
.
├─ server.js                  # Express API, SQLite setup, scanning, Copilot SDK workflows
├─ package.json               # npm scripts and runtime dependencies
├─ vite.config.js             # Vite build config, API proxy for dev server, public/dist output
├─ index.html                 # Vite entry HTML
├─ src/
│  ├─ main.tsx                # React bootstrap
│  ├─ App.tsx                 # Main app state, UI flows, graph, settings, evaluation, translation
│  ├─ index.css               # Tailwind v4/theme styles and local font imports
│  ├─ lib/utils.ts            # Shared className utility
│  └─ components/ui/          # shadcn/Radix UI primitives used by the app
├─ public/
│  ├─ favicon.svg
│  ├─ dist/                   # Vite production build output, ignored by Git
│  └─ legacy static assets    # older static files retained for compatibility/reference
├─ scripts/
│  └─ stop.js                 # Stops the process listening on PORT
├─ data/                      # Local SQLite runtime data, ignored by Git
├─ README.md
└─ README-CN.md
```

## Data structure

The SQLite database is created automatically at startup. By default it is project-relative:

```text
data/analysis.sqlite
```

`SKILL_ANALYSIS_DB` can override this path. Relative override values are resolved from the project working directory; absolute paths and `~/...` are also supported.

### Tables

| Table | Purpose | Key fields |
| --- | --- | --- |
| `skill_directory_defaults` | Catalog of known agent Skill directory conventions. | `agent_slug`, `agent_name`, `project_path`, `global_path` |
| `skill_directory_scan` | Scanned and custom Skill roots shown in the sidebar. | `id`, `source_type`, `label`, `path`, `expanded_path`, `exists_on_disk`, `removable` |
| `skill_model_analyses` | Cached AI evaluation results. | `skill_path`, `language`, `model`, `content_hash`, `analysis_json`, timestamps |
| `skill_markdown_translations` | Cached translated Skill.md Markdown. | `skill_path`, `language`, `model`, `content_hash`, `translated_markdown`, timestamps |
| `app_error_logs` | Structured API/runtime error logs. | `created_at`, `level`, `scope`, `method`, `route`, `status`, `message`, `details_json` |

The analysis and translation cache tables use `(skill_path, language)` as the primary key and keep `model` plus `content_hash` so the server can decide whether a cached entry is an exact match, a historical match, or stale.

## API surface

| API | Purpose |
| --- | --- |
| `GET /api/config` | Returns default root, supported languages, and fallback model id. |
| `GET /api/progress/:requestId` | Reads progress for AI evaluation or translation. |
| `GET /api/skill-roots` | Lists scanned/custom Skill roots from SQLite. |
| `POST /api/skill-roots/scan` | Scans known default agent Skill paths and records existing paths. |
| `POST /api/skill-roots/pick-local` | Opens the native folder picker and inspects the selected directory. |
| `POST /api/skill-roots/custom` | Saves a custom Skill root and display name. |
| `DELETE /api/skill-roots/:id` | Deletes a removable custom Skill root. |
| `GET /api/skills` | Lists Skills under the selected root. |
| `GET /api/skills/:name` | Reads Skill details, files, and local rule analysis. |
| `GET /api/auth/github/status` | Reads GitHub CLI and Copilot auth readiness. |
| `POST /api/auth/github/login` | Returns login/scope guidance for GitHub CLI. |
| `POST /api/auth/github/logout` | Runs GitHub CLI logout for the current authenticated identity. |
| `GET /api/models` | Returns fallback models, or live Copilot models with `?live=1`. |
| `POST /api/logic-map/cache` | Checks cached model analysis for a Skill/model/language/content combination. |
| `POST /api/logic-map/generate` | Generates and caches model-backed logic map and scores. |
| `POST /api/skill-translation/cache` | Checks cached translated Skill Markdown. |
| `POST /api/skill-translation/generate` | Generates and caches translated Skill Markdown. |
| `GET /api/error-logs` | Returns recent structured server errors. |

## Prerequisites

- **Node.js with `node:sqlite` support**. Node 22+ is recommended because the app uses `DatabaseSync` from `node:sqlite`.
- **npm** for installing dependencies and running scripts.
- **GitHub CLI (`gh`)** for auth state, logout, and Copilot scope guidance.
- **GitHub Copilot access** for live model listing, AI evaluation, and Skill.md translation through `@github/copilot-sdk`.
- **macOS** for the native local folder picker endpoint (`osascript`). Direct path scanning and server-side filesystem access still use Node APIs.

Authenticate GitHub CLI and refresh the Copilot OAuth scope when needed:

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

## Development scripts

Install dependencies:

```bash
npm install
```

Run the production-style local server:

```bash
npm start
```

`npm start` runs:

```bash
npm run build && node server.js
```

Stop the process listening on the configured port:

```bash
npm stop
```

Run type and server syntax checks:

```bash
npm run check
```

Build the frontend only:

```bash
npm run build
```

Run the Vite development server with API proxying to the Express server:

```bash
npm run dev
```

For the dev server flow, run `node server.js` separately on port `4173`; Vite serves the frontend on `127.0.0.1:5173` and proxies `/api` to Express.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4173` | Express server port. |
| `SKILL_ROOT` | `~/.agents/skills` | Initial default Skill root inserted into the scan table when it exists. |
| `SKILL_ANALYSIS_DB` | `data/analysis.sqlite` | SQLite database path for directory registry, AI analysis cache, translation cache, and error logs. Relative paths are resolved from the project directory. |

Examples:

```bash
PORT=5173 npm start
```

```bash
SKILL_ROOT=/Users/me/.copilot/skills SKILL_ANALYSIS_DB=data/dev.sqlite npm start
```

Stop a custom-port instance with the same `PORT` value:

```bash
PORT=5173 npm stop
```

## Local workflow

1. Start the app with `npm start` and open `http://localhost:4173`.
2. Click **Global scan** to discover supported default Skill directories on your machine.
3. Click **Add directory** to add a custom Skill root through the native picker.
4. Select a root from the directory switcher, then pick a Skill from the paged sidebar list.
5. Review the immediate rule analysis: file tree, trigger prompts, tool stack, run methods, logic graph, and node evidence.
6. Open **Settings** if you want to choose a specific Copilot model; the model list is fetched only once per page session.
7. Click **AI evaluation** to generate model-backed complexity/ROI scores and richer graph/insight content.
8. Use the Skill document panel to switch between original and translated Markdown when translation is available.

## Deployment notes

This project is intended as a local developer console. The Express server reads local directories configured by the user, writes a local SQLite database, and shells out to local tools such as `gh`, `osascript`, and `lsof`. Keep it bound to localhost unless you add authentication and path-access controls.

Recommended local runtime:

```bash
npm start
npm stop
```

Open `http://localhost:4173` after the server starts.

The production build is emitted to `public/dist` and served by `server.js` together with the API routes. `public/dist/` and `data/` are ignored by Git, so deployment automation should run `npm install` and `npm run build` (or `npm start`) on the target machine.

## Security and privacy notes

- The app reads only Skill roots that are discovered or explicitly configured.
- Custom root paths are stored locally in SQLite.
- Skill descriptions and sampled supporting files are sent to GitHub Copilot SDK only when AI evaluation or translation is requested.
- Error details are stored locally in `app_error_logs` to help diagnose failed API calls.
- Exposing the server beyond localhost can expose filesystem-backed APIs; protect it before remote use.

## Troubleshooting

- **No Skills appear**: run **Global scan**, add a custom directory, or set `SKILL_ROOT` before first startup.
- **AI evaluation asks for auth**: run `gh auth login --web` and `gh auth refresh --scopes copilot`, then recheck status in the app.
- **Model list is slow**: this is expected for the first Settings open in a page session because it starts Copilot SDK and lists live models. Reopening Settings uses the in-page cache.
- **Database reset**: stop the server and remove `data/analysis.sqlite`; it will be recreated on the next startup.
- **Port already in use**: run `npm stop`, or set a different `PORT` value for both start and stop commands.
