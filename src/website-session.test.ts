import assert from "node:assert/strict";
import test from "node:test";

import { parseWebsiteSessionIdentity } from "./website-session.ts";

test("website session identity keeps only the authenticated user id", () => {
  assert.deepEqual(parseWebsiteSessionIdentity({
    session: { id: "session-id", token: "secret-token" },
    user: { id: "user-id", name: "测试用户", email: "test@example.com" },
  }), { user: { id: "user-id" } });
});

test("website session identity rejects missing or invalid users", () => {
  assert.equal(parseWebsiteSessionIdentity(null), null);
  assert.equal(parseWebsiteSessionIdentity({ user: null }), null);
  assert.equal(parseWebsiteSessionIdentity({ user: { id: "" } }), null);
  assert.equal(parseWebsiteSessionIdentity({ user: { id: 123 } }), null);
});
