# Tauri Desktop Release Folder

This folder is reserved for local release-ready Agent SMC desktop artifacts. GitHub Actions publishes installers directly to the matching GitHub Release, so generated files in this directory remain ignored.

Local build commands:

```bash
npm run desktop:build:mac       # macOS ARM64 DMG
npm run desktop:build:windows   # Windows NSIS installer
```

Tauri writes bundles under the target-specific directory:

```text
src-tauri/target/<target-triple>/release/bundle/dmg/
src-tauri/target/<target-triple>/release/bundle/nsis/
```

The `v1.0.0` GitHub Release uses these names:

```text
Agent-SMC-1.0.0-macos-arm64.dmg
Agent-SMC-1.0.0-windows-x64-setup.exe
Agent-SMC-1.0.0-windows-arm64-setup.exe
SHA256SUMS.txt
```

Architecture selection:

- `macos-arm64`: Apple silicon Macs running macOS 12 or later.
- `windows-x64`: Intel/AMD Windows PCs.
- `windows-arm64`: Snapdragon and other Windows on ARM PCs.

The desktop bundle includes Node.js and the Node/Express sidecar; users do not need to install Node. The macOS build uses ad-hoc signing and is not notarized. Windows installers are unsigned and may trigger SmartScreen. Application data is stored in the Tauri app data directory, typically `~/Library/Application Support/com.edwindigital.agent-smc/` on macOS and `%APPDATA%\com.edwindigital.agent-smc\` on Windows.