# 核心组件契约

本文定义可复用 Web 控制台的核心组件边界。模板中的 HTML/CSS/JS 是静态示例；在 React、Vue 或其他框架中实现时，应保持这些职责和状态接口，而不是复制 DOM 操作。

## 组件拆分原则

- Shell 只负责布局：Header、LeftMenu、MainContent、RightPanel、DialogLayer。
- 全局状态集中管理：theme、language、user/account、settings、collapsed panels、privacyMode。
- 业务状态下沉到业务模块：搜索词、选中项、分页、文档内容、AI 结果不写进 Header 或 Dialog 基础组件。
- 组件通过 props、events 或 store 通信，不直接查询兄弟组件 DOM。
- 视觉层使用语义 token，不在组件里硬编码主题色。

## AppShell

职责：定义全局网格、层级和折叠状态。

状态接口：
- `sidebarCollapsed: boolean`
- `rightPanelCollapsed: boolean`
- `rightPanelVisible: boolean`

DOM/CSS 契约：
- 根容器使用 `.app-shell`。
- 折叠状态使用 `data-sidebar-collapsed`、`data-right-panel-collapsed`。
- 主内容列始终为 `minmax(0, 1fr)`。

不得承担：业务数据读取、用户认证、模型调用、文件扫描。

## TopNav

职责：显示产品标识、当前应用标题、全局动作和用户入口。

输入：
- `title`
- `theme`
- `user` 或 `accountStatus`
- `onThemeToggle`
- `onOpenSettings`
- `onUserMenuToggle`

规则：
- 只放全局动作；业务动作放 LeftMenu 或 MainContent。
- 图标按钮必须有 `aria-label` 和 `title`。
- 用户菜单使用 `aria-haspopup="menu"` 和 `aria-expanded`。
- Header 高度固定为 `--app-header-height`，避免页面跳动。

不得承担：设置表单内容、左侧菜单折叠逻辑、右侧上下文切换逻辑。

## LeftMenu

职责：承载主导航、输入源选择、搜索、过滤、分页和危险操作。

输入：
- `collapsed`
- `items`
- `selectedItemId`
- `filters`
- `onCollapsedChange`
- `onSelectItem`
- `onFilterChange`

规则：
- 折叠后显示窄轨按钮和竖排标签。
- 内容滚动独立于 MainContent。
- 操作按卡片分组，危险操作使用 destructive 样式。
- 列表项和路径必须 `min-width: 0` 并处理溢出。

不得承担：右侧文档渲染、设置弹窗、主内容业务计算。

## RightPanel

职责：显示当前选中对象的上下文信息，例如文档、文件树、AI 洞察、翻译、活动日志。

输入：
- `visible`
- `collapsed`
- `activeTab`
- `contextItem`
- `tabs`
- `onCollapsedChange`
- `onTabChange`

规则：
- 未选中对象时可以不渲染或显示空态。
- 折叠后保留窄轨按钮，包含图标和竖排标签。
- tabs 只改变右侧上下文，不改变左侧选中项。
- 长文档区域使用独立滚动容器。

不得承担：全局设置、认证、左侧筛选、主内容布局计算。

## Dialog

职责：短流程浮层，例如设置、确认、重命名、认证提示。

结构：
- `DialogHeader`: 标题和说明。
- `DialogBody`: 表单或确认信息。
- `DialogFooter`: 取消、确认和保存按钮。

规则：
- Dialog 内容层级高于 Header 和侧栏。
- Dialog 内嵌 Select、Combobox 或 Popover 时，需要外部点击保护，避免 Portal 内容被当作 Dialog 外点击。
- Footer 主按钮文案描述实际动作。
- 长流程不要塞进 Dialog，应进入独立页面或右侧面板。

## UserSettings

职责：承载全局用户设置和账号状态。

字段建议：
- displayLanguage
- theme
- defaultModel
- accountStatus
- privacyMode
- cachePreference

规则：
- 从 TopNav 打开，以 Dialog 或专用设置面板呈现。
- 表单字段使用受控状态，保存时统一写入 localStorage 或后端配置。
- 远端选项列表应有页面会话缓存，避免反复打开设置重复请求。
- 账号状态只展示必要信息，不把认证流程塞入基础设置组件。

## Card / Button / Badge

职责：提供稳定的基础视觉构件。

规则：
- Card 暴露 header、title、description、action、content、footer 插槽。
- Button 使用 variant 和 size 控制样式，不新增一次性按钮 class。
- 图标通过 `data-icon="inline-start"` 或 `data-icon="inline-end"` 标记位置。
- Badge 只表达短状态，不承载长句说明。

## 状态与持久化建议

| 状态 | 建议 owner | 持久化 |
|---|---|---|
| theme | AppShell / Settings store | localStorage |
| language | Settings store | localStorage |
| sidebarCollapsed | AppShell | localStorage |
| rightPanelCollapsed | AppShell | localStorage |
| privacyMode | Settings store | localStorage |
| selectedItem | 业务页面 | URL 或业务 store |
| activeRightPanelTab | RightPanel | localStorage 或组件状态 |
| remote options cache | 数据服务层 | 页面会话内存 |

## 可访问性清单

- 所有图标按钮都有 `aria-label`。
- 折叠按钮有 `aria-expanded`。
- 用户菜单有 `role="menu"` 和 `role="menuitem"`。
- Tabs 有 `role="tablist"`、`role="tab"`、`aria-selected`。
- Dialog 有标题和说明，关闭按钮有屏幕阅读器文本。
- 颜色状态同时有文本、符号或图标提示。