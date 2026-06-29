import assert from "node:assert/strict";
import test from "node:test";

import { hashText } from "../core/utils/hash.js";

test("hashText returns a stable sha256 hex digest for string-like input", () => {
  assert.equal(hashText("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(hashText(123), "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3");
});