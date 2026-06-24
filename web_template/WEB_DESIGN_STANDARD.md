# Web 应用设计标准

本目录沉淀自 `main` 分支 AI Agent Skills Console 的页面结构和设计语言，用于后续开发本地优先、数据密集、带 AI 辅助能力的控制台类 Web 应用。模板资源完全独立，不被当前应用运行时引用；复制到新项目后再按业务替换内容。

## 适用范围

- 适合：本地开发者工具、Agent/Skill 控制台、文件/目录扫描工具、AI 评估与文档阅读工作台。
- 不适合：营销 Landing Page、品牌官网、内容站、移动优先社交产品。
- 当前模板只保留 `main` 分支已有的功能骨架：Header、左侧 Skill 管理、主内容分析区、右侧 Skill 定义面板、设置 Dialog。
- 不包含当前 `desktop` 分支的实验性桌面侧栏命名或布局，也不包含截图复刻、隐私模式、通用仪表盘指标或额外产品功能。

## 设计原则

- 控制台优先：首屏直接进入可操作工作台，不做营销式 Hero 或介绍页。
- 本地优先：默认数据来自本机目录、文件、缓存或本地服务状态。
- 中文友好：界面默认可用中文，英文可选；按钮、路径、Skill 名称必须防止溢出。
- 高信息密度：目录选择、搜索、分页、图谱、文档阅读和设置需要适合长期扫描与反复操作。
- AI 辅助按需触发：规则分析默认可见，AI 评估、翻译和模型洞察只在用户触发后展示。
- 主题一致：Light / Dark 共用语义变量，组件里不散落硬编码颜色。
- 组件边界清晰：Header 只管全局动作，左侧菜单只管输入/选择，主内容展示分析，右侧面板展示上下文。

## 页面骨架

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: App mark · title                         theme/user   │
├────────────────────┬─────────────────────────────┬───────────┤
│ Left Skill Menu    │ Main Analysis Workspace      │ Right Rail │
│ - directory root   │ - empty guide / overview     │ Skill.md   │
│ - scan/add/delete  │ - score cards                │ file tree  │
│ - search           │ - logic graph                │ translation│
│ - paged skill list │ - tools/methods/prompts      │            │
└────────────────────┴─────────────────────────────┴───────────┘
```

## 颜色语义

| Token | 用途 | Light | Dark |
|---|---|---|---|
| `--bg` | 页面背景 | `#eef3fa` | `#0e1320` |
| `--panel` | 卡片/弹窗背景 | `#ffffff` | `#171e2b` |
| `--panel-strong` | 控件/弱强调背景 | `#f7faff` | `#202a3a` |
| `--line` | 边框/分割线 | `#e3eaf5` | `#28313f` |
| `--text` | 主文字 | `#172033` | `#eef2f8` |
| `--muted` | 次级文字 | `#667085` | `#9aa6b6` |
| `--accent` | 主操作/选中态 | `#0078d4` | `#0078d4` |
| `--document` | 文档/翻译强调 | `#45a0de` | `#45a0de` |
| `--analysis` | AI/图谱强调 | `#c03bc4` | `#c03bc4` |
| `--danger` | 删除/错误 | `#ff174f` | `#ff174f` |
| `--success` | 成功/可用 | `#16a34a` | `#00ffd5` |

颜色必须走语义变量：主操作使用 `--accent`，文档阅读使用 `--document`，模型洞察或逻辑图使用 `--analysis`，删除或错误使用 `--danger`。

## 布局规范

### Header

- 高度固定为 `54px`。
- 左侧：30px 应用标识 + 单行标题。
- 右侧：主题切换、设置、账户入口。
- Header 只放全局动作；扫描、选择目录、AI 评估等业务动作不放 Header。

### 左侧 Skill 管理

- 默认宽度 `clamp(16rem, 44vw, 21.25rem)`，折叠宽度 `2.5rem`。
- 固定在 Header 下方，高度 `calc(100vh - 54px)`，自身滚动。
- 内容采用 main 分支卡片式组织：标题行、目录来源卡片、Skill 列表区、分页。
- 目录来源卡片包含：根目录 Select、添加目录、全局扫描、删除目录。
- Skill 列表区包含：列表标题、搜索输入、分页列表、上一页/下一页。
- 折叠后保留窄轨按钮和竖排标签，不重置已加载数据。

