import assert from "node:assert/strict";
import test from "node:test";
import { configuredAdminIds, requireAuthBaseUrl, requireAuthSecret } from "./config.ts";

test("Better Auth secret must contain at least 32 UTF-8 bytes", () => {
  assert.throws(() => requireAuthSecret("short"), /32 bytes/);
  assert.equal(requireAuthSecret("x".repeat(32)), "x".repeat(32));
  assert.equal(requireAuthSecret("密".repeat(11)), "密".repeat(11));
});

test("Better Auth base URL must be an HTTPS origin outside local development", () => {
  assert.equal(requireAuthBaseUrl("https://auth.example.test", "production"), "https://auth.example.test");
  assert.equal(requireAuthBaseUrl("http://127.0.0.1:5174", "development"), "http://127.0.0.1:5174");
  assert.throws(() => requireAuthBaseUrl("http://127.0.0.1:5174", "production"), /HTTPS/);
  assert.throws(() => requireAuthBaseUrl("http://auth.example.test", "development"), /HTTPS/);
  assert.throws(() => requireAuthBaseUrl("https://auth.example.test/path", "production"), /origin/);
});

test("administrator ids are explicit, trimmed Better Auth user ids", () => {
  assert.deepEqual([...configuredAdminIds(" user-one, user-two, user-one, ,")], ["user-one", "user-two"]);
  assert.equal(configuredAdminIds("").size, 0);
});
