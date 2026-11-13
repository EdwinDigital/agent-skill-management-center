# Desktop Release Guide

[中文](desktop-release-CN.md) · [Docs index](README.md) · [Project home](../README.md)

## Published Packages

The current stable release is [v1.0.1](https://github.com/EdwinDigital/agent-skill-management-center/releases/tag/v1.0.1).

| Package | Target |
| --- | --- |
| `Agent-SMC-1.0.1-macos-arm64.dmg` | Apple silicon, macOS 12+. |
| `Agent-SMC-1.0.1-windows-x64-setup.exe` | Intel/AMD Windows. |
| `Agent-SMC-1.0.1-windows-arm64-setup.exe` | Snapdragon and Windows on ARM. |
| `SHA256SUMS.txt` | SHA-256 hashes for the three installers. |

Desktop packages include official Node.js 24.11.1 and target-native Copilot runtime files. End users do not install Node.

## Signing Status

- macOS uses ad-hoc signing and is not notarized. Gatekeeper may require approval under **System Settings → Privacy & Security**.
- Windows installers are unsigned. Microsoft Defender SmartScreen may require **More info → Run anyway** after the source is verified.
- Always compare the installer against `SHA256SUMS.txt` before bypassing an operating-system warning.

## Application Data

- macOS: Tauri's application data directory, typically `~/Library/Application Support/com.edwindigital.agent-smc/`.
- Windows: Tauri's application data directory, typically `%APPDATA%\com.edwindigital.agent-smc\`.
- Web development: project-relative `data/analysis.sqlite` unless `SKILL_ANALYSIS_DB` overrides it.

## Automated Release Flow

`.github/workflows/desktop-release.yml` runs when a `v*` tag is pushed:

1. Validate package, Cargo, and Tauri versions against the tag.
2. Create or strictly validate a draft Release targeting the tag commit.
3. Build macOS ARM64, Windows x64, and Windows ARM64 on native runners.
4. Run tests and source checks before each installer build.
5. Mount the macOS DMG and verify the bundled app signature.
6. Upload installers as temporary Actions artifacts.
7. Verify the exact three-file set, generate `SHA256SUMS.txt`, and revalidate the draft target.
8. Remove stale draft assets, upload the complete set, then publish.

Any build failure leaves the Release as a draft. Build jobs never upload directly to a public Release.

### Rebuild An Unpublished Tag

If the hosted runner configuration changes after tagging, dispatch the current workflow from `main` while keeping the original tag and source commit unchanged:

```bash
gh workflow run desktop-release.yml --ref main -f release_tag=v1.0.1 -f publish=true
```

All three installers are rebuilt from the same immutable tag commit. Publishing still requires every build, signature check, asset check, and draft-target validation to pass. Omit `publish=true` to keep the result as a draft. Existing public releases cannot be overwritten.

## Build Windows ARM64 Without A Release

To build the selected branch without creating a tag or modifying any Release:

```bash
gh workflow run windows-arm64-build.yml --ref main
```

The read-only workflow runs tests and source checks, then builds an NSIS installer on the native Windows ARM64 runner. It verifies the architecture of the desktop executable, bundled Node, and Copilot runtime. Download the installer, `SHA256SUMS.txt`, and `build-info.json` from the run's Actions artifact, retained for seven days.

Installer names include the source commit, for example `Agent-SMC-1.0.1-windows-arm64-abcdef0-setup.exe`. These are test builds of the current source, not a new stable release; the application version remains unchanged.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:

- macOS ARM64 on `macos-15`: Node tests, source checks, frontend build, and Rust/Tauri check. The app's configured minimum macOS version remains 12.0.
- Windows x64: Node tests, including Windows path and sidecar runtime behavior, plus source checks.

CI does not build or test a Linux desktop target.

## Local Builds

```bash
npm run desktop:build:mac
npm run desktop:build:windows
```

Tauri writes bundles under `src-tauri/target/<target-triple>/release/bundle/`. See [release/README.md](../release/README.md) for local artifact details.
