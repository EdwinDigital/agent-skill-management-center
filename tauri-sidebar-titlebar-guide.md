# Tauri v2 · 侧边栏内嵌红绿灯 + 可折叠导航 开发指引

> **目标效果**：macOS 窗口无标题栏，红绿灯（关闭/最小化/最大化）浮在左侧边栏顶部；侧边栏可折叠；跨平台可用。
> **参考实现**：GitHub Copilot App（`com.github.githubapp`）
> **版本基准**：Tauri 2.11.x · 文档核对日期 2026-08-18

---

## 0. 结论速览

| 项目 | 做法 | 依据 |
|---|---|---|
| 红绿灯位置 | **配置文件** `trafficLightPosition` | `WindowConfig.traffic_light_position: Option<LogicalPosition>` |
| 标题栏 | `titleBarStyle: "Overlay"` + `hiddenTitle: true` + **`decorations: true`** | `WebviewWindowBuilder::traffic_light_position` 文档注明「Requires titleBarStyle: Overlay and decorations: true」 |
| 拖拽区 | **`data-tauri-drag-region`**（❌ 不是 `-webkit-app-region`） | 官方 Window Customization 教程 |
| 权限 | capabilities 必须加 `core:window:allow-start-dragging` | 官方教程「Add window permissions in capability file」 |
| 折叠状态 | 前端状态 + 持久化；窗口几何交给 `tauri-plugin-window-state` | — |

> ⚠️ **两个常见错误**（我在初稿中也踩过，已按官方源码修正）：
> 1. `-webkit-app-region: drag` 是 **Chromium/Electron 专有**，macOS 的 WKWebView **不支持**。Tauri 必须用 `data-tauri-drag-region`。
> 2. `WebviewWindow` **没有** 公开的 `set_traffic_light_position()` 方法。该方法只存在于 `tauri-runtime` 的 `Dispatch` trait 内部。**正确做法是配置或 builder**。
>
> 佐证：GitHub Copilot App 二进制中只有 `trafficLightPosition` 字符串，**没有** `set_traffic_light_position` —— 说明官方产品也是走配置路线。

---

## 1. 窗口配置

### 1.1 `src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "MyApp",
  "identifier": "com.example.myapp",
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "MyApp",
        "width": 1280,
        "height": 800,
        "minWidth": 720,
        "minHeight": 480,

        "decorations": true,
        "titleBarStyle": "Overlay",
        "hiddenTitle": true,
        "trafficLightPosition": { "x": 16, "y": 20 },

        "backgroundColor": "#F5F5F7"
      }
    ]
  }
}
```

**字段逐条说明**

| 字段 | 值 | 作用 / 注意 |
|---|---|---|
| `decorations` | `true` | **必须为 true**。设为 `false` 会连红绿灯一起删掉，就得全自绘 |
| `titleBarStyle` | `"Overlay"` | 枚举仅三值：`Visible` / `Transparent` / `Overlay`。`Overlay` = 内容延伸到标题栏区域、红绿灯浮于其上（AppKit 的 `NSWindowStyleMaskFullSizeContentView` + `titlebarAppearsTransparent`） |
| `hiddenTitle` | `true` | 隐藏标题文字 |
| `trafficLightPosition` | `{x, y}` | **仅 macOS**，Linux/Windows/iOS/Android 忽略。逻辑像素，相对窗口左上角 |
| `backgroundColor` | 色值 | 避免窗口出现前的白闪 |

### 1.2 平台分文件（推荐）

Tauri 支持 `tauri.macos.conf.json` / `tauri.windows.conf.json` / `tauri.linux.conf.json`，会与主配置合并。macOS 专属项放这里最干净：

```jsonc
// src-tauri/tauri.macos.conf.json
{
  "app": {
    "windows": [{
      "titleBarStyle": "Overlay",
      "hiddenTitle": true,
      "trafficLightPosition": { "x": 16, "y": 20 }
    }]
  }
}
```

```jsonc
// src-tauri/tauri.windows.conf.json —— Windows 无红绿灯，全自绘
{
  "app": {
    "windows": [{ "decorations": false }]
  }
}
```

### 1.3 需要动态创建窗口时（builder 写法）

```rust
use tauri::{TitleBarStyle, WebviewUrl, WebviewWindowBuilder, LogicalPosition};

