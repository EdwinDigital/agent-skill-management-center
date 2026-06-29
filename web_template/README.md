# Workbench Web Template

Workbench Web Template 是一个可复制的控制台工作台模板，用于构建本地优先、数据密集、带文档阅读和图谱分析能力的 Web 应用。模板只包含静态 HTML/CSS/JS，不依赖主项目运行时代码。

## 适用范围

适合：

- 本地开发者工具
- Agent / Skill 控制台
- 文件、目录、任务扫描工具
- AI 评估、证据阅读、逻辑图分析工作台

不适合：

- 营销页或品牌官网
- 内容站或博客系统
- 移动优先社交产品
- 需要强品牌视觉表达的产品主页

## 模板结构

```text
web_template/
  README.md                  # 模板入口和使用说明
  WEB_DESIGN_STANDARD.md     # 视觉、布局、交互标准
  CORE_COMPONENTS.md         # 组件边界和状态归属
  templates/
    workbench-shell.html     # 完整静态页面结构
  assets/
    design-tokens.css        # 语义 token、reset、全局基础样式
    workbench.css            # 工作台布局和组件样式
    workbench.js             # 工作台静态交互
```

## 快速复用

1. 复制 `templates/workbench-shell.html` 到新项目入口。
2. 复制 `assets/design-tokens.css`、`assets/workbench.css`、`assets/workbench.js`。
3. 保留三栏工作台结构：`SidebarConsole`、`DetailSurface`、`DocPanel`。
4. 替换示例内容：目录来源、列表项、概览卡、图谱节点、右侧文档和文件树。
5. 迁移到 React/Vue 时，沿用组件职责、状态归属和 class 语义，不复制 DOM 操作。

## 文件职责

| 文件 | 职责 |
|---|---|
| `templates/workbench-shell.html` | 页面结构、示例内容、可访问性标记 |
| `assets/design-tokens.css` | 颜色 token、基础 reset、字体、辅助类 |
| `assets/workbench.css` | 三栏布局、组件样式、响应式规则 |
| `assets/workbench.js` | 主题、折叠、Dialog、Tabs、列表选中、图谱拖拽和缩放 |
| `WEB_DESIGN_STANDARD.md` | 设计语言、布局规则、视觉约束 |
| `CORE_COMPONENTS.md` | 组件职责、状态 owner、边界约定 |

## 复用原则

- 先保留信息架构，再替换业务内容。
- Shell 只负责布局和全局状态，不发起业务请求。
- AI 操作只放在当前对象上下文，不进入全局导航。
- 长路径、长标题、Markdown、文件树和图谱节点必须防溢出。
- 可以删减模块，但不要把左侧导航、主分析区、右侧文档区合并成一个大组件。
