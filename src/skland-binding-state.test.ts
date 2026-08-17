import assert from "node:assert/strict";
import test from "node:test";

import { deriveSklandBindingState } from "./skland-binding-state.ts";

test("a persisted website binding is distinguished from a current browser credential", () => {
  assert.equal(deriveSklandBindingState(1, 0), "reauthorize");
  assert.equal(deriveSklandBindingState(1, 1), "active");
  assert.equal(deriveSklandBindingState(0, 0), "unbound");
});
