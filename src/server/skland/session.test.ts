import assert from "node:assert/strict";
import test from "node:test";

import { assertSameOrigin } from "./session.ts";

function proxiedRequest(origin?: string, forwardedHost = "beta.example.com:4174", forwardedProto = "http"): Request {
  const headers = new Headers({
    host: "127.0.0.1:4175",
    "x-forwarded-host": forwardedHost,
    "x-forwarded-proto": forwardedProto,
  });
  if (origin) headers.set("origin", origin);
  return new Request("http://127.0.0.1:4175/api/skland/auth/qr", { method: "POST", headers });
}

test("allows requests without an Origin header", () => {
  assert.doesNotThrow(() => assertSameOrigin(proxiedRequest(), "http://beta.example.com:4174"));
});

test("uses the configured public origin instead of the internal proxy address", () => {
  const request = proxiedRequest("http://beta.example.com:4174", "beta.example.com");
  assert.doesNotThrow(() => assertSameOrigin(request, "http://beta.example.com:4174"));
});

test("rejects a different public port", () => {
  const request = proxiedRequest("http://beta.example.com");
  assert.throws(() => assertSameOrigin(request, "http://beta.example.com:4174"), /请求来源无效/);
});

test("rejects a different public scheme or host", () => {
  for (const origin of ["https://beta.example.com:4174", "http://other.example.com:4174"]) {
    assert.throws(() => assertSameOrigin(proxiedRequest(origin), "http://beta.example.com:4174"), /请求来源无效/);
  }
});

test("rejects a malformed request origin", () => {
  assert.throws(() => assertSameOrigin(proxiedRequest("null"), "http://beta.example.com:4174"), /请求来源无效/);
});

test("rejects an invalid configured public origin", () => {
  const request = proxiedRequest("http://beta.example.com:4174");
  assert.throws(() => assertSameOrigin(request, "http://beta.example.com:4174/path"), /SKLAND_PUBLIC_ORIGIN 配置无效/);
});

test("falls back to forwarded host and protocol when no public origin is configured", () => {
  const request = proxiedRequest("https://beta.example.com", "beta.example.com", "https");
  assert.doesNotThrow(() => assertSameOrigin(request, ""));
});

test("rejects a forwarded protocol mismatch", () => {
  const request = proxiedRequest("http://beta.example.com:4174", "beta.example.com:4174", "https");
  assert.throws(() => assertSameOrigin(request, ""), /请求来源无效/);
});
