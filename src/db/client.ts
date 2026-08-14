import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDb = NodePgDatabase<typeof schema>;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  // Neon (and similar) can take several seconds to wake a suspended compute.
  // 2s made cache reads fail-open on the first request after idle.
  connectionTimeoutMillis: 15_000,
});

export const db = drizzle(pool, { schema });
export * as dbSchema from "./schema";
