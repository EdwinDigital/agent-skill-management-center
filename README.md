# Skill Logic Visualizer

Skill Logic Visualizer is a local-first web application for auditing Agent Skills. It scans Skill directories, lists available Skills, reads each Skill's description and file structure, then renders an interactive execution map with rule-based analysis and optional GitHub Copilot SDK-powered AI evaluation.

## Highlights

- **Directory registry and scanning**: Maintains Skill directory defaults and scanned/custom roots in a local SQLite database. The built-in scan discovers supported agent Skill paths such as `.agents/skills`, `.copilot/skills`, `.claude/skills`, and others.
- **Multiple custom Skill roots**: Add multiple local Skill directories. The app opens a native folder picker, scans the selected path before saving, shows how many Skill folders were found, lets you customize the directory display name, then stores the full absolute path.
- **Skill sidebar**: Directory switcher, name search, delete support for custom roots, and 10-item pagination.
- **Rule analysis by default**: Selected Skills are parsed locally to infer summary, trigger prompts, tools, run methods, files, decision nodes, complexity, and a logic graph.
- **AI evaluation on demand**: The **AI evaluation** button asks GitHub Copilot SDK to generate a model-backed logic map, unified complexity score, ROI score, manual time estimate, model insight, and trigger prompt/use-case examples.
- **Persistent analysis cache**: AI evaluation results are stored in `~/.skill-logic-visualizer/analysis.sqlite` and reused when the Skill content, model, language, and schema match.
- **Trigger prompt scenarios**: Activation output is expressed as realistic user prompts plus typical usage scenarios, not only keywords.
- **Startup-style UI**: Responsive, bilingual English/Chinese interface with light/dark theme, Flowise-like horizontal logic map, node inspector, score cards, and directory telemetry.
- **GitHub account integration**: Uses GitHub CLI status to show login state and Copilot scope guidance.

## Technical architecture

```text
Browser UI (public/)
  ├─ Sidebar: directory registry, search, pagination
  ├─ Skill detail: scores, model insight, trigger prompts, files
  └─ Logic map: interactive horizontal graph + node inspector

Express server (server.js)
  ├─ Skill filesystem reader and rule analyzer
  ├─ SQLite registry/cache via node:sqlite
  ├─ Native local folder picker on macOS via osascript
  ├─ GitHub CLI auth status
  └─ GitHub Copilot SDK model evaluation

Local database
  └─ ~/.skill-logic-visualizer/analysis.sqlite
     ├─ skill_directory_defaults
     ├─ skill_directory_scan
     └─ skill_model_analyses
```

### Main APIs

| API | Purpose |
| --- | --- |
| `GET /api/skill-roots` | Read scanned/custom Skill directories from SQLite. |
| `POST /api/skill-roots/scan` | Scan known default agent Skill paths and add existing ones. |
| `POST /api/skill-roots/pick-local` | Open native local folder picker and inspect selected directory before saving. |
| `POST /api/skill-roots/custom` | Save a custom Skill directory path and display name. |
| `DELETE /api/skill-roots/:id` | Delete a removable custom directory. |
| `GET /api/skills` | List Skill folders under a selected root. |
| `GET /api/skills/:name` | Read a Skill description, files, and rule analysis. |
| `POST /api/logic-map/cache` | Load cached AI evaluation for the current Skill/model/language/content. |
| `POST /api/logic-map/generate` | Generate and cache AI evaluation through GitHub Copilot SDK. |
| `GET /api/auth/github/status` | Read GitHub auth/Copilot scope status through `gh`. |

## Prerequisites

- **Node.js with `node:sqlite` support**. This project uses `DatabaseSync` from `node:sqlite`; Node 22+ or newer is recommended.
- **npm** for dependency installation.
- **GitHub CLI (`gh`)** for GitHub login status and Copilot scope refresh.
- **GitHub Copilot access** for AI evaluation through `@github/copilot-sdk`.
- **macOS** for the native local folder picker used by `POST /api/skill-roots/pick-local` (`osascript`). Default path scanning and explicit server paths work through Node filesystem access.

Authenticate GitHub CLI and refresh Copilot scope when needed:

```bash
gh auth login
gh auth refresh --scopes copilot
```

## Local development

Install dependencies:

```bash
npm install
```

Run syntax checks:

```bash
npm run check
node --check public/app.js
```

Start the local server:

```bash
npm start
```

Open:

```text
http://localhost:4173
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4173` | Local web server port. |
| `SKILL_ROOT` | `~/.agents/skills` | Initial default Skill root inserted into the scan table when it exists. |
| `SKILL_ANALYSIS_DB` | `~/.skill-logic-visualizer/analysis.sqlite` | SQLite database path for directory registry and AI analysis cache. |

Example:

```bash
PORT=5173 SKILL_ROOT=/Users/me/.agents/skills npm start
```

## Operating workflow

1. Start the app and open `http://localhost:4173`.
2. Click **Scan** to discover known agent Skill directories from the defaults table.
3. Click **Choose local skills directory** to add a custom path. The app scans it first, shows the Skill count, lets you set a display name, then saves the full path.
4. Select a Skill from the sidebar.
5. Review the default rule analysis: logic map, tools, trigger prompts, run methods, files, and complexity.
6. Click **AI evaluation** to generate model-backed logic map, complexity, ROI, manual time estimate, and prompt/use-case scenarios. Results are cached in SQLite.

## Deployment and runtime notes

This app is designed as a local developer tool. A typical deployment is a local Node process bound to `localhost`.

For a long-running local process:

```bash
nohup npm start > /tmp/skill-logic-visualizer.log 2>&1 &
```

For production-like hosting, keep the same Node server and static assets together because the frontend depends on server APIs for filesystem access, SQLite storage, GitHub auth status, and Copilot SDK evaluation. Protect the service if exposed beyond localhost: it can read local Skill directories configured in the database.

## Data storage

The app stores runtime state in SQLite, not in the repository:

```text
~/.skill-logic-visualizer/analysis.sqlite
```

It contains directory defaults, scanned/custom directories, and cached model analyses. Removing this file resets discovered directories and AI evaluation cache.