let mut b = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
    .title("MyApp")
    .inner_size(1280.0, 800.0)
    .decorations(true);

#[cfg(target_os = "macos")]
{
    b = b
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(LogicalPosition::new(16.0, 20.0));
}

let window = b.build()?;
```

> `title_bar_style` / `hidden_title` / `traffic_light_position` 三个 builder 方法都带 `#[cfg(target_os = "macos")]`，**必须**放在条件编译块内，否则 Windows/Linux 编译失败。

---

## 2. 权限（Capabilities）—— 最容易漏的一步

Tauri v2 默认**阻止所有命令**。不配权限，拖拽窗口和按钮全部静默失效。

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "main-capability",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-minimize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-close"
  ]
}
```

| 权限 | 何时需要 |
|---|---|
| `core:window:allow-start-dragging` | **必需** —— `data-tauri-drag-region` 和 `startDragging()` 都依赖它 |
| `core:window:allow-minimize` / `allow-toggle-maximize` / `allow-close` | 仅 Windows/Linux 自绘按钮时需要 |

---

## 3. 前端布局

### 3.1 CSS 变量与安全区

```css
:root {
  /* 顶部安全区高度：给红绿灯让位 */
  --titlebar-h: 52px;
  --sidebar-w: 260px;
  --sidebar-bg: #f5f5f7;
}

/* Windows/Linux 无红绿灯，标题栏更矮 */
:root[data-os="windows"],
:root[data-os="linux"] { --titlebar-h: 32px; }

html, body { margin: 0; height: 100%; overflow: hidden; }

.app {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: var(--sidebar-w);
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: 1px solid rgba(0,0,0,.08);
  overflow: hidden;                 /* 折叠时防止内容溢出 */
  transition: width .2s cubic-bezier(.4, 0, .2, 1);
}
.sidebar[data-collapsed="true"] { width: 0; border-right-width: 0; }

/* 关键：主内容区也保留顶部安全区。
   侧栏折叠到 0 时，红绿灯会浮在主内容上方，这里必须留白，否则压住内容 */
.main {
  flex: 1;
  min-width: 0;
  padding-top: var(--titlebar-h);
  overflow: auto;
}

/* 顶部拖拽条 */
.titlebar {
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: flex-end;   /* 左侧留给红绿灯 */
  gap: 4px;
  padding: 0 10px;
  box-sizing: border-box;
}

/* 按钮必须盖在拖拽层之上，否则点不到 */
.titlebar button {
  position: relative;
  z-index: 1;
  width: 28px; height: 28px;
  display: grid; place-items: center;
  border: 0; border-radius: 6px;
  background: transparent; cursor: default;
  color: #3c3c43;
}
.titlebar button:hover { background: rgba(0,0,0,.06); }

/* 拖拽层铺满整条，置于按钮之下 */
.titlebar .drag {
  position: absolute;
  inset: 0;
  z-index: 0;
}
```

### 3.2 HTML / React 结构

```tsx
import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { platform } from '@tauri-apps/plugin-os';

export function App() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar.collapsed') === '1'
  );

  const toggle = useCallback(() => {
    setCollapsed(c => {
      localStorage.setItem('sidebar.collapsed', c ? '0' : '1');
      return !c;
    });
  }, []);

  // 标记平台，供 CSS 切换 --titlebar-h
  useEffect(() => {
    platform().then(p => document.documentElement.dataset.os = p);
  }, []);

  // Cmd/Ctrl + B —— 与 VS Code 一致的肌肉记忆
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <div className="app">
      <aside className="sidebar" data-collapsed={collapsed}>
        <div className="titlebar" style={{ position: 'relative' }}>
          <div className="drag" data-tauri-drag-region />
          <button onClick={toggle} title="折叠侧栏 (⌘B)">▣</button>
          <button onClick={() => history.back()} title="后退">‹</button>
          <button onClick={() => history.forward()} title="前进">›</button>
        </div>

        <nav className="navlist">
          <a href="#/home">Home</a>
          <a href="#/work">My work</a>
          <a href="#/automations">Automations</a>
          <a href="#/search">Search</a>
        </nav>
      </aside>

      <main className="main">
        {/* 侧栏折叠时，这个按钮接管展开操作 */}
        {collapsed && (
          <button className="floating-toggle" onClick={toggle}>▣</button>
        )}
        {/* 页面内容 */}
      </main>
    </div>
  );
}
```

### 3.3 关于 `data-tauri-drag-region`

- 加在元素上即可，**无需 JS**，Tauri 内部拦截 `mousedown` 调用 `startDragging()`
- **双击自动最大化**：Tauri 已内置处理
- **子元素会继承拖拽行为** —— 按钮务必用 `z-index` 提到拖拽层之上，或放在拖拽元素外部

需要自定义拖拽逻辑时改用手动方式：

```ts
const appWindow = getCurrentWindow();

