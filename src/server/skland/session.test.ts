import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSameOrigin,
  createSklandStoredAccount,
  removeSklandAccount,
  sealSklandAccount,
  sealSklandAccountIndex,
  sealSklandSession,
  SKLAND_ACCOUNT_LIMIT,
  type SklandSessionPayload,
  type SklandStoredAccount,
  toPublicSklandAccount,
  unsealSklandAccount,
  unsealSklandAccountIndex,
  unsealSklandSession,
  upsertSklandAccount,
} from "./session.ts";

const secret = "test-secret-that-is-at-least-thirty-two-bytes";
const now = 1_700_000_000_000;

function sessionFor(userId: string, selectedUid = `${userId}-uid`): SklandSessionPayload {
  return {
    version: 1,
    cred: `cred-${userId}`,
    token: `token-${userId}`,
    dId: `did-${userId}`,
    userId,
    selectedUid,
    refreshedAt: now,
    expiresAt: now + 60_000,
  };
}

function rolesFor(userId: string) {
  return [{
    uid: `${userId}-uid`,
    nickname: `博士-${userId}`,
    channelName: "官服",
    isDefault: true,
  }];
}

test("round-trips legacy, account, and account-index encrypted payloads", () => {
  const session = sessionFor("one");
  assert.deepEqual(unsealSklandSession(sealSklandSession(session, secret), secret, now), session);

  const account = createSklandStoredAccount(session, rolesFor("one"), "account_one");
  assert.deepEqual(unsealSklandAccount(sealSklandAccount(account, secret), secret, now), account);

  const index = {
    version: 2 as const,
    accountIds: [account.accountId],
    activeAccountId: account.accountId,
    expiresAt: now + 60_000,
  };
  assert.deepEqual(unsealSklandAccountIndex(sealSklandAccountIndex(index, secret), secret, now), index);
});

test("re-login replaces the same Skland account without changing its opaque id or order", () => {
  const first = upsertSklandAccount([], sessionFor("one"), rolesFor("one"));
  const secondAccount = upsertSklandAccount(first.accounts, sessionFor("two"), rolesFor("two"));
  const refreshed = upsertSklandAccount(
    secondAccount.accounts,
    { ...sessionFor("one"), token: "new-token" },
    [{ ...rolesFor("one")[0], nickname: "更新后的博士" }]
  );

  assert.equal(refreshed.replaced, true);
  assert.equal(refreshed.accounts.length, 2);
  assert.equal(refreshed.account.accountId, first.account.accountId);
  assert.equal(refreshed.accounts[0].session.token, "new-token");
  assert.equal(refreshed.accounts[0].roles[0].nickname, "更新后的博士");
  assert.equal(refreshed.accounts[1].accountId, secondAccount.account.accountId);
});

test("public account summaries recursively exclude every credential and upstream account id", () => {
  const account = createSklandStoredAccount(
    sessionFor("upstream-secret", "public-role"),
    [{ uid: "public-role", nickname: "公开博士", channelName: "官服", isDefault: true }],
    "account_public"
  );
  const serialized = JSON.stringify(toPublicSklandAccount(account));
  for (const sensitive of ["cred-", "token-", "did-", "upstream-secret"]) {
    assert.equal(serialized.includes(sensitive), false);
  }
  assert.deepEqual(Object.keys(toPublicSklandAccount(account)).sort(), ["accountId", "roles", "selectedUid"]);
});

test("enforces the five-account limit while still allowing an existing account to refresh", () => {
  let accounts: SklandStoredAccount[] = [];
  for (let index = 0; index < SKLAND_ACCOUNT_LIMIT; index += 1) {
    accounts = upsertSklandAccount(accounts, sessionFor(String(index)), rolesFor(String(index))).accounts;
  }
  assert.equal(accounts.length, SKLAND_ACCOUNT_LIMIT);
  assert.throws(
    () => upsertSklandAccount(accounts, sessionFor("overflow"), rolesFor("overflow")),
    /最多可登录 5 个/
  );
  assert.doesNotThrow(() => upsertSklandAccount(accounts, sessionFor("0"), rolesFor("0")));
});

test("removing the active account selects the next account and falls back to the previous at the end", () => {
  const accounts = ["one", "two", "three"].map((userId) =>
    createSklandStoredAccount(sessionFor(userId), rolesFor(userId), `account_${userId}`)
  );
  const middle = removeSklandAccount(accounts, "account_two", "account_two");
  assert.equal(middle.activeAccountId, "account_three");
  const last = removeSklandAccount(accounts, "account_three", "account_three");
  assert.equal(last.activeAccountId, "account_two");
});

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
