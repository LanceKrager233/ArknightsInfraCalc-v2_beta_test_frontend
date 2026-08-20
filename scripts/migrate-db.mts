import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());
const url = process.env.DATABASE_MIGRATION_URL?.trim();
if (!url) throw new Error("DATABASE_MIGRATION_URL is required to run committed migrations.");
const pool = new Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle({ client: pool }), { migrationsFolder: "drizzle" });
  console.log("Committed database migrations applied.");
} finally {
  await pool.end();
}
