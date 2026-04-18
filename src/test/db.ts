import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach } from "vitest";
import * as schema from "@/db/schema";

export type TestDb = PgliteDatabase<typeof schema>;

export interface TestDbHandle {
  db: TestDb;
  client: PGlite;
  dispose: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
  } catch (err) {
    await client.close();
    throw err;
  }
  return {
    db,
    client,
    dispose: async () => {
      await client.close();
    },
  };
}

/**
 * Test helper: creates a TestDb and registers its `dispose` in `afterEach`,
 * so callers never have to remember cleanup. Use this instead of calling
 * `createTestDb` directly inside tests.
 */
export async function useTestDb(): Promise<TestDbHandle> {
  const handle = await createTestDb();
  afterEach(handle.dispose);
  return handle;
}
