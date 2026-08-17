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
import { websiteAdminAccess } from "./admin-access.ts";

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

  let requestAddress = 1;
  async function request(pathOrUrl, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("origin", origin);
    headers.set("x-forwarded-for", `192.0.2.${requestAddress++}`);
    if (init.body) headers.set("content-type", "application/json");
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${baseURL}${pathOrUrl}`;
    return auth.handler(new Request(url, { ...init, headers }));
  }

  async function post(path, body, cookie) {
    return request(path, { method: "POST", body: JSON.stringify(body), headers: cookie ? { cookie } : undefined });
  }

  async function registerAndVerify(email) {
    const registration = await post("/sign-up/email", { name: "Integration user", email, password, callbackURL: origin });
    assert.equal(registration.status, 200, await registration.clone().text());
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
  const delegatedAdminEmail = `auth-admin-${suffix}@example.test`;
  const bannedEmail = `auth-banned-${suffix}@example.test`;
  const createdUserIds = [];

  try {
    const registration = await post("/sign-up/email", { name: "Primary user", email: primaryEmail, password, callbackURL: origin });
    assert.equal(registration.status, 200, await registration.clone().text());
    const registrationBody = await registration.json();
    const primaryUserId = registrationBody.user.id;
    createdUserIds.push(primaryUserId);

    const unverifiedSignIn = await signIn(primaryEmail);
    assert.equal(unverifiedSignIn.status, 403, "unverified email must not sign in");

    const verificationEmail = emails.findLast((item) => item.kind === "verify" && item.to === primaryEmail);
    assert.ok(verificationEmail, "registration should capture a verification email");
    const verification = await request(verificationEmail.url);
    assert.equal(verification.status, 302);

    const firstSignIn = await signIn(primaryEmail);
    assert.equal(firstSignIn.status, 200, await firstSignIn.clone().text());
    const firstCookie = cookieHeader(firstSignIn);
    assert.match(firstCookie, /session_token=/);

    const secondSignIn = await signIn(primaryEmail);
    assert.equal(secondSignIn.status, 200, await secondSignIn.clone().text());
    const secondCookie = cookieHeader(secondSignIn);

    const revoke = await post("/revoke-sessions", {}, firstCookie);
    assert.equal(revoke.status, 200, await revoke.clone().text());
    await expectNoSession(firstCookie);
    await expectNoSession(secondCookie);

    const passwordResetSession = await signIn(primaryEmail);
    assert.equal(passwordResetSession.status, 200, await passwordResetSession.clone().text());
    const passwordResetCookie = cookieHeader(passwordResetSession);
    const resetRequest = await post("/request-password-reset", { email: primaryEmail, redirectTo: `${origin}/account/reset-password` });
    assert.equal(resetRequest.status, 200, await resetRequest.clone().text());
    const resetEmail = emails.findLast((item) => item.kind === "reset" && item.to === primaryEmail);
    assert.ok(resetEmail, "password reset should capture an email");
    const resetToken = new URL(resetEmail.url).pathname.split("/").at(-1);
    assert.ok(resetToken);

    const reset = await post("/reset-password", { token: resetToken, newPassword: replacementPassword });
    assert.equal(reset.status, 200, await reset.clone().text());
    await expectNoSession(passwordResetCookie);
    assert.equal((await signIn(primaryEmail, password)).status, 401, "old password must stop working");
    assert.equal((await signIn(primaryEmail, replacementPassword)).status, 200, "replacement password should sign in");

    const delegatedAdminId = await registerAndVerify(delegatedAdminEmail);
    createdUserIds.push(delegatedAdminId);
    const bootstrapIds = new Set([primaryUserId]);
    const defaultRole = await pool.query('SELECT role FROM "user" WHERE id = $1', [delegatedAdminId]);
    assert.equal(websiteAdminAccess(delegatedAdminId, defaultRole.rows[0].role, bootstrapIds).isAdmin, false);
    await pool.query('UPDATE "user" SET role = $1, updated_at = now() WHERE id = $2', ["admin", delegatedAdminId]);
    const grantedRole = await pool.query('SELECT role FROM "user" WHERE id = $1', [delegatedAdminId]);
    const delegatedAccess = websiteAdminAccess(delegatedAdminId, grantedRole.rows[0].role, bootstrapIds);
    assert.equal(delegatedAccess.isAdmin, true, "database admin role should grant administrator access");
    assert.equal(delegatedAccess.canManageAdminRoles, false, "delegated administrators must not grant roles");
    await pool.query('UPDATE "user" SET role = $1, updated_at = now() WHERE id = $2', ["user", delegatedAdminId]);
    const revokedRole = await pool.query('SELECT role FROM "user" WHERE id = $1', [delegatedAdminId]);
    assert.equal(websiteAdminAccess(delegatedAdminId, revokedRole.rows[0].role, bootstrapIds).isAdmin, false, "revoked role should remove access immediately");

    const bannedUserId = await registerAndVerify(bannedEmail);
    createdUserIds.push(bannedUserId);
    const bannedSession = await signIn(bannedEmail);
    assert.equal(bannedSession.status, 200, await bannedSession.clone().text());
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
