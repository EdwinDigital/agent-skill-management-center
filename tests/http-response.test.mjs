import assert from "node:assert/strict";
import test from "node:test";

import { canWriteJsonResponse, sendJsonIfWritable } from "../server/http-response.js";

test("canWriteJsonResponse rejects completed or destroyed response streams", () => {
  assert.equal(canWriteJsonResponse({ writableEnded: false, destroyed: false }), true);
  assert.equal(canWriteJsonResponse({ headersSent: true, writableEnded: false, destroyed: false }), false);
  assert.equal(canWriteJsonResponse({ writableEnded: true, destroyed: false }), false);
  assert.equal(canWriteJsonResponse({ writableEnded: false, destroyed: true }), false);
});

test("canWriteJsonResponse rejects aborted requests before fallback writes", () => {
  assert.equal(canWriteJsonResponse({ writableEnded: false, destroyed: false }, { aborted: true }), false);
});

test("sendJsonIfWritable does not call json when the response is no longer writable", () => {
  let calls = 0;
  const response = {
    destroyed: true,
    json() {
      calls += 1;
    }
  };

  assert.equal(sendJsonIfWritable(response, { aborted: false }, { ok: true }), false);
  assert.equal(calls, 0);
});