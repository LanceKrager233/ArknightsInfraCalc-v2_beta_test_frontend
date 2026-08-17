import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { URL } from "node:url";

/* global Headers, Request */

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../db/schema.ts";

const databaseUrl = process.env.AUTH_INTEGRATION_DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("AUTH_INTEGRATION_DATABASE_URL is required for the PostgreSQL authentication integration test.");

const origin = "http://auth.integration.test";
const baseURL = `${origin}/api/auth`;
const password = "integration-password-1";
const replacementPassword = "integration-password-2";

function cookieHeader(response) {
  return response.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
}

test("Better Auth completes the PostgreSQL account lifecycle", async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  await pool.query('DELETE FROM "rateLimit"');
  const emails = [];
  const auth = betterAuth({
    appName: "Authentication integration test",
    baseURL,
    secret: "integration-test-secret-at-least-32-bytes-long",
    database: drizzleAdapter(drizzle({ client: pool, schema }), { provider: "pg" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => { emails.push({ kind: "reset", to: user.email, url }); },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: ({ user, url }) => { emails.push({ kind: "verify", to: user.email, url }); },
    },
    rateLimit: { enabled: true, storage: "database" },
    plugins: [admin({ defaultRole: "user" })],
  });

  async function request(pathOrUrl, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("origin", origin);
    if (init.body) headers.set("content-type", "application/json");
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${baseURL}${pathOrUrl}`;
    return auth.handler(new Request(url, { ...init, headers }));
  }

  async function post(path, body, cookie) {
    return request(path, { method: "POST", body: JSON.stringify(body), headers: cookie ? { cookie } : undefined });
  }

  async function registerAndVerify(email) {
    const registration = await post("/sign-up/email", { name: "Integration user", email, password, callbackURL: origin });
    assert.equal(registration.status, 200, await registration.text());
    const registrationBody = await registration.json();
    assert.equal(registrationBody.user.emailVerified, false);

    const verificationEmail = emails.findLast((item) => item.kind === "verify" && item.to === email);
    assert.ok(verificationEmail, "registration should capture a verification email");
    const verification = await request(verificationEmail.url);
    assert.equal(verification.status, 302);
    assert.equal(verification.headers.get("location"), origin);
    return registrationBody.user.id;
  }

  async function signIn(email, candidatePassword = password) {
    return post("/sign-in/email", { email, password: candidatePassword });
  }

  async function expectNoSession(cookie) {
    const response = await request("/get-session", { headers: { cookie } });
    assert.equal(response.status, 200);
    assert.equal(await response.json(), null);
  }

  const suffix = `${Date.now()}-${randomUUID()}`;
  const primaryEmail = `auth-primary-${suffix}@example.test`;
  const bannedEmail = `auth-banned-${suffix}@example.test`;
  const createdUserIds = [];

  try {
    const registration = await post("/sign-up/email", { name: "Primary user", email: primaryEmail, password, callbackURL: origin });
    assert.equal(registration.status, 200, await registration.text());
    const registrationBody = await registration.json();
    createdUserIds.push(registrationBody.user.id);

    const unverifiedSignIn = await signIn(primaryEmail);
    assert.equal(unverifiedSignIn.status, 403, "unverified email must not sign in");

    const verificationEmail = emails.findLast((item) => item.kind === "verify" && item.to === primaryEmail);
    assert.ok(verificationEmail, "registration should capture a verification email");
    const verification = await request(verificationEmail.url);
    assert.equal(verification.status, 302);

    const firstSignIn = await signIn(primaryEmail);
    assert.equal(firstSignIn.status, 200, await firstSignIn.text());
    const firstCookie = cookieHeader(firstSignIn);
    assert.match(firstCookie, /session_token=/);

    const secondSignIn = await signIn(primaryEmail);
    assert.equal(secondSignIn.status, 200, await secondSignIn.text());
    const secondCookie = cookieHeader(secondSignIn);

    const revoke = await post("/revoke-sessions", {}, firstCookie);
    assert.equal(revoke.status, 200, await revoke.text());
    await expectNoSession(firstCookie);
    await expectNoSession(secondCookie);

    const passwordResetSession = await signIn(primaryEmail);
    assert.equal(passwordResetSession.status, 200, await passwordResetSession.text());
    const passwordResetCookie = cookieHeader(passwordResetSession);
    const resetRequest = await post("/request-password-reset", { email: primaryEmail, redirectTo: `${origin}/account/reset-password` });
    assert.equal(resetRequest.status, 200, await resetRequest.text());
    const resetEmail = emails.findLast((item) => item.kind === "reset" && item.to === primaryEmail);
    assert.ok(resetEmail, "password reset should capture an email");
    const resetToken = new URL(resetEmail.url).pathname.split("/").at(-1);
    assert.ok(resetToken);

    const reset = await post("/reset-password", { token: resetToken, newPassword: replacementPassword });
    assert.equal(reset.status, 200, await reset.text());
    await expectNoSession(passwordResetCookie);
    assert.equal((await signIn(primaryEmail, password)).status, 401, "old password must stop working");
    assert.equal((await signIn(primaryEmail, replacementPassword)).status, 200, "replacement password should sign in");

    const bannedUserId = await registerAndVerify(bannedEmail);
    createdUserIds.push(bannedUserId);
    const bannedSession = await signIn(bannedEmail);
    assert.equal(bannedSession.status, 200, await bannedSession.text());
    const bannedCookie = cookieHeader(bannedSession);
    await pool.query('UPDATE "user" SET banned = true, ban_reason = $1, updated_at = now() WHERE id = $2', ["integration test", bannedUserId]);
    await pool.query('DELETE FROM "session" WHERE user_id = $1', [bannedUserId]);
    await expectNoSession(bannedCookie);
    assert.equal((await signIn(bannedEmail)).status, 403, "banned user must not create a session");
    const persistedRateLimits = await pool.query('SELECT count(*)::int AS count FROM "rateLimit"');
    assert.ok(persistedRateLimits.rows[0].count > 0, "Better Auth rate limits should be stored in PostgreSQL");
  } finally {
    if (createdUserIds.length > 0) await pool.query('DELETE FROM "user" WHERE id = ANY($1::text[])', [createdUserIds]);
    await pool.query('DELETE FROM "rateLimit"');
    await pool.end();
  }
});
