# Cross-Platform CI and v1.0.0 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repeatable CI and tag-driven desktop releases for macOS ARM64, Windows x64, and Windows ARM64, then publish `v1.0.0` with complete installers and checksums.

**Architecture:** Keep the existing Tauri WebView plus Node/Express sidecar. Each target-native runner packages its own Node executable and Copilot native dependency, while shared path helpers provide native Windows initialization and scanning semantics. CI validates source on normal pushes; a separate prepare/build/publish workflow keeps the GitHub Release in draft state until all three target artifacts are present.

**Tech Stack:** Node.js 24, React 19, TypeScript, Node test runner, Tauri 2.11, Rust stable, GitHub Actions, NSIS, DMG, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-09-22-cross-platform-ci-release-design.md`

## Global Constraints

- Release version is exactly `1.0.0`; git tag is exactly `v1.0.0`.
- Release targets are macOS ARM64, Windows x64, and Windows ARM64 only.
- Desktop apps bundle Node and do not require a system Node installation.
- Do not add a single-file Node packager or rewrite API behavior in Rust.
- CI has read-only repository permissions; only the Release workflow receives `contents: write`.
- A public Release is created only after all three installers and `SHA256SUMS.txt` exist.
- macOS uses ad-hoc signing; Windows installers are unsigned for this release.
- Existing SQLite schema, API paths, frontend behavior, and project-relative web database default remain stable.

## Review Focus

- Windows `~\skills`, drive-letter, mixed-separator, and UNC inputs resolve without being prefixed by the project directory; Task 2 adds direct `path.win32` tests.
- A packaged app starts without system Node; Task 4 executes the copied Node runtime and verifies the Rust launcher contract.
- A localhost process cannot call token-protected sidecar APIs; Task 3 tests unauthorized and authorized requests.
- A mismatched tag or missing target artifact cannot publish a Release; Task 6 adds workflow contract tests for both gates.
- Device OAuth remains usable when GitHub CLI is absent; Task 3 restores and exercises the existing endpoint contract.

---

### Task 1: Version and Deterministic Desktop Commands

**Files:**
- Create: `tests/release-config.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `tests/desktop-tauri-scaffold.test.mjs`

**Interfaces:**
- Consumes: existing npm scripts and Tauri metadata.
- Produces: `npm test`, local `tauri` commands, and synchronized `1.0.0` metadata used by later workflow tasks.

- [ ] **Step 1: Write the failing release metadata test**

```js
test("release metadata and desktop CLI are deterministic", () => {
  assert.equal(packageJson.version, "1.0.0");
  assert.equal(tauriConfig.version, "1.0.0");
  assert.match(cargoToml, /version = "1\.0\.0"/);
  assert.equal(packageJson.devDependencies["@tauri-apps/cli"], "2.11.4");
  assert.equal(packageJson.scripts.test, "node --test tests/*.test.mjs");
  assert.equal(packageJson.scripts["desktop:build"], "tauri build");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/release-config.test.mjs`

Expected: FAIL because version is `1.1.2`, the CLI is absent, and the scripts do not exist.

- [ ] **Step 3: Update package metadata and lock the CLI**

Run:

```bash
npm install --save-dev --save-exact @tauri-apps/cli@2.11.4
npm version 1.0.0 --no-git-tag-version --allow-same-version
```

Set scripts to:

```json
{
  "test": "node --test tests/*.test.mjs",
  "desktop:dev": "tauri dev",
  "desktop:build": "tauri build",
  "desktop:build:mac": "tauri build --bundles dmg && node scripts/build-dmg-app.js",
  "desktop:build:windows": "tauri build --bundles nsis"
}
```

Set Cargo and Tauri versions to `1.0.0`, then run `cargo update --workspace` from `src-tauri` only if Cargo.lock needs metadata regeneration.

- [ ] **Step 4: Update old version assertions and verify GREEN**

Run: `node --test tests/release-config.test.mjs tests/desktop-tauri-scaffold.test.mjs`

Expected: PASS with both files using `1.0.0` and local `tauri` commands.

- [ ] **Step 5: Commit Task 1**

```bash
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json tests/release-config.test.mjs tests/desktop-tauri-scaffold.test.mjs
git commit -m "build: prepare v1.0.0 desktop toolchain"
```

### Task 2: Native Windows Skill Path Semantics

