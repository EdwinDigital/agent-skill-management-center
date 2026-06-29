import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
const dialogSource = fs.readFileSync(new URL("../src/components/ui/dialog.tsx", import.meta.url), "utf8");

test("app exposes persisted percentage zoom controls", () => {
  assert.match(appSource, /appZoomPercent/);
  assert.match(appSource, /storageKeys\.appZoom/);
  assert.match(appSource, /setAppZoomPercent/);
  assert.match(appSource, /applyAppZoom/);
  assert.match(appSource, /settings-zoom-control/);
  assert.doesNotMatch(appSource, /sidebar-zoom-control/);
  assert.doesNotMatch(appSource, /sidebar-zoom-percent/);
});

test("settings app zoom controls use icon-only command buttons", () => {
  assert.match(appSource, /aria-label=\{text\.appZoomOut\}/);
  assert.match(appSource, /aria-label=\{text\.appZoomIn\}/);
  assert.match(appSource, /size="icon-sm"[\s\S]*aria-label=\{text\.appZoomOut\}/);
  assert.match(appSource, /size="icon-sm"[\s\S]*aria-label=\{text\.appZoomIn\}/);
  assert.match(appSource, /<Minus data-icon="inline-start" \/>/);
  assert.match(appSource, /<Plus data-icon="inline-start" \/>/);
  assert.match(cssSource, /\.settings-zoom-control\s*\{[^}]*grid-template-columns:\s*1\.75rem minmax\(4rem, 1fr\) 1\.75rem/s);
  assert.doesNotMatch(appSource, /\{text\.appZoomOut\}\s*<\/Button>/);
  assert.doesNotMatch(appSource, /\{text\.appZoomIn\}\s*<\/Button>/);
});

test("dialogs avoid backdrop blur so settings stay visually crisp", () => {
  assert.match(dialogSource, /data-slot="dialog-overlay"/);
  assert.match(dialogSource, /data-slot="dialog-positioner"/);
  assert.doesNotMatch(dialogSource, /backdrop-blur/);
  assert.doesNotMatch(dialogSource, /-translate-x-1\/2/);
  assert.doesNotMatch(dialogSource, /-translate-y-1\/2/);
  assert.doesNotMatch(dialogSource, /zoom-in-95|zoom-out-95/);
});

test("app handles browser-like keyboard zoom shortcuts", () => {
  assert.match(appSource, /keydown/);
  assert.match(appSource, /metaKey/);
  assert.match(appSource, /ctrlKey/);
  assert.match(appSource, /appZoomStep/);
  assert.match(appSource, /toast\.message/);
});

test("app zoom notification stays outside the state updater", () => {
  assert.match(appSource, /appZoomPercentRef/);
  assert.doesNotMatch(appSource, /setAppZoomPercent\(\(current\) => \{[\s\S]*toast\.message[\s\S]*return next;[\s\S]*\}\);/);
});

