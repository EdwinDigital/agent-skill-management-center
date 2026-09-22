# Contributing to Agent SMC

Contributions are welcome when they keep Agent SMC local-first, focused, and safe for users who inspect untrusted Skill repositories.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating. Security vulnerabilities belong in the private process described in [SECURITY.md](SECURITY.md), not a public issue.

## Before You Start

1. Search existing [Issues](https://github.com/EdwinDigital/agent-skill-management-center/issues).
2. Use the bug or feature issue form for non-trivial work.
3. Keep proposals scoped to one behavior or documentation area.
4. Do not include local databases, Skill contents, tokens, logs, build output, or installers.

Small typo and documentation corrections can go directly to a pull request.

## Development Setup

```bash
git clone https://github.com/EdwinDigital/agent-skill-management-center.git
cd agent-skill-management-center
npm install
npm start
```

See the [development guide](docs/development.md) for environment requirements, desktop builds, architecture rules, and all commands.

## Change Guidelines

- Preserve current APIs and SQLite behavior unless the issue explicitly proposes a migration.
- Keep the web database default at `data/analysis.sqlite`.
- Keep AI evaluation accurate; split model calls instead of dropping Skill context.
- Complexity and ROI remain unrated until a model evaluation returns scores.
- Use existing React, shadcn/Radix, lucide, Sonner, Express, and native Node patterns.
- Do not introduce dependencies or broad abstractions without a demonstrated need.
- Add focused tests for behavior changes and reproduce bugs before fixing them.
- Update English and Chinese documentation when user-facing behavior changes.

## Validation

Run before opening a pull request:

```bash
npm test
npm run check
npm run build
git diff --check
```

For Rust/Tauri changes, also run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

For browser behavior, verify the running app. For AI workflow changes, test a real Skill through generation and cache reads without committing local data.

## Pull Requests

- Use a clear title and describe the user-visible behavior.
- Link the relevant issue when one exists.
- Explain architecture or compatibility decisions.
- Include screenshots for UI changes.
- List exact validation commands and results.
- Keep generated files and unrelated formatting out of the diff.
- Expect maintainers to request smaller scope when a change mixes independent concerns.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE).
