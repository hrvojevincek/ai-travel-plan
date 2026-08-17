import { describe, expect, it } from "vitest";
import {
  GENERATE_REQUEST_LIMITS,
  parse,
  toSearchParams,
} from "@/features/trips/generate-request";

describe("parse", () => {
  it("accepts a valid generate request", () => {
    const result = parse({
      destination: "Lisbon",
      duration: 3,
      preferences: "vegan",
    });
    expect(result).toEqual({
      ok: true,
      request: {
        destination: "Lisbon",
        duration: 3,
        preferences: "vegan",
      },
    });
  });

  it("parses form bags and URL search params the same way", () => {
    const bag = parse({
      destination: "Porto",
      duration: 5,
      preferences: "no museums",
    });
    const url = parse(
      new URLSearchParams("destination=Porto&duration=5&preferences=no+museums")
    );
    expect(bag).toEqual(url);
  });

  it("trims destination and preferences", () => {
    const result = parse({
      destination: "  Lisbon  ",
      duration: 3,
      preferences: "  vegan  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.destination).toBe("Lisbon");
      expect(result.request.preferences).toBe("vegan");
    }
  });

  it("coerces a string duration", () => {
    const result = parse({ destination: "Lisbon", duration: "5" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.duration).toBe(5);
  });

  it("omits empty and whitespace-only preferences", () => {
    const missing = parse({ destination: "Lisbon", duration: 3 });
    const empty = parse({
      destination: "Lisbon",
      duration: 3,
      preferences: "",
    });
    const blank = parse({
      destination: "Lisbon",
      duration: 3,
      preferences: "   ",
    });
    expect(missing).toEqual(empty);
    expect(empty).toEqual(blank);
    if (missing.ok) expect(missing.request.preferences).toBeUndefined();
  });

  it("ignores place coords", () => {
    const result = parse({
      destination: "Lisbon",
      duration: 3,
      placeId: "ChIJxx",
      destinationLat: 38.7,
      destinationLng: -9.1,
      lat: 38.7,
      lng: -9.1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request).toEqual({ destination: "Lisbon", duration: 3 });
    }
  });

  it("rejects empty or whitespace destination", () => {
    expect(parse({ destination: "", duration: 3 }).ok).toBe(false);
    expect(parse({ destination: "   ", duration: 3 }).ok).toBe(false);
  });

  it.each([0, -1, 31, 1.5, Number.NaN])("rejects duration %p", (duration) => {
    expect(parse({ destination: "Lisbon", duration }).ok).toBe(false);
  });

  it("rejects a missing duration instead of defaulting", () => {
    expect(parse({ destination: "Lisbon" }).ok).toBe(false);
    expect(parse(new URLSearchParams("destination=Lisbon")).ok).toBe(false);
  });

  it("rejects a destination longer than 100 characters", () => {
    expect(parse({ destination: "L".repeat(101), duration: 3 }).ok).toBe(false);
  });

  it("rejects preferences longer than 500 characters", () => {
    expect(
      parse({
        destination: "Lisbon",
        duration: 3,
        preferences: "x".repeat(501),
      }).ok
    ).toBe(false);
  });
});

describe("toSearchParams", () => {
  it("writes destination and duration, omitting empty preferences", () => {
    const parsed = parse({ destination: "Lisbon", duration: 3 });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const params = toSearchParams(parsed.request);
    expect(params.get("destination")).toBe("Lisbon");
    expect(params.get("duration")).toBe("3");
    expect(params.has("preferences")).toBe(false);
  });

  it("includes preferences when set", () => {
    const parsed = parse({
      destination: "Lisbon",
      duration: 3,
      preferences: "vegan",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(toSearchParams(parsed.request).get("preferences")).toBe("vegan");
  });
});

describe("GENERATE_REQUEST_LIMITS", () => {
  it("is the same ceiling parse enforces", () => {
    expect(
      parse({
        destination: "Lisbon",
        duration: GENERATE_REQUEST_LIMITS.maxDurationDays,
      }).ok
    ).toBe(true);
    expect(
      parse({
        destination: "Lisbon",
        duration: GENERATE_REQUEST_LIMITS.maxDurationDays + 1,
      }).ok
    ).toBe(false);
  });
});
