import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { betterAuth } from "better-auth";

const production = process.env.NODE_ENV === "production";
const configuredSecret = process.env.BETTER_AUTH_SECRET?.trim();
const configuredUrl = process.env.BETTER_AUTH_URL?.trim();

if (production && !configuredSecret) {
  throw new Error("BETTER_AUTH_SECRET must be configured in production.");
}
if (production && !configuredUrl) {
  throw new Error("BETTER_AUTH_URL must be configured in production.");
}

const databasePath = path.resolve(
  process.env.BETTER_AUTH_DB_PATH?.trim() || path.join(process.cwd(), ".local", "auth.sqlite")
);
mkdirSync(path.dirname(databasePath), { recursive: true });

const globalForAuth = globalThis as typeof globalThis & {
  __infraCalcAuthDatabase?: DatabaseSync;
};
const database = globalForAuth.__infraCalcAuthDatabase ?? new DatabaseSync(databasePath);
globalForAuth.__infraCalcAuthDatabase = database;

export const auth = betterAuth({
  appName: "可露希尔基建终端",
  baseURL: configuredUrl || "http://localhost:5174",
  secret: configuredSecret || "local-development-secret-change-before-deploying",
  database,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});
