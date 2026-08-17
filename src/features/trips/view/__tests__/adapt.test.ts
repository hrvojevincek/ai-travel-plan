import { describe, expect, it } from "vitest";
import type { AppDb } from "@/db/client";
import { user } from "@/db/schema";
import { type TestDbHandle, useTestDb } from "@/test/helpers/db";
import { createTrip, getTrip } from "../../data";
import type { CreateTripInputT } from "../../schemas";
import { tripRowToPartial } from "../adapt";

function asAppDb(handle: TestDbHandle): AppDb {
  return handle.db as unknown as AppDb;
}

describe("tripRowToPartial", () => {
  it("passes through the stored slot type instead of inferring from orderIndex", async () => {
    const handle = await useTestDb();
    const db = asAppDb(handle);
    await db.insert(user).values({ id: "u1", name: "A", email: "a@b.c" });

    const input: CreateTripInputT = {
      destination: "Lisbon",
      days: [
        {
          dayNumber: 1,
          activities: [
            { name: "Wrong slot lunch", type: "lunch", orderIndex: 1 },
          ],
        },
      ],
    };
    const { id } = await createTrip(db, input, "u1");
    const row = await getTrip(db, id);
    expect(row).not.toBeNull();
    if (!row) return;

    const partial = tripRowToPartial(row);
    expect(partial.days?.[0]?.activities?.[0]?.type).toBe("lunch");
  });
});