document.getElementById('titlebar')?.addEventListener('mousedown', async (e) => {
  if ((e as MouseEvent).buttons === 1) {
    e.detail === 2
      ? await appWindow.toggleMaximize()   // 双击最大化
      : await appWindow.startDragging();   // 否则拖拽
  }
});
```

---

## 4. ⚠️ 已知缺陷：红绿灯位置在布局后被重置

**现象**：退出全屏、某些 resize、`setTitle()` 之后，红绿灯跳回系统默认位置。

**原因**：AppKit 在 layout pass 中重新摆放这三个按钮，wry 当前只在 `drawRect` 阶段应用自定义 inset。

**上游追踪**：[tauri-apps/wry#1747](https://github.com/tauri-apps/wry/issues/1747)（macOS: traffic light positions reset after content view layout passes）

### 缓解方案 A —— CSS 兜底（成本最低，优先）

把 `--titlebar-h` 设为 **≥ 52px**，`trafficLightPosition.y` 设在 20 左右。即使被重置到默认位置（约 x=20, y=20），视觉偏移也在安全区内，用户基本无感。**多数应用到此即可**。

### 缓解方案 B —— 事件后重设（需要像素级精确时）

```rust
// Cargo.toml
// [target."cfg(target_os = \"macos\")".dependencies]
// objc2 = "0.6"
// objc2-app-kit = { version = "0.3", features = ["NSWindow", "NSWindowButton"] }

use tauri::{Manager, WindowEvent, Runtime};

#[cfg(target_os = "macos")]
fn reposition_traffic_lights<R: Runtime>(window: &tauri::Window<R>, x: f64, y: f64) {
    use objc2_app_kit::{NSWindow, NSWindowButton};
    let Ok(ptr) = window.ns_window() else { return };
    let ns_window: &NSWindow = unsafe { &*(ptr as *mut NSWindow) };

    unsafe {
        for btn in [
            NSWindowButton::CloseButton,
            NSWindowButton::MiniaturizeButton,
            NSWindowButton::ZoomButton,
        ] {
            let Some(b) = ns_window.standardWindowButton(btn) else { continue };
            let mut f = b.frame();
            f.origin.x = x;   // 按需为每个按钮加间距
            f.origin.y = y;
            b.setFrameOrigin(f.origin);
        }
    }
}