test("common UI avoids CSS transforms under Tauri WebView", () => {
  const allowedAppTransformSnippets = [
    /transform="translate\([^"']+\)"/g,
    /transform: `scale\(\$\{zoom\}\)`/
  ];
  const appWithoutAllowedTransforms = allowedAppTransformSnippets.reduce((source, pattern) => source.replace(pattern, ""), appSource);
  assert.doesNotMatch(appWithoutAllowedTransforms, /translate-[xy]|backdrop-blur/);
  assert.doesNotMatch(cssSource, /transform:\s*(translate|scale)/);
  assert.doesNotMatch(cssSource, /will-change:\s*[^;]*transform/);
  assert.doesNotMatch(dialogSource, /translate-[xy]|zoom-in-95|zoom-out-95|backdrop-blur/);
  const selectSource = fs.readFileSync(new URL("../src/components/ui/select.tsx", import.meta.url), "utf8");
  const buttonSource = fs.readFileSync(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(selectSource, /translate-[xy]|zoom-in-95|zoom-out-95/);
  assert.doesNotMatch(buttonSource, /translate-[xy]/);
});

test("CSS applies app zoom as a percentage", () => {
  assert.match(cssSource, /--app-zoom/);
  assert.match(appSource, /--app-zoom-scale/);
  assert.match(cssSource, /--app-zoom-scale/);
  assert.match(cssSource, /--app-viewport-width/);
  assert.match(cssSource, /--app-viewport-height/);
  assert.match(cssSource, /zoom:\s*var\(--app-zoom-scale\)/);
  assert.doesNotMatch(cssSource, /transform:\s*scale\(var\(--app-zoom-scale\)\)/);
  assert.doesNotMatch(cssSource, /transform-origin:\s*top left/);
  assert.match(cssSource, /--app-viewport-width:\s*calc\(100vw\s*\/\s*var\(--app-zoom-scale\)\)/);
  assert.match(cssSource, /--app-viewport-height:\s*calc\(100vh\s*\/\s*var\(--app-zoom-scale\)\)/);
  assert.doesNotMatch(cssSource, /scrollbar-gutter:\s*stable/);
  assert.doesNotMatch(appSource, /--app-scrollbar-width/);
  assert.doesNotMatch(appSource, /window\.innerWidth - document\.documentElement\.clientWidth/);
  assert.doesNotMatch(cssSource, /sidebar-zoom-control/);
  assert.doesNotMatch(cssSource, /sidebar-zoom-percent/);
});

test("desktop app zoom uses native WebView zoom without root transform scaling", () => {
  assert.match(appSource, /__TAURI__/);
  assert.match(appSource, /isDesktopRuntime/);
  assert.match(appSource, /setDesktopWebviewZoom/);
  assert.match(appSource, /invoke\("set_app_zoom", \{ scaleFactor \}\)/);
  assert.match(appSource, /setProperty\("--app-zoom-scale", isDesktopRuntime\(\) \? "1" : String\(scaleFactor\)\)/);
});

test("initial skill loading stays silent to avoid duplicate startup toasts", () => {
  assert.match(appSource, /loadSkillsFromServer\(firstRoot, \{ notify: false \}\)/);
  assert.match(appSource, /options: \{ notify\?: boolean \} = \{\}/);
  assert.match(appSource, /if \(options\.notify !== false\) \{\s*toast\.success\(`\$\{text\.skills\}: \$\{result\.skills\.length\}`\);\s*\}/s);
});

test("zoomed layout containers use the compensated viewport dimensions", () => {
  assert.match(cssSource, /\.app-shell\s*\{[^}]*height:\s*var\(--app-viewport-height\)/s);
  assert.match(cssSource, /\.app-shell\s*\{[^}]*width:\s*100%/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*height:\s*var\(--app-viewport-height\)/s);
  assert.match(cssSource, /\.detail-main\s*\{[^}]*height:\s*var\(--app-viewport-height\)/s);
  assert.match(cssSource, /\.detail-surface\s*\{[^}]*height:\s*calc\(var\(--app-viewport-height\)\s*-\s*1rem\)/s);
  assert.match(cssSource, /\.detail-surface\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(cssSource, /\.skill-doc-panel\s*\{[^}]*width:\s*min\(42rem,\s*calc\(var\(--app-viewport-width\)\s*-\s*2rem\)\)/s);
  assert.match(cssSource, /\.skill-doc-panel\.is-collapsed\s*\{[^}]*height:\s*var\(--app-viewport-height\)/s);
});

test("detail surface scrollbar matches the local ScrollArea styling", () => {
  assert.match(cssSource, /\.detail-surface\s*\{[^}]*scrollbar-width:\s*thin/s);
  assert.match(cssSource, /\.detail-surface\s*\{[^}]*scrollbar-color:\s*color-mix\(in srgb, var\(--border\) 92%, var\(--primary\)\)/s);
  assert.match(cssSource, /\.detail-surface::-webkit-scrollbar\s*\{[^}]*width:\s*0\.625rem/s);
  assert.match(cssSource, /\.detail-surface::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*999px/s);
  assert.match(cssSource, /\.detail-surface::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--border\) 92%, var\(--primary\)\)/s);
});

