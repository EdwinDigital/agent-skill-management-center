# Version Definition

## Current Version

**Agent Skill Management Center Version 1.1.1**

Package version: `1.1.1`

## Version 1.0 Scope

Version 1.0 defines the first stable local-first release of Agent Skill Management Center. It includes:

- Local Skill root discovery, custom root management, search, selection, and pagination.
- Immediate rule-based Skill analysis with summary, triggers, tools, run methods, file stats, graph nodes, and evidence.
- On-demand GitHub Copilot SDK evaluation for model-backed complexity, ROI, insights, activation prompts, and logic graphs.
- Skill.md original and translated Markdown views with translation caching.
- Project-relative SQLite runtime storage at `data/analysis.sqlite` by default.
- Session-cached live Copilot model listing in Settings.
- Three-area workbench UI: `SidebarConsole`, `DetailSurface`, and `DocPanel`.
- Standalone reusable static workbench template under `web_template/`.

## Version 1.0 Stability Rules

The following behavior is considered part of the Version 1.0 contract:

- Complexity and ROI are unrated until AI evaluation returns model scores.
- AI analysis and translation caches are keyed by Skill path, language, model, content hash, and schema compatibility.
- Runtime data stays project-local by default and must not be moved back to a home-directory default.
- Settings loads the live Copilot model list only once per browser page session.
- `web_template/` remains isolated from runtime app code and can be copied into future projects.

## Versioning Policy

- Patch updates (`1.0.x`) are for bug fixes, documentation corrections, and non-breaking UI polish.
- Minor updates (`1.x`) may add capabilities without breaking the Version 1.0 workflow or data expectations.
- Major updates (`2.x`) may change storage, API contracts, or core workflow behavior.

## Release Validation

Before declaring a release ready, run:

```bash
npm run check
npm run build
```

For UI or AI workflow changes, additionally verify the app in the browser and test a real Skill through AI evaluation and cache reads.
