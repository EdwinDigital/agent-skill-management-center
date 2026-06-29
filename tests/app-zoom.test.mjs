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

test("app handles browser-like keyboard zoom shortcuts", () => {
  assert.match(appSource, /keydown/);
  assert.match(appSource, /metaKey/);
  assert.match(appSource, /ctrlKey/);
  assert.match(appSource, /appZoomStep/);
  assert.match(appSource, /toast\.message/);
});

test("CSS applies app zoom as a percentage", () => {
  assert.match(cssSource, /--app-zoom/);
  assert.match(cssSource, /zoom:\s*var\(--app-zoom/);
  assert.doesNotMatch(cssSource, /sidebar-zoom-control/);
  assert.doesNotMatch(cssSource, /sidebar-zoom-percent/);
});