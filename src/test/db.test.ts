import { describe, expect, it } from "vitest";
import { user } from "@/db/schema";
import { useTestDb } from "./db";

describe("test db", () => {
  it("boots PGLite, runs migrations, and round-trips a user row", async () => {
    const { db } = await useTestDb();

    const [inserted] = await db
      .insert(user)
      .values({
        id: "u_1",
        name: "Ada",
        email: "ada@example.com",
      })
      .returning();

    expect(inserted.email).toBe("ada@example.com");

    const all = await db.select().from(user);
    expect(all).toHaveLength(1);
  });

  it("isolates state across instances", async () => {
    const { db } = await useTestDb();
    const all = await db.select().from(user);
    expect(all).toHaveLength(0);
  });
});
