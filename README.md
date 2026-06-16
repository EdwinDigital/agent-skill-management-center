# Skill Logic Visualizer

A local web app for reading Skill directories, listing available skills, and visualizing each skill's inferred execution logic, trigger phrases, supporting files, and tool usage.

## Features

- Default `~/.agents/skills` loading plus custom server paths and browser directory picking.
- Sidebar directory switcher with custom directory additions.
- Skill list pagination at 15 items per page.
- Settings panel for display language and default GitHub Copilot model.
- English and Chinese UI/analysis text.
- GitHub login status check through the GitHub CLI.
- GitHub Copilot SDK-powered model insight for selected skills.

## Run

```bash
npm install
npm start
```

Open `http://localhost:4173`.

The default skill root is `~/.agents/skills`. Override it with:

```bash
SKILL_ROOT=/path/to/skills npm start
```

You can also type a skill root path into the sidebar or use **Choose local skills directory** in browsers that support the File System Access API.

## GitHub and Copilot setup

The app uses the GitHub CLI for local authentication status and the GitHub Copilot SDK for model-driven skill insight. If the sidebar shows that Copilot scope is needed, run:

```bash
gh auth refresh --scopes copilot
```