**Files:**
- Modify: `tests/path-utils.test.mjs`
- Modify: `tests/server-config.test.mjs`
- Modify: `core/utils/paths.js`
- Modify: `server/config.js`
- Modify: `setup/database.js`
- Modify: `server.js`

**Interfaces:**
- Consumes: `SKILL_ROOT`, `SKILL_ANALYSIS_DB`, CSV `global_path`, `os.homedir()`, and Node `path` APIs.
- Produces: `expandHomePath(value, homeDir, pathApi)`, `resolveProjectPath(value, options)`, and `normalizeScanPath(value, sourceType, options)` shared by database setup and API scanning.

- [ ] **Step 1: Add failing Windows path tests**

```js
test("Windows paths expand home, preserve drives, and preserve UNC roots", () => {
  const options = {
    cwd: "C:\\work\\agent-smc",
    homeDir: "C:\\Users\\Example",
    pathApi: path.win32
  };
  assert.equal(expandHomePath("~\\skills", options.homeDir, path.win32), "C:\\Users\\Example\\skills");
  assert.equal(resolveProjectPath("D:\\shared\\skills", options), "D:\\shared\\skills");
  assert.equal(resolveProjectPath("\\\\server\\share\\skills", options), "\\\\server\\share\\skills");
  assert.equal(normalizeScanPath("browser://selected", "browser", options), "browser://selected");
});
```

Add a server config assertion that `createServerConfig()` with `path.win32`, a Windows home, and no `SKILL_ROOT` returns `C:\Users\Example\.agents\skills`.

- [ ] **Step 2: Run focused path tests and verify RED**

Run: `node --test tests/path-utils.test.mjs tests/server-config.test.mjs`

Expected: FAIL because helpers do not accept `pathApi`, `~\` is not expanded, and `normalizeScanPath` ignores `cwd`.

- [ ] **Step 3: Implement shared path helpers**

Implement this behavior in `core/utils/paths.js`:

```js
export function expandHomePath(value, homeDir = os.homedir(), pathApi = path) {
  const text = String(value || "");
  return /^~[\\/]/.test(text)
    ? pathApi.join(homeDir, text.slice(2))
    : text;
}

export function resolveProjectPath(value, {
  cwd = process.cwd(),
  homeDir = os.homedir(),
  pathApi = path
} = {}) {
  const expanded = expandHomePath(value, homeDir, pathApi);
  return pathApi.isAbsolute(expanded) ? pathApi.normalize(expanded) : pathApi.resolve(cwd, expanded);
}

export function normalizeScanPath(value, sourceType, options = {}) {
  return sourceType === "browser" ? String(value) : resolveProjectPath(value, options);
}
```

Pass `pathApi` through `createServerConfig()` for deterministic tests. Replace local helper copies in `server.js` and `setup/database.js` with imports from `core/utils/paths.js`.

- [ ] **Step 4: Verify path tests and existing database/config tests GREEN**

Run: `node --test tests/path-utils.test.mjs tests/server-config.test.mjs tests/hash-utils.test.mjs`

Expected: PASS on macOS and Windows.

- [ ] **Step 5: Commit Task 2**

```bash
git add core/utils/paths.js server/config.js setup/database.js server.js tests/path-utils.test.mjs tests/server-config.test.mjs
git commit -m "fix: support native Windows skill paths"
```

### Task 3: Restore the Desktop Server Contract and Device OAuth

**Files:**
- Modify: `tests/desktop-sidecar.test.mjs`
- Create: `tests/desktop-server-runtime.test.mjs`
- Modify: `server.js`

**Interfaces:**
- Consumes: `HOST`, `PORT`, `AGENT_SMC_TOKEN`, `AGENT_SMC_SIDECAR`, stored OAuth table, and the existing frontend device-flow calls.
- Produces: authenticated localhost API, `AGENT_SMC_READY` readiness output, and `/api/auth/github/device/start|poll`.

- [ ] **Step 1: Add a failing runtime test for sidecar authentication**

The test spawns `process.execPath server.js` with `HOST=127.0.0.1`, `PORT=0`, a temporary `SKILL_ANALYSIS_DB`, and `AGENT_SMC_TOKEN=test-token`. It waits for `AGENT_SMC_READY`, then asserts:

```js
assert.equal((await fetch(`${baseUrl}/api/config`)).status, 401);
assert.equal((await fetch(`${baseUrl}/api/config`, {
  headers: { "X-Agent-SMC-Token": "test-token" }
})).status, 200);
```

Always terminate the child and delete the temporary directory in `t.after()`.

- [ ] **Step 2: Run sidecar and OAuth tests and verify RED**

Run: `node --test tests/desktop-sidecar.test.mjs tests/desktop-server-runtime.test.mjs tests/github-oauth.test.mjs`

Expected: FAIL because the server does not emit readiness, enforce the token, or expose Device OAuth endpoints.

- [ ] **Step 3: Restore minimal sidecar middleware and listen behavior**

Use `createServerConfig()` for server constants, then restore:

```js
const host = process.env.HOST || undefined;
const sidecarToken = process.env.AGENT_SMC_TOKEN || "";

