import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("app initializes display language from saved preference first, then system language", () => {
  assert.match(appSource, /function getInitialLanguage/);
  assert.match(appSource, /localStorage\.getItem\(storageKeys\.language\)/);
  assert.match(appSource, /navigator\.languages/);
  assert.match(appSource, /navigator\.language/);
  assert.match(appSource, /startsWith\("zh"\)/);
  assert.match(appSource, /useState<Language>\(getInitialLanguage\)/);
});