test("zoomed app shell prevents page-level window overflow", () => {
  assert.match(cssSource, /--app-viewport-width:\s*calc\(100vw\s*\/\s*var\(--app-zoom-scale\)\)/);
  assert.match(cssSource, /html,\s*body\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(cssSource, /html,\s*body\s*\{[^}]*overflow-y:\s*hidden/s);
  assert.match(cssSource, /#root\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(cssSource, /#root\s*\{[^}]*overflow-y:\s*hidden/s);
  assert.match(cssSource, /\.app-root\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(cssSource, /\.app-root\s*\{[^}]*overflow-y:\s*hidden/s);
  assert.match(cssSource, /\.app-shell\s*\{[^}]*max-width:\s*100%/s);
});

test("zoom width compensation is not applied repeatedly to nested app containers", () => {
  assert.match(cssSource, /body\s*\{[^}]*width:\s*100vw/s);
  assert.match(cssSource, /#root\s*\{[^}]*width:\s*100vw/s);
  assert.match(cssSource, /\.app-root\s*\{[^}]*width:\s*var\(--app-viewport-width\)/s);
  assert.match(cssSource, /\.app-shell\s*\{[^}]*width:\s*100%/s);
  assert.doesNotMatch(cssSource, /#root\s*\{[^}]*width:\s*var\(--app-viewport-width\)/s);
  assert.doesNotMatch(cssSource, /\.app-shell\s*\{[^}]*width:\s*var\(--app-viewport-width\)/s);
});

test("sidebar keeps the account bar pinned while skill pagination avoids menu scrollbars", () => {
  assert.match(appSource, /className=\{cn\(\s*"app-sidebar/);
  assert.match(appSource, /className=\{cn\(\s*"sidebar-rail"/);
  assert.doesNotMatch(appSource, /sticky top-0 h-screen/);
  assert.doesNotMatch(appSource, /data-sidebar-scroll="true"[^\n]*overflow-y-auto/);
  assert.match(appSource, /const skillRowPitch = 42/);
  assert.match(appSource, /Math\.floor\(availableHeight \/ skillRowPitch\)/);
  assert.doesNotMatch(appSource, /Math\.floor\(\(availableHeight \+ 8\) \/ skillRowPitch\)/);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*position:\s*fixed/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*top:\s*0/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*bottom:\s*0/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*width:\s*clamp\(14\.5rem,\s*22vw,\s*16rem\)/s);
  assert.match(cssSource, /\.app-shell\[data-sidebar-collapsed="true"\]\s*>\s*\.app-sidebar\s*\{[^}]*width:\s*var\(--app-rail-width\)/s);
  assert.match(cssSource, /\[data-sidebar-scroll="true"\]\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /\.sidebar-skill-list\s*\{[^}]*overflow-y:\s*hidden/s);
  assert.match(cssSource, /\.sidebar-account-bar\s*\{[^}]*margin-top:\s*auto/s);
  assert.match(cssSource, /\.sidebar-brand-title\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(cssSource, /\.sidebar-brand-row\s*\{[^}]*position:\s*relative/s);
  assert.match(cssSource, /\.sidebar-collapse-button\s*\{[^}]*position:\s*absolute/s);
  assert.match(cssSource, /\.sidebar-collapse-button\s*\{[^}]*z-index:\s*2/s);
});

test("sidebar collapsed and expanded panes respect hidden state", () => {
  assert.match(cssSource, /\.sidebar-rail\.hidden,\s*\[data-sidebar-scroll="true"\]\.hidden\s*\{[^}]*display:\s*none/s);
});

test("left and right collapsed rails share the same visual contract", () => {
  assert.match(cssSource, /\.sidebar-rail,\s*\.skill-doc-rail\s*\{/);
  assert.match(cssSource, /\.sidebar-rail,\s*\.skill-doc-rail\s*\{[^}]*display:\s*flex/s);
  assert.match(cssSource, /\.sidebar-rail,\s*\.skill-doc-rail\s*\{[^}]*height:\s*100%/s);
  assert.match(cssSource, /\.sidebar-rail,\s*\.skill-doc-rail\s*\{[^}]*background:\s*var\(--background\)/s);
  assert.match(cssSource, /\.sidebar-rail\s*\{[^}]*border-right:\s*1px solid var\(--sidebar-border\)/s);
  assert.match(cssSource, /\.skill-doc-rail\s*\{[^}]*border-left:\s*1px solid var\(--sidebar-border\)/s);
  assert.match(cssSource, /\.sidebar-rail:hover,\s*\.skill-doc-rail:hover\s*\{/);
});

test("left sidebar rules do not capture the right skill document panel", () => {
  assert.doesNotMatch(cssSource, /\.app-shell\s*>\s*aside\s*\{[^}]*position:\s*fixed/s);
  assert.doesNotMatch(cssSource, /\.app-shell\[data-sidebar-collapsed="true"\]\s*>\s*aside\s*\{/);
  assert.match(cssSource, /\.skill-doc-panel\s*\{[^}]*right:\s*0/s);
  assert.match(cssSource, /\.skill-doc-panel\.is-collapsed\s*\{[^}]*right:\s*0/s);
  assert.match(cssSource, /\.skill-doc-panel\.is-collapsed\s*\{[^}]*width:\s*var\(--skill-doc-rail-width\)/s);
});