import assert from "node:assert/strict";
import test from "node:test";

import { maaRoomAutofill } from "./schedule-autofill.ts";

test("propagates only an explicit MAA autofill flag", () => {
  assert.equal(maaRoomAutofill(true), true);
  assert.equal(maaRoomAutofill(false), false);
  assert.equal(maaRoomAutofill(undefined), false);
  assert.equal(maaRoomAutofill("true"), false);
});