app.use((request, response, next) => {
  if (sidecarToken && request.path.startsWith("/api/") && request.headers["x-agent-smc-token"] !== sidecarToken) {
    response.status(401).json({ error: "Unauthorized desktop sidecar request." });
    return;
  }
  next();
});
```

Listen with the requested host and report the actual random port:

```js
const server = host ? app.listen(port, host, onServerListening) : app.listen(port, onServerListening);
function onServerListening() {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const actualHost = host || "localhost";
  if (process.env.AGENT_SMC_SIDECAR === "1") {
    console.log(`AGENT_SMC_READY ${JSON.stringify({ host: actualHost, port: actualPort })}`);
  }
}
```

- [ ] **Step 4: Restore Device OAuth from the last known implementation**

Restore the two routes and helpers for device code creation, polling, GitHub user lookup, token persistence, identity refresh, logout cleanup, and stored-token lookup. Keep the OAuth client ID/scopes in environment-overridable constants and include the stored token in `getConfiguredGitHubToken()`.

- [ ] **Step 5: Run focused and full Node tests**

Run:

```bash
node --test tests/desktop-sidecar.test.mjs tests/desktop-server-runtime.test.mjs tests/github-oauth.test.mjs
npm test
```

Expected: all tests pass; the runtime test observes one `401` and one `200`.

- [ ] **Step 6: Commit Task 3**

```bash
git add server.js tests/desktop-sidecar.test.mjs tests/desktop-server-runtime.test.mjs
git commit -m "fix: restore desktop sidecar authentication"
```

### Task 4: Bundle a Native Node Runtime for Every Desktop Target

**Files:**
- Modify: `tests/desktop-sidecar.test.mjs`
- Create: `tests/sidecar-build.test.mjs`
- Modify: `scripts/build-sidecar-runtime.js`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: target-native `process.execPath`, `process.platform`, `process.arch`, npm optional dependencies, and the generated `sidecar-node` resource.
- Produces: `sidecar-node/runtime/node[.exe]`, platform-specific Copilot native files, and a Rust-launched Node process.

- [ ] **Step 1: Replace Darwin-only assertions with failing cross-platform contracts**

Assert that the build source contains dynamic target construction and runtime copy behavior, and does not contain zsh/Homebrew assumptions:

```js
assert.match(sidecarBuildSource, /const nativeTarget = `\$\{process\.platform\}-\$\{process\.arch\}`/);
assert.match(sidecarBuildSource, /process\.execPath/);
assert.doesNotMatch(sidecarBuildSource, /usr\/bin\/env zsh|opt\/homebrew/);
assert.match(tauriSource, /runtime.*node\.exe/si);
assert.match(tauriSource, /\.arg\("server\.js"\)/);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/desktop-sidecar.test.mjs tests/sidecar-build.test.mjs`

Expected: FAIL because the build is fixed to `darwin-arm64` and Rust launches a shell script.

- [ ] **Step 3: Generalize the sidecar build**

In `scripts/build-sidecar-runtime.js`:

```js
const nativeTarget = `${process.platform}-${process.arch}`;
const nodeExecutableName = process.platform === "win32" ? "node.exe" : "node";
const bundledNodePath = path.join(outputRoot, "runtime", nodeExecutableName);
fs.mkdirSync(path.dirname(bundledNodePath), { recursive: true });
fs.copyFileSync(process.execPath, bundledNodePath);
if (process.platform !== "win32") fs.chmodSync(bundledNodePath, 0o755);
```

Filter `prebuilds` by `nativeTarget` and copy `runtime.node` to `node_modules/runtime/runtime.${nativeTarget}.node`. Throw a descriptive error when the source runtime is absent so CI cannot create a silently broken package.

- [ ] **Step 4: Launch bundled Node directly from Rust**

Add a platform helper:

```rust
fn bundled_node_path(sidecar_dir: &std::path::Path) -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    { sidecar_dir.join("runtime").join("node.exe") }
    #[cfg(not(target_os = "windows"))]
    { sidecar_dir.join("runtime").join("node") }
}
```

Use `Command::new(bundled_node_path(&sidecar_dir)).arg("server.js")`. Make `resolve_sidecar_dir()` check both `server.js` and the bundled Node path.

- [ ] **Step 5: Build and execute the generated runtime locally**

Run:

```bash
npm run build:sidecar
src-tauri/sidecar-node/runtime/node --version
node --test tests/desktop-sidecar.test.mjs tests/sidecar-build.test.mjs tests/desktop-server-runtime.test.mjs
cargo check --manifest-path src-tauri/Cargo.toml
```

On Windows the equivalent executable is `src-tauri\sidecar-node\runtime\node.exe`.

Expected: copied Node reports the same major version as `process.version`; all focused tests and Cargo check pass.

- [ ] **Step 6: Commit Task 4**

```bash
git add scripts/build-sidecar-runtime.js src-tauri/src/lib.rs tests/desktop-sidecar.test.mjs tests/sidecar-build.test.mjs
git commit -m "build: bundle cross-platform Node sidecar"
```

### Task 5: Platform-Specific Tauri Bundles and Release Documentation

**Files:**
- Create: `src-tauri/tauri.macos.conf.json`
- Create: `src-tauri/tauri.windows.conf.json`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `tests/release-config.test.mjs`
- Modify: `.gitignore`
- Modify: `release/README.md`
- Modify: `README.md`
- Modify: `README-CN.md`

**Interfaces:**
- Consumes: shared Tauri config and target-specific Tauri automatic config merging.
- Produces: DMG on macOS, NSIS `.exe` on Windows, and documented artifact/platform selection.

- [ ] **Step 1: Add failing platform config assertions**

```js
assert.deepEqual(macConfig.bundle.targets, ["dmg"]);
assert.equal(macConfig.bundle.macOS.signingIdentity, "-");
assert.deepEqual(windowsConfig.bundle.targets, ["nsis"]);
assert.equal(windowsConfig.bundle.windows.nsis.installMode, "currentUser");
assert.deepEqual(tauriConfig.bundle.resources, ["sidecar-node"]);
```

- [ ] **Step 2: Run release config tests and verify RED**

Run: `node --test tests/release-config.test.mjs tests/desktop-tauri-scaffold.test.mjs`

Expected: FAIL because platform override files do not exist and shared config still hard-codes DMG.

- [ ] **Step 3: Add platform override files**

Use:

```json
{
  "bundle": {
    "targets": ["dmg"],
    "macOS": {
      "minimumSystemVersion": "12.0",
      "signingIdentity": "-"
    }
  }
}
```

and:

```json
{
  "bundle": {
    "targets": ["nsis"],
    "windows": {
      "nsis": {
        "installMode": "currentUser"
      }
    }
  }
}
```

Remove shared `bundle.targets` and shared macOS-only fields from `tauri.conf.json`.

- [ ] **Step 4: Update ignore rules and release documentation**

Ignore `release/*.exe`, `release/*.msi`, and `release/SHA256SUMS.txt`. Document exact artifact names, architecture selection, unsigned installer warnings, app data locations, and local build commands in English and Chinese.

- [ ] **Step 5: Verify platform configuration GREEN**

Run: `node --test tests/release-config.test.mjs tests/desktop-tauri-scaffold.test.mjs && npm run check`

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add .gitignore src-tauri/tauri.conf.json src-tauri/tauri.macos.conf.json src-tauri/tauri.windows.conf.json tests/release-config.test.mjs release/README.md README.md README-CN.md
git commit -m "build: configure macOS and Windows bundles"
```

### Task 6: CI and Atomic Desktop Release Workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/desktop-release.yml`
- Create: `tests/github-actions.test.mjs`

**Interfaces:**
- Consumes: npm scripts, Tauri platform config, git tag, and `GITHUB_TOKEN`.
- Produces: push/PR CI and a complete draft-to-public GitHub Release pipeline.

- [ ] **Step 1: Write failing workflow contract tests**

Read both YAML files as text and assert:

```js
assert.match(ci, /pull_request:/);
assert.match(ci, /push:[\s\S]*branches:[\s\S]*main/);
assert.match(ci, /windows-latest/);
assert.match(release, /macos-arm64/);
assert.match(release, /windows-x64/);
assert.match(release, /windows-arm64/);
assert.match(release, /windows-11-arm/);
assert.match(release, /v\$\{package_version\}/);
assert.match(release, /needs: \[prepare, build\]/);
assert.match(release, /SHA256SUMS\.txt/);
assert.match(release, /--draft=false/);
```

Also assert that the publish job downloads artifacts rather than each build job calling `gh release upload` concurrently.

- [ ] **Step 2: Run workflow tests and verify RED**

Run: `node --test tests/github-actions.test.mjs`

Expected: FAIL because neither workflow exists.

- [ ] **Step 3: Implement `.github/workflows/ci.yml`**

Add `pull_request` and `main` push triggers, `permissions: contents: read`, concurrency cancellation, an Ubuntu quality job, and a Windows x64 path job. Both use Node 24 and `npm ci`; Ubuntu also runs frontend build and Cargo check.

- [ ] **Step 4: Implement `.github/workflows/desktop-release.yml`**

Use prepare/build/publish jobs. The build matrix contains exactly:

```yaml
include:
  - name: macos-arm64
    os: macos-14
    target: aarch64-apple-darwin
    bundle: dmg
  - name: windows-x64
    os: windows-latest
    target: x86_64-pc-windows-msvc
    bundle: nsis
  - name: windows-arm64
    os: windows-11-arm
    target: aarch64-pc-windows-msvc
    bundle: nsis
```

Each build runs `npm ci`, `npm test`, `npm run check`, adds the Rust target, and runs `npm run desktop:build -- --target ... --bundles ...`. A shell step locates and renames exactly one installer, then `actions/upload-artifact` uploads it. Publish downloads all artifacts, checks the three exact names, generates SHA-256 hashes, uploads to the draft Release, and only makes it public for a tag push.

- [ ] **Step 5: Verify workflow contracts and local validation**

Run:

```bash
node --test tests/github-actions.test.mjs
npm test
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit Task 6**

```bash
git add .github/workflows/ci.yml .github/workflows/desktop-release.yml tests/github-actions.test.mjs
git commit -m "ci: add cross-platform desktop release pipeline"
```

### Task 7: Push, CI Verification, and v1.0.0 Publication

**Files:**
- Verify only: repository and GitHub Release state.

**Interfaces:**
- Consumes: all prior commits and GitHub Actions.
- Produces: public `v1.0.0` Release with three installers and one checksum file.

- [ ] **Step 1: Run the final local gate**

Run:

```bash
npm test
npm run check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
git status --short
```

Expected: all validation passes and only intentional plan tracking changes remain.

- [ ] **Step 2: Push `main` and verify CI**

```bash
git push origin main
gh run list --workflow ci.yml --limit 1
```

Watch the selected run to completion with exit status. Do not create the release tag while CI is red.

- [ ] **Step 3: Create and push the release tag**

```bash
git tag -a v1.0.0 -m "Agent SMC v1.0.0"
git push origin v1.0.0
```

- [ ] **Step 4: Monitor the Release workflow**

Resolve the run ID for `desktop-release.yml`, watch it to completion, and preserve the real exit status. If one target fails, leave the Release draft and fix the failing target before retrying; do not manually publish an incomplete Release.

- [ ] **Step 5: Verify the published Release**

```bash
gh release view v1.0.0 --json isDraft,isPrerelease,tagName,url,assets
```

Assert `isDraft=false`, `isPrerelease=false`, and exact assets:

```text
Agent-SMC-1.0.0-macos-arm64.dmg
Agent-SMC-1.0.0-windows-x64-setup.exe
Agent-SMC-1.0.0-windows-arm64-setup.exe
SHA256SUMS.txt
```

- [ ] **Step 6: Report final state**

Report the Release URL, workflow result, commit SHA, tag SHA, four asset names, local validation commands, and any unsigned-package warnings. Keep the local branch tracking `origin/main` with a clean working tree.
