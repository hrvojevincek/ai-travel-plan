import "server-only";

import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { generationCache } from "@/db/schema";
import { GeneratedTripResponse, type GeneratedTripResponseT } from "./generate";

export interface CacheKeyInput {
  destination: string;
  duration: number;
  preferences?: string;
}

interface NormalizedKey {
  id: string;
  destinationKey: string;
  duration: number;
  preferencesKey: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildCacheKey(input: CacheKeyInput): NormalizedKey {
  const destinationKey = normalize(input.destination);
  const preferencesKey = normalize(input.preferences ?? "");
  const payload = `${destinationKey}|${input.duration}|${preferencesKey}`;
  const id = createHash("sha256").update(payload).digest("hex");
  return { id, destinationKey, duration: input.duration, preferencesKey };
}

export async function readCache(
  db: AppDb,
  input: CacheKeyInput
): Promise<GeneratedTripResponseT | null> {
  const key = buildCacheKey(input);
  const rows = await db
    .select({ response: generationCache.response })
    .from(generationCache)
    .where(
      and(
        eq(generationCache.destinationKey, key.destinationKey),
        eq(generationCache.duration, key.duration),
        eq(generationCache.preferencesKey, key.preferencesKey)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const parsed = GeneratedTripResponse.safeParse(row.response);
  if (!parsed.success) {
    console.warn(
      `[trip-cache] stored response failed schema parse id=${key.id} — evicting`
    );
    await db.delete(generationCache).where(eq(generationCache.id, key.id));
    return null;
  }

  await db
    .update(generationCache)
    .set({
      lastUsedAt: new Date(),
      hitCount: sql`${generationCache.hitCount} + 1`,
    })
    .where(eq(generationCache.id, key.id));

  return parsed.data;
}

export async function writeCache(
  db: AppDb,
  input: CacheKeyInput,
  response: GeneratedTripResponseT
): Promise<void> {
  const key = buildCacheKey(input);
  await db
    .insert(generationCache)
    .values({
      id: key.id,
      destinationKey: key.destinationKey,
      duration: key.duration,
      preferencesKey: key.preferencesKey,
      response,
    })
    .onConflictDoNothing({ target: generationCache.id });
}
