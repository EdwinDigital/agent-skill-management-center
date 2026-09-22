# Troubleshooting

[中文](troubleshooting-CN.md) · [Docs index](README.md) · [Project home](../README.md)

## No Skills Appear

- Run **Global scan** to check known default directories.
- Confirm the selected root exists and contains directories with `SKILL.md`.
- Add a custom root manually or set `SKILL_ROOT` before first startup.
- On Windows, use native drive paths such as `C:\Users\name\.agents\skills` or valid UNC paths.

## AI Evaluation or Model Listing Requires Authentication

Desktop users should complete GitHub Device OAuth in the application. Web development can use:

```bash
gh auth login --web
gh auth refresh --scopes copilot
```

Then check `/api/auth/github/status?check=1` and `/api/models?live=1`. A stored token without the `copilot` scope is authenticated but not AI-ready.

## Model List Is Slow

The first Settings open in a browser page session performs a live Copilot SDK request. Reopening Settings uses the in-page cache until the browser page is refreshed or closed.

## AI Evaluation Fails or Times Out

1. Check `/api/error-logs?limit=10`.
2. Verify auth status and live model listing.
3. Confirm the selected model remains available.
4. Keep full Skill context; split model work rather than trimming content.
5. Retry with a new request ID after the previous operation has completed.

## Database Reset

For web development:

```bash
npm stop
rm data/analysis.sqlite
npm start
```

The schema and defaults are recreated at startup. Desktop databases live in the platform application data directory; back up that file before deleting it.

## Port Already in Use

```bash
npm stop
```

For a custom port, use the same value when starting and stopping:

```bash
PORT=5173 npm start
PORT=5173 npm stop
```

## Desktop App Does Not Start

- Verify the installer matches your CPU architecture.
- Verify its SHA-256 against the Release checksum file.
- macOS: copy the app to Applications before running it; do not run from the mounted DMG.
- Windows: approve SmartScreen only after confirming source and checksum.
- Check that antivirus software did not quarantine embedded Node or native runtime files.

## Native Folder Picker

The current native picker uses macOS `osascript`. Windows users can discover default roots through Global scan and add custom paths manually.

## Reporting Problems

Use the [bug report form](https://github.com/EdwinDigital/agent-skill-management-center/issues/new?template=bug_report.yml) for reproducible defects. Report security vulnerabilities through the private process in [SECURITY.md](../SECURITY.md), not a public issue.
