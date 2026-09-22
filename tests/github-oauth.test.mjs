import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const schemaSource = fs.readFileSync(new URL("../setup/schema.sql", import.meta.url), "utf8");
const serverSource = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

test("database schema stores GitHub OAuth device-flow tokens locally", () => {
  assert.match(schemaSource, /CREATE TABLE IF NOT EXISTS github_oauth_tokens/);
  assert.match(schemaSource, /access_token TEXT NOT NULL/);
  assert.match(schemaSource, /scope TEXT/);
  assert.match(schemaSource, /login TEXT/);
});

test("server exposes GitHub OAuth device-flow start and poll endpoints", () => {
  assert.match(serverSource, /\/api\/auth\/github\/device\/start/);
  assert.match(serverSource, /\/api\/auth\/github\/device\/poll/);
  assert.match(serverSource, /startGitHubDeviceFlow/);
  assert.match(serverSource, /pollGitHubDeviceFlow/);
  assert.match(serverSource, /storeGitHubOAuthToken/);
  assert.match(serverSource, /getStoredGitHubOAuthToken/);
});

test("frontend guides unauthenticated users through GitHub OAuth on startup", () => {
  assert.match(appSource, /startGitHubOAuthLogin/);
  assert.match(appSource, /pollGitHubOAuthDeviceFlow/);
  assert.match(appSource, /githubDeviceAuth/);
  assert.match(appSource, /user_code/);
  assert.match(appSource, /\/api\/auth\/github\/device\/start/);
  assert.match(appSource, /\/api\/auth\/github\/device\/poll/);
  assert.match(appSource, /Login with GitHub|登录 GitHub/);
});

test("frontend waits for an explicit click before opening the GitHub device page", () => {
  const startFunction = appSource.match(/async function startGitHubOAuthLogin\(\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.doesNotMatch(startFunction, /window\.open/);
  assert.match(appSource, /async function openGitHubDevicePage/);
  assert.match(appSource, /await copyTextToClipboard\(auth\.user_code\)/);
  assert.match(appSource, /window\.open\("about:blank", "_blank"\)/);
  assert.match(appSource, /authWindow\.location\.href = auth\.verification_uri/);
  assert.doesNotMatch(appSource, /onClick=\{githubDeviceAuth \? \(\) => void openGitHubDevicePage/);
  assert.doesNotMatch(serverSource, /openExternalUrl\(auth\.verification_uri\)/);
});

test("frontend writes device code to clipboard before opening the browser", () => {
  const openFunction = appSource.match(/async function openGitHubDevicePage[\s\S]*?\n  \}/)?.[0] || "";
  assert.ok(openFunction.indexOf("await copyTextToClipboard(auth.user_code)") > -1);
  assert.ok(openFunction.indexOf('window.open("about:blank", "_blank")') < openFunction.indexOf("await copyTextToClipboard(auth.user_code)"));
  assert.ok(openFunction.indexOf("await copyTextToClipboard(auth.user_code)") < openFunction.indexOf("authWindow.location.href = auth.verification_uri"));

  const copyFunction = appSource.match(/async function copyTextToClipboard[\s\S]*?\n\}/)?.[0] || "";
  assert.ok(copyFunction.indexOf("navigator.clipboard?.writeText") > -1);
  assert.ok(copyFunction.indexOf("navigator.clipboard?.writeText") < copyFunction.indexOf("document.execCommand"));
});

test("frontend login entry only starts device flow and cancellation stays available", () => {
  assert.match(appSource, /function cancelGitHubOAuth/);
  assert.match(appSource, /clearGitHubOAuthTimer\(\)/);
  assert.match(appSource, /setGitHubOAuthLoading\(false\)/);
  assert.match(appSource, /onOpenChange=\{handleGitHubOAuthOpenChange\}/);
  assert.match(appSource, /onClick=\{cancelGitHubOAuth\}>\{text\.cancel\}/);
  assert.doesNotMatch(appSource, /disabled=\{githubOAuthLoading && Boolean\(githubDeviceAuth\)\}/);
});