### 主内容区

- 主列使用 `minmax(0, 1fr)`，所有网格子项设置 `min-width: 0`。
- 未选中 Skill 时展示空态引导：选择目录、选择 Skill、查看图谱。
- 选中 Skill 后展示：概览卡、复杂度/ROI、模型洞察、触发 Prompt、逻辑图、节点详情、工具栈、运行方法。
- AI 评估按钮放在当前 Skill 概览卡里，状态文案跟随按钮旁边展示。

### 右侧 Skill 定义面板

- 仅在选中 Skill 后显示。
- 默认可折叠为 `2.5rem` 窄轨。
- 展开宽度为 `min(42rem, calc(100vw - 2rem))`。
- 面板 tabs 只用于 `SKILL.md` 与文件目录，不改变左侧选中项。
- 长文档使用独立滚动区域；Markdown 标题、代码块、表格都必须防溢出。

### Dialog

- 用于设置、目录确认、认证提示等短流程。
- 固定结构：Header / Body / Footer。
- Dialog 内 Select 使用 Portal 时，需要外部点击保护，避免误关闭。
- Footer 主按钮必须描述动作，例如“保存”“保存目录”，不要使用模糊的“提交”。

## 字体与文字

- 字体族：`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`。
- 不使用负 letter-spacing；默认 `letter-spacing: 0`。
- 卡片标题不使用 Hero 级字号。
- 路径、文件名、Skill 名称、Markdown 和图谱节点必须处理溢出。
- 中文按钮优先短动词：添加目录、全局扫描、AI 评估、翻译、保存。

## 组件规范

### Card

- Card 分为 Header / Title / Description / Action / Content / Footer。
- 概览卡可使用渐变强调，普通信息卡保持白底或语义背景。
- 不要把页面 section 包成多层卡片；卡片只承载明确的信息单元。

### Button

- 支持 default、outline、ghost、destructive。
- 图标按钮必须有 `aria-label` 和 `title`。
- 图标在文字按钮中使用 inline-start / inline-end 的等价语义。
- 控件高度保持 24/28/32/36px 阶梯，避免营销式大按钮。

### Select/Input

- Select 只用于有限选项，例如根目录、语言、模型。
- Input 用于搜索或命名，必须支持长文本和清空动作。
- Dialog 中 Select 的弹层需要考虑 Portal 行为。

### Tabs

- 只用于右侧上下文面板的局部切换。
- 使用 `role="tablist"`、`role="tab"`、`aria-selected`。
- 激活态使用底部 2px 色条，不使用大面积背景。

### Markdown / File Tree

- Markdown 标题使用 3px 左边色条。
- 代码块允许换行并保持 monospace。
- 文件树每行三列：展开占位、图标、名称；名称必须 `min-width: 0`。

## 可访问性

- 图标按钮必须有 `aria-label` 和 `title`。
- 折叠按钮维护 `aria-expanded`。
- 用户菜单使用 `aria-haspopup="menu"` 和 `aria-expanded`。
- 列表使用 `role="listbox"` / `role="option"`，选中项使用 `aria-selected`。
- Dialog 有标题和说明。
- 状态不能只靠颜色表达，必须有文字、符号或图标辅助。

## 文件说明

- `CORE_COMPONENTS.md`：核心组件职责和状态接口。
- `templates/app-shell.html`：main 分支功能骨架的静态 HTML 示例。
- `assets/design-tokens.css`：主题变量、reset、应用骨架布局。
- `assets/components.css`：Header、左侧菜单、右侧面板、Dialog、卡片、文档和列表样式。
- `assets/template.js`：主题切换、左右面板折叠、设置 Dialog 示例。

## 使用方式

1. 复制 `templates/app-shell.html` 到新项目入口。
2. 引入 `assets/design-tokens.css` 和 `assets/components.css`。
3. 按业务替换左侧目录来源、列表项和主内容卡片。
4. 保留 CSS 变量命名、组件 class 和 `data-*` 状态属性。
5. 如果使用 React + shadcn/Radix，把本模板视为组件契约，再用项目内组件实现视觉层。