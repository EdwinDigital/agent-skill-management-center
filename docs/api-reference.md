# API Reference

[中文](api-reference-CN.md) · [Docs index](README.md) · [Project home](../README.md)

The Express API is available at `http://localhost:4173` by default. Vite development proxies `/api` to that address. In desktop mode Tauri discovers the random sidecar port and sends `X-Agent-SMC-Token` on every API request.

## Endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /api/config` | Default Skill root, languages, and fallback model. |
| `GET /api/progress/:requestId` | Progress for AI evaluation or translation. |
| `GET /api/skill-roots` | Scanned and custom Skill roots. |
| `POST /api/skill-roots/scan` | Scan known global Skill path conventions and refresh indexes. |
| `POST /api/skill-roots/pick-local` | Open the macOS native folder picker and inspect the selected directory. |
| `POST /api/skill-roots/custom` | Validate and save a custom filesystem or browser root. |
| `DELETE /api/skill-roots/:id` | Remove a removable custom root. |
| `GET /api/skills` | List indexed Skills under the selected root. |
| `GET /api/skills/:name` | Read Skill content, files, statistics, and rule analysis. |
| `GET /api/auth/github/status` | Read stored OAuth/environment/CLI readiness; `?check=1` performs a live check. |
| `POST /api/auth/github/login` | Return GitHub CLI guidance for web development. |
| `POST /api/auth/github/device/start` | Start GitHub Device OAuth and return verification URI/code. |
| `POST /api/auth/github/device/poll` | Poll a Device OAuth request and store the resulting token. |
| `POST /api/auth/github/logout` | Clear stored OAuth and log out an active GitHub CLI identity when present. |
| `GET /api/models` | Fallback models, or live Copilot SDK models with `?live=1`. |
| `POST /api/analyze-skill` | Legacy model insight endpoint with rule fallback. |
| `POST /api/logic-map/cache` | Check model-analysis cache metadata and result. |
| `POST /api/logic-map/generate` | Generate and cache scores, insights, prompts, and graph. |
| `POST /api/skill-translation/cache` | Check Skill.md translation cache. |
| `POST /api/skill-translation/generate` | Translate and cache Skill.md. |
| `GET /api/error-logs` | Recent structured server errors. |

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | Node default | Bind host. Desktop always sets `127.0.0.1`. |
| `PORT` | `4173` | Express port; `0` selects a random port for desktop. |
| `SKILL_ROOT` | `~/.agents/skills` | Initial root inserted when it exists. |
| `SKILL_ANALYSIS_DB` | `data/analysis.sqlite` | SQLite path; desktop overrides it with app data. |
| `AGENT_SMC_SIDECAR` | unset | Enables the `AGENT_SMC_READY` startup message. |
| `AGENT_SMC_TOKEN` | unset | Protects `/api/` routes when provided. |
| `COPILOT_GITHUB_TOKEN` | unset | Highest-priority GitHub token override. |
| `GH_TOKEN` / `GITHUB_TOKEN` | unset | Alternate environment token sources. |
| `GITHUB_OAUTH_CLIENT_ID` | bundled client ID | Device OAuth client override. |
| `GITHUB_OAUTH_SCOPES` | `read:user user:email copilot` | Requested Device OAuth scopes. |

Relative database paths resolve from the project directory. Filesystem roots support native absolute paths, relative paths, `~/...`, and `~\...`. Windows uses drive and UNC semantics. Browser roots such as `browser://selected` are preserved without filesystem normalization.

## Authentication

Token priority is `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`, then locally stored Device OAuth. A stored token is considered Copilot-ready only when its scopes include `copilot`.

Web development can use GitHub CLI:

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

Desktop users can complete Device OAuth in the application and do not need `gh` installed.

## Error Behavior

API errors return JSON with a user-facing message and are recorded in `app_error_logs` when possible. Model listing can return fallback models with auth guidance rather than failing Settings completely. Oversized request bodies return HTTP 413.
