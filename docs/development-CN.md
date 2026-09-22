# 开发指南

[English](development.md) · [文档索引](README.md) · [项目首页](../README-CN.md)

## 环境要求

- CI 和桌面内置 runtime 使用 Node.js 24；本地 Web 开发至少需要支持 `node:sqlite` 的 Node 22+。
- npm。
- Tauri 检查和桌面构建需要 Rust stable。
- 对应平台需安装 [Tauri v2 文档](https://v2.tauri.app/start/prerequisites/)列出的构建前置条件。
- Web 模式认证检查可选安装 GitHub CLI。

## 安装与运行

```bash
npm install
npm start
```

`npm start` 构建前端，并在 `http://localhost:4173` 提供应用。

前端热更新开发时，分别启动 API 和 Vite：

```bash
node server.js
npm run dev
```

Vite 监听 `127.0.0.1:5173`，并将 `/api` 代理到 `4173`。

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm test` | 运行 Node 契约与运行时测试。 |
| `npm run check` | 检查 `server.js` 语法并执行 TypeScript 无输出检查。 |
| `npm run build` | 将 Vite 资源构建到 `public/dist`。 |
| `npm start` | 构建并启动 Express 服务。 |
| `npm stop` | 停止监听 `PORT` 的进程。 |
| `npm run dev` | 启动 Vite 开发服务器。 |
| `npm run build:sidecar` | 组装目标平台原生 sidecar 资源。 |
| `npm run desktop:dev` | 运行 Tauri 开发模式。 |
| `npm run desktop:build` | 构建当前目标配置的 Tauri bundle。 |
| `npm run desktop:build:mac` | 在 macOS 构建 DMG。 |
| `npm run desktop:build:windows` | 在 Windows 构建 NSIS 安装包。 |

## 质量门禁

交付修改前执行：

```bash
npm test
npm run check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
git diff --check
```

浏览器行为修改还应在运行中的应用里验证。AI 评估修改至少使用一个真实 Skill 验证 `/api/logic-map/generate` 和 `/api/logic-map/cache`。

## 仓库约定

- React 主状态和流程保留在 `src/App.tsx`，仅在聚焦抽象明显降低复杂度时拆分。
- 使用现有 shadcn/Radix 封装和 lucide 图标。
- 运行数据保存在 `data/` 或 `SKILL_ANALYSIS_DB`；不得提交数据库、日志、`public/dist`、`node_modules`、`src-tauri/target`、sidecar 产物或安装包。
- 保持 Web 模式项目相对数据库默认值。
- 注释保持克制，只解释非显而易见的逻辑。
- 不要为规避模型超时压缩掉 Skill 内容；应拆分模型调用。

Issue 和 Pull Request 要求见 [CONTRIBUTING.md](../CONTRIBUTING.md)。
