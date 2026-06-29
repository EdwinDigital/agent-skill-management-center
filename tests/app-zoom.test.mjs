import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const cssSource = fs.readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

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
  assert.doesNotMatch(appSource, /\{text\.appZoomOut\}\s*<\/Button>/);
  assert.doesNotMatch(appSource, /\{text\.appZoomIn\}\s*<\/Button>/);
});

test("app handles browser-like keyboard zoom shortcuts", () => {
  assert.match(appSource, /keydown/);
  assert.match(appSource, /metaKey/);
  assert.match(appSource, /ctrlKey/);
  assert.match(appSource, /appZoomStep/);
  assert.match(appSource, /toast\.message/);
});

test("CSS applies app zoom as a percentage", () => {
  assert.match(cssSource, /--app-zoom/);
  assert.match(appSource, /--app-zoom-scale/);
  assert.match(cssSource, /--app-zoom-scale/);
  assert.match(cssSource, /--app-viewport-width/);
  assert.match(cssSource, /--app-viewport-height/);
  assert.match(cssSource, /transform:\s*scale\(var\(--app-zoom-scale\)\)/);
  assert.match(cssSource, /transform-origin:\s*top left/);
  assert.match(cssSource, /--app-viewport-width:\s*calc\(100vw\s*\/\s*var\(--app-zoom-scale\)\)/);
  assert.match(cssSource, /--app-viewport-height:\s*calc\(100vh\s*\/\s*var\(--app-zoom-scale\)\)/);
  assert.match(cssSource, /scrollbar-gutter:\s*stable/);
  assert.doesNotMatch(appSource, /--app-scrollbar-width/);
  assert.doesNotMatch(appSource, /window\.innerWidth - document\.documentElement\.clientWidth/);
  assert.doesNotMatch(cssSource, /zoom:\s*var\(--app-zoom/);
  assert.doesNotMatch(cssSource, /sidebar-zoom-control/);
  assert.doesNotMatch(cssSource, /sidebar-zoom-percent/);
});

test("zoomed layout containers use the compensated viewport dimensions", () => {
  assert.match(cssSource, /\.app-shell\s*\{[^}]*min-height:\s*var\(--app-viewport-height\)/s);
  assert.match(cssSource, /\.app-shell\s*\{[^}]*width:\s*100%/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*height:\s*var\(--app-viewport-height\)/s);
  assert.match(cssSource, /\.detail-surface\s*\{[^}]*min-height:\s*calc\(var\(--app-viewport-height\)\s*-\s*1rem\)/s);
  assert.match(cssSource, /\.skill-doc-panel\s*\{[^}]*width:\s*min\(42rem,\s*calc\(var\(--app-viewport-width\)\s*-\s*2rem\)\)/s);
  assert.match(cssSource, /\.skill-doc-panel\.is-collapsed\s*\{[^}]*height:\s*var\(--app-viewport-height\)/s);
});

test("zoomed app shell prevents page-level horizontal overflow", () => {
  assert.match(cssSource, /--app-viewport-width:\s*calc\(100vw\s*\/\s*var\(--app-zoom-scale\)\)/);
  assert.match(cssSource, /html,\s*body\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(cssSource, /#root\s*\{[^}]*overflow-x:\s*hidden/s);
  assert.match(cssSource, /\.app-root\s*\{[^}]*overflow-x:\s*hidden/s);
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

test("sidebar keeps the account bar pinned while only the skill list scrolls", () => {
  assert.match(appSource, /className=\{cn\(\s*"app-sidebar/);
  assert.doesNotMatch(appSource, /sticky top-0 h-screen/);
  assert.doesNotMatch(appSource, /data-sidebar-scroll="true"[^\n]*overflow-y-auto/);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*position:\s*fixed/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*top:\s*0/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*bottom:\s*0/s);
  assert.match(cssSource, /\.app-sidebar\s*\{[^}]*width:\s*clamp\(14\.5rem,\s*22vw,\s*16rem\)/s);
  assert.match(cssSource, /\.app-shell\[data-sidebar-collapsed="true"\]\s*>\s*\.app-sidebar\s*\{[^}]*width:\s*var\(--app-rail-width\)/s);
  assert.match(cssSource, /\[data-sidebar-scroll="true"\]\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(cssSource, /\.sidebar-skill-list\s*\{[^}]*overflow-y:\s*auto/s);
});

test("left sidebar rules do not capture the right skill document panel", () => {
  assert.doesNotMatch(cssSource, /\.app-shell\s*>\s*aside\s*\{[^}]*position:\s*fixed/s);
  assert.doesNotMatch(cssSource, /\.app-shell\[data-sidebar-collapsed="true"\]\s*>\s*aside\s*\{/);
  assert.match(cssSource, /\.skill-doc-panel\s*\{[^}]*right:\s*0/s);
  assert.match(cssSource, /\.skill-doc-panel\.is-collapsed\s*\{[^}]*right:\s*0/s);
  assert.match(cssSource, /\.skill-doc-panel\.is-collapsed\s*\{[^}]*width:\s*var\(--skill-doc-rail-width\)/s);
});