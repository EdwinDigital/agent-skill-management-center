# 核心组件契约

本文定义模板项目的组件边界、状态 owner 和职责限制。无论使用静态 HTML、React、Vue 还是其他框架，都应保持这些边界。

## 命名约定

- `AppShell`：整体三栏布局。
- `SidebarConsole`：左侧输入源和列表。
- `DetailSurface`：主工作面。
- `GraphCanvas`：逻辑图。
- `DocPanel`：右侧文档上下文。
- `DialogLayer`：短流程浮层。

## AppShell

职责：定义三栏网格、折叠状态和整体层级。

状态：
- `sidebarCollapsed`
- `docCollapsed`

规则：
- 根容器使用 `.workbench-shell`。
- 折叠状态使用 `data-sidebar-collapsed` 和 `data-doc-collapsed`。
- 主列始终为 `minmax(0, 1fr)`。
- Shell 不读取业务数据，不发起 API 请求。
- Shell 只把状态传给子组件，不持有业务对象详情。

## SidebarConsole

职责：管理输入源、搜索、列表、分页和全局轻量入口。

状态：
- `rootId`
- `searchValue`
- `selectedItemId`
- `page`
- `theme`
- `accountStatus`

规则：
- Brand 区可返回总览。
- 主操作按钮只保留一个最高频动作。
- 搜索框提供清空按钮。
- 列表使用 `role="listbox"`、`role="option"` 和 `aria-selected`。
- 折叠时只显示 rail，不清空状态。
- 不渲染右侧文档和主区分析内容。
- 不发起当前对象的分析请求。

## DetailSurface

职责：展示当前对象的概览、状态、AI 操作、洞察、Prompt、图谱和工具信息。

状态：
- `selectedItem`
- `evaluationStatus`
- `analysis`
- `selectedGraphNode`

规则：
- 当前对象路径单独成行，复制按钮固定在右侧。
- AI 操作只放在当前对象概览区域。
- 分数没有模型结果时显示未评估。
- 洞察、工具和长文本使用局部滚动，不撑高整页。
- 不管理目录选择、搜索或文档 tab。
- 不直接修改 `DocPanel` 内部 tab 状态。

## GraphCanvas

职责：渲染逻辑图，并支持选择、拖拽和缩放。

状态：
- `selectedNodeId`
- `zoom`
- `isDragging`

规则：
- 图谱容器独立滚动。
- 节点固定尺寸，文本防溢出。
- 点击节点只改变选中节点。
- 拖拽画布时不触发节点点击。
- 缩放控件固定在图谱内部右下角。
- 不生成图谱数据。
- 不读取文档内容，不发起 AI 请求。

## DocPanel

职责：显示当前对象的文档、翻译内容和文件树。

状态：
- `activeTab`
- `docMode`
- `expandedPaths`

规则：
- 没有选中对象时可以折叠或不渲染。
- Tabs 只切换文档面板内部上下文。
- 翻译是视图模式，不覆盖原文。
- 文档和文件树都有独立滚动。
- 不改变左侧列表选择。
- 不改变 `DetailSurface` 的图谱选中节点。

## DialogLayer

职责：承载设置、确认、认证提示等短流程。

规则：
- Dialog 有标题和明确的确认按钮。
- 表单字段使用受控状态。
- 长流程不要放进 Dialog。
- 浮层层级高于左右面板。
- Dialog 关闭不应重置页面主状态，除非用户明确确认操作。

## 基础组件

- Card：信息单元，避免嵌套。
- Button：只通过 variant 和 size 表达语义。
- Badge：短状态、数量、标签。
- Input / Select：用于搜索、命名和有限选项。
- Tabs：只用于局部上下文切换。
- ScrollPanel：用于文档、洞察、工具列表和图谱。

基础组件不直接读取业务数据，只通过 props、属性或插槽接收内容。

## 状态归属

| 状态 | Owner |
|---|---|
| theme | AppShell 或 Settings |
| sidebarCollapsed | AppShell |
| docCollapsed | AppShell |
| rootId | SidebarConsole |
| searchValue | SidebarConsole |
| selectedItem | 业务页面 / DetailSurface |
| selectedGraphNode | DetailSurface / GraphCanvas |
| graphZoom | GraphCanvas |
| doc activeTab | DocPanel |
| fileTree expandedPaths | DocPanel |
| remote cache | 数据服务层 |
