# Open Source Documentation Design

## Goal

Turn the repository homepage into a concise, screenshot-led open source project introduction while preserving the existing technical detail in navigable bilingual documentation. Add the community health files expected from a mature GitHub project without changing application behavior.

## Audience

- Users who want to download the correct desktop package quickly.
- Developers evaluating the product and architecture.
- Contributors preparing issues or pull requests.
- Security researchers reporting vulnerabilities responsibly.

## README Structure

`README.md` and `README-CN.md` use the same section order and cross-link at the top:

1. Project name, one-sentence positioning, release/CI/license/platform badges.
2. Primary workbench screenshot.
3. Short value proposition and core capabilities.
4. Desktop download table for macOS ARM64, Windows x64, and Windows ARM64.
5. Screenshot gallery showing analysis, Skill.md, file tree, and model settings.
6. Five-minute source setup and key commands.
7. Documentation map.
8. Contributing, security, support, and license links.

README files should remain scannable and avoid duplicating API tables, full architecture explanations, detailed configuration, or troubleshooting procedures.

## Detailed Documentation

The current README content moves into these bilingual documents:

- `docs/overview.md` and `docs/overview-CN.md`: product model, capabilities, UI areas, local-first behavior, data/cache model.
- `docs/architecture.md` and `docs/architecture-CN.md`: startup, Skill inspection, AI evaluation, translation, auth, runtime architecture, project structure.
- `docs/api-reference.md` and `docs/api-reference-CN.md`: API table, configuration variables, authentication behavior, path/platform notes.
- `docs/development.md` and `docs/development-CN.md`: prerequisites, scripts, local workflow, tests, build commands, repository conventions.
- `docs/desktop-release.md` and `docs/desktop-release-CN.md`: installer selection, data locations, signing warnings, CI/release workflow, checksums.
- `docs/troubleshooting.md` and `docs/troubleshooting-CN.md`: common runtime, auth, model, database, path, and port problems.
- `docs/README.md`: bilingual documentation index.

The documents link to their counterpart language and back to the repository README.

## Screenshot Assets

Create `docs/images/` and copy the five supplied PNG images without recompression:

- `home-workbench.png`
- `skill-analysis.png`
- `skill-document.png`
- `skill-file-tree.png`
- `settings-models.png`

All images use descriptive alt text. The main screenshot renders full-width; gallery images use HTML width constraints to avoid oversized README rendering.

## Community Standards

Add:

- `LICENSE`: MIT, copyright 2026 EdwinDigital.
- `CONTRIBUTING.md`: development setup, issue/PR expectations, test commands, scope discipline, commit guidance.
- `CODE_OF_CONDUCT.md`: Contributor Covenant 2.1 with GitHub-based enforcement contact.
- `SECURITY.md`: supported version policy and GitHub private vulnerability reporting instructions; explicitly prohibit public security issues.
- `SUPPORT.md`: documentation-first support and issue routing.
- `CHANGELOG.md`: Keep a Changelog style, with `1.0.0` desktop release entry.
- `.github/PULL_REQUEST_TEMPLATE.md`.
- `.github/ISSUE_TEMPLATE/bug_report.yml`.
- `.github/ISSUE_TEMPLATE/feature_request.yml`.
- `.github/ISSUE_TEMPLATE/config.yml`.

Update `package.json` with MIT license and repository/bugs/homepage metadata. Update `VERSION.md` to match released `1.0.0`, removing stale `1.1.2` claims.

## Validation

- Verify every relative Markdown link resolves to an existing file.
- Verify every screenshot is a valid PNG and referenced by both READMEs.
- Parse issue form YAML files and existing workflow YAML files.
- Confirm package, Cargo, Tauri, VERSION, README, changelog, and Release references consistently describe `1.0.0`.
- Run `npm test`, `npm run check`, and `npm run build`.
- Re-query GitHub community profile after publication; local work only reports expected files until pushed.

## Non-goals

- No documentation site framework or GitHub Pages deployment.
- No application UI or runtime behavior changes.
- No dependency upgrades.
- No signing/notarization changes.
