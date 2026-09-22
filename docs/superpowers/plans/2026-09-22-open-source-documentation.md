# Open Source Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a screenshot-led bilingual repository homepage, move detailed material into bilingual docs, and add standard GitHub community health files.

**Architecture:** README files become concise navigation and onboarding surfaces. Detailed product, architecture, API, development, release, and troubleshooting content lives in paired English/Chinese documents under `docs/`; community policy stays in standard root and `.github` locations.

**Tech Stack:** Markdown, PNG, YAML, GitHub community health files, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-22-open-source-documentation-design.md`

## Global Constraints

- Preserve application behavior and runtime source.
- Use the five supplied screenshots without recompression.
- Keep English and Chinese README structures aligned.
- License is MIT, copyright 2026 EdwinDigital.
- Version references must match released `v1.0.0`.
- Do not add a documentation framework or upgrade dependencies.

## Review Focus

- Relative links must resolve from the file containing them.
- Screenshots must be valid PNGs and have stable descriptive names.
- Desktop download links must point to the published `v1.0.0` assets.
- Security reports must route privately rather than to public Issues.
- English and Chinese docs must not contradict platform, signing, version, or storage behavior.

---

### Task 1: Screenshot Assets

**Files:**
- Create: `docs/images/home-workbench.png`
- Create: `docs/images/skill-analysis.png`
- Create: `docs/images/skill-document.png`
- Create: `docs/images/skill-file-tree.png`
- Create: `docs/images/settings-models.png`

**Steps:**
- [ ] Copy the five located VS Code chat images to the stable names above.
- [ ] Verify each file with `file docs/images/*.png` and image dimensions with `sips -g pixelWidth -g pixelHeight docs/images/*.png`.
- [ ] Record SHA-256 hashes so accidental replacement is visible during review.

### Task 2: Bilingual Detailed Documentation

**Files:**
- Create: `docs/README.md`
- Create: `docs/overview.md`, `docs/overview-CN.md`
- Create: `docs/architecture.md`, `docs/architecture-CN.md`
- Create: `docs/api-reference.md`, `docs/api-reference-CN.md`
- Create: `docs/development.md`, `docs/development-CN.md`
- Create: `docs/desktop-release.md`, `docs/desktop-release-CN.md`
- Create: `docs/troubleshooting.md`, `docs/troubleshooting-CN.md`

**Steps:**
- [ ] Move all detailed product, architecture, API, development, release, and troubleshooting facts from the current README files into the paired documents.
- [ ] Add language counterpart and repository-home links to every document.
- [ ] Keep current API routes, Node/Tauri architecture, data paths, Windows path behavior, Device OAuth, unsigned-package warnings, and CI/release behavior accurate.

### Task 3: Concise Bilingual README Files

**Files:**
- Replace: `README.md`
- Replace: `README-CN.md`
- Modify: `VERSION.md`
- Modify: `package.json`

**Steps:**
- [ ] Build aligned English/Chinese README pages with badges, primary screenshot, value proposition, release downloads, gallery, quick start, docs map, and community links.
- [ ] Use exact `v1.0.0` release asset URLs and explain platform selection.
- [ ] Update `VERSION.md` to released version `1.0.0` and remove stale `1.1.2` scope text.
- [ ] Add `license`, `repository`, `bugs`, and `homepage` metadata to `package.json` without changing dependencies.

### Task 4: GitHub Community Standards

**Files:**
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SECURITY.md`
- Create: `SUPPORT.md`
- Create: `CHANGELOG.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

**Steps:**
- [ ] Add MIT license and Contributor Covenant 2.1.
- [ ] Add repository-specific contributing, security, support, and changelog guidance.
- [ ] Add structured bug/feature issue forms and a PR checklist covering tests, docs, screenshots, data/build artifacts, and security.
- [ ] Route vulnerability reports to GitHub private advisories.

### Task 5: Documentation Validation

**Files:**
- Create: `tests/documentation.test.mjs`

**Steps:**
- [ ] Add tests that verify required community files, screenshot signatures, README image references, bilingual doc pairs, version consistency, package metadata, and local Markdown links.
- [ ] Parse issue-template YAML and workflow YAML with the existing `yaml` dev dependency.
- [ ] Run `npm test`, `npm run check`, `npm run build`, and `git diff --check`.
- [ ] Review the final Git diff for duplicated README detail, stale versions, broken links, and accidental generated files.
