import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

import { requireAuthBaseUrl, requireAuthSecret } from "../src/server/auth/config.ts";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required for authentication readiness checks.");
requireAuthSecret();
requireAuthBaseUrl();
if (!process.env.RESEND_API_KEY?.trim() || !process.env.AUTH_EMAIL_FROM?.trim()) {
  throw new Error("RESEND_API_KEY and AUTH_EMAIL_FROM are required for authentication readiness checks.");
}

const expectedTables = ["account", "rateLimit", "session", "user", "verification"];
const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 5_000,
  query_timeout: 10_000,
  statement_timeout: 10_000,
});

try {
  const result = await pool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
    [expectedTables],
  );
  const found = new Set(result.rows.map((row) => row.table_name));
  const missing = expectedTables.filter((table) => !found.has(table));
  if (missing.length > 0) throw new Error(`Authentication database is missing committed tables: ${missing.join(", ")}`);
  console.log("Authentication runtime readiness check passed.");
} finally {
  await pool.end();
}