pub fn run() {
    tauri::Builder::default()
        .on_window_event(|window, event| {
            #[cfg(target_os = "macos")]
            if matches!(
                event,
                WindowEvent::Resized(_) | WindowEvent::ThemeChanged(_) | WindowEvent::Focused(true)
            ) {
                reposition_traffic_lights(window, 16.0, 20.0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

> **不要**为此引入 `tauri-plugin-decorum` / `tauri-plugin-trafficlights-positioner` 等第三方插件，除非确有必要 —— 它们多数是 v1 时代产物，与 v2 的原生 `trafficLightPosition` 功能重叠，且增加升级负担。

---

## 5. 窗口状态持久化

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-plugin-window-state = "2"
```

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_window_state::Builder::default().build())
```

**职责划分**：

| 数据 | 归属 |
|---|---|
| 窗口尺寸 / 位置 / 最大化状态 | `tauri-plugin-window-state`（自动） |
| 侧栏折叠状态、宽度 | 前端自管：`localStorage` 或 SQLite |

> GitHub Copilot App 用的是 SQLite（`rusqlite` + `rusqlite_migration`，落在 `~/.copilot/data.db`）—— 适合状态量大、需要跨设备或需要迁移版本的场景。轻量应用用 `localStorage` 足够。

---

## 6. 跨平台差异对照

| | macOS | Windows | Linux |
|---|---|---|---|
| `decorations` | `true` | `false` | `true`（建议保留系统装饰） |
| `titleBarStyle` | `Overlay` | 忽略 | 忽略 |
| `trafficLightPosition` | ✅ 生效 | 忽略 | 忽略 |
| 窗口控件 | 系统红绿灯，左上 | 自绘 `─ ▢ ✕`，右上 | 系统装饰 |
| `--titlebar-h` 建议 | 52px | 32px | 0（有系统标题栏） |
| `transparent` | 需 `macOSPrivateApi: true` | 支持 | WebKitGTK 支持不稳，慎用 |

**Windows/Linux 自绘按钮**：

```ts
import { getCurrentWindow } from '@tauri-apps/api/window';
const appWindow = getCurrentWindow();

<button onClick={() => appWindow.minimize()}>─</button>
<button onClick={() => appWindow.toggleMaximize()}>▢</button>
<button onClick={() => appWindow.close()}>✕</button>
```

---

## 7. 验收清单

- [ ] macOS：红绿灯出现在侧栏顶部，与设计稿位置一致
- [ ] 拖拽侧栏顶部空白区可移动窗口
- [ ] 双击侧栏顶部空白区可最大化/还原
- [ ] 侧栏内按钮可正常点击（**未被拖拽层吞掉事件**）
- [ ] ⌘B / Ctrl+B 折叠展开，动画流畅无跳变
- [ ] **折叠后红绿灯不遮挡主内容**（主内容区保留了 `padding-top`）
- [ ] 进入并退出全屏后，红绿灯位置可接受
- [ ] 重启应用，窗口尺寸与侧栏折叠状态均被恢复
- [ ] Windows 构建：自绘按钮位于右上且功能正常
- [ ] Linux 构建：无渲染异常
- [ ] 未出现 `-webkit-app-region`（Tauri 中无效）
- [ ] capabilities 已含 `core:window:allow-start-dragging`

---

## 8. 参考来源

| 来源 | 用途 |
|---|---|
| [Window Customization](https://v2.tauri.app/learn/window-customization/) | `data-tauri-drag-region`、capabilities 权限清单、`TitleBarStyle` 用法 |
| [Config Reference · WindowConfig](https://v2.tauri.app/reference/config/#windowconfig) | 配置字段权威定义 |
| [`tauri_utils::config::WindowConfig`](https://docs.rs/tauri-utils/latest/tauri_utils/config/struct.WindowConfig.html) | `traffic_light_position: Option<LogicalPosition>` |
| [`tauri_utils::TitleBarStyle`](https://docs.rs/tauri-utils/latest/tauri_utils/enum.TitleBarStyle.html) | 枚举值：`Visible` / `Transparent` / `Overlay` |
| [tauri `webview_window.rs`](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/webview/webview_window.rs) | builder 方法及「Requires titleBarStyle: Overlay and decorations: true」约束 |
| [wry#1747](https://github.com/tauri-apps/wry/issues/1747) | 红绿灯位置重置缺陷 |
| `/Applications/GitHub Copilot.app` 二进制分析 | 实际产品做法佐证 |

---

## 附录：GitHub Copilot App 技术栈（逆向确认）

```
壳层      Tauri 2.11.5 + wry（macOS 走 WKWebView，非 Chromium）
异步/网络  tokio 1.53 · reqwest 0.13 · hyper 1.11 · tokio-tungstenite 0.24
存储      rusqlite 0.31 + rusqlite_migration 1.2  → ~/.copilot/data.db
原生桥    objc2 / objc2-app-kit / objc2-web-kit / objc2-osa-kit
菜单      muda 0.19
插件      window-state · deep-link · updater · autostart · notification · opener · dialog · macos-fps
本地推理  Microsoft.AI.Foundry.Local.Core.dylib + onnxruntime-genai
前端      React + TanStack（含 react-scan），资源内嵌进 285 MB 单体二进制
Bundle ID com.github.githubapp
```

**验证方法**：

```bash
ls "/Applications/GitHub Copilot.app/Contents/Frameworks"   # 无 Electron Framework
otool -L "/Applications/GitHub Copilot.app/Contents/MacOS/github" | grep WebKit
strings -a "/Applications/GitHub Copilot.app/Contents/MacOS/github" \
  | grep -oE "cargo/registry/src/[^/]*/tauri-[0-9.]+" | sort -u
```
