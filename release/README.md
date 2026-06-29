# Tauri macOS DMG Release Folder

This folder is reserved for publishing macOS desktop builds of Agent SMC.

Build a local DMG with:

```bash
npm run desktop:build:mac
```

Tauri writes the generated DMG to:

```text
src-tauri/target/release/bundle/dmg/
```

Copy signed, notarized, and release-ready DMG artifacts into this `release/` folder when preparing a manual distribution package. Do not commit generated `.dmg` files unless the release process explicitly requires it.

Current desktop scope:

- React/Vite is used as the Tauri WebView UI.
- The first scaffold keeps the existing web build path: `public/dist`.
- The Node/Express API sidecar is bundled as a Tauri resource under `sidecar-node` and started by the desktop shell on a random local port.
- Generated DMG artifacts are copied here for manual distribution; `release/*.dmg` remains ignored by Git.
- macOS signing, notarization, stapling, and updater signing remain release pipeline tasks.