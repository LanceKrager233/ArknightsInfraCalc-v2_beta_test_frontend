import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { getDatabase } from "@/server/db";
import { sendAuthEmail } from "./email";
import { configuredAdminIds, requireAuthBaseUrl, requireAuthSecret } from "./config";

function createAuth() {
  return betterAuth({
    appName: "明日方舟基建排班助手",
    baseURL: requireAuthBaseUrl(),
    secret: requireAuthSecret(),
    database: drizzleAdapter(getDatabase(), { provider: "pg" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendAuthEmail({ to: user.email, url, kind: "reset" }),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: ({ user, url }) => sendAuthEmail({ to: user.email, url, kind: "verify" }),
    },
    rateLimit: { enabled: true, storage: "database" },
    user: { deleteUser: { enabled: true } },
    plugins: [admin({ adminUserIds: [...configuredAdminIds()], defaultRole: "user" })],
  });
}

type Auth = ReturnType<typeof createAuth>;
const state = globalThis as typeof globalThis & { __aicAuth?: Auth };

export function getAuth(): Auth {
  return state.__aicAuth ??= createAuth();
}

export async function websiteSession(request: Request | Headers) {
  return getAuth().api.getSession({ headers: request instanceof Headers ? request : request.headers });
}
