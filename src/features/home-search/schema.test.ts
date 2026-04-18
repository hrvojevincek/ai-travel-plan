import { describe, expect, it } from "vitest";
import { buildTripNewHref, SearchFormSchema } from "./schema";

describe("SearchFormSchema", () => {
  it("accepts valid input", () => {
    const parsed = SearchFormSchema.safeParse({
      destination: "Lisbon",
      duration: 3,
      preferences: "vegan",
    });
    expect(parsed.success).toBe(true);
  });

  it("coerces a string duration to a number", () => {
    const parsed = SearchFormSchema.safeParse({
      destination: "Lisbon",
      duration: "5",
      preferences: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.duration).toBe(5);
  });

  it("rejects empty destination", () => {
    const parsed = SearchFormSchema.safeParse({
      destination: "",
      duration: 3,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects destination that is only whitespace", () => {
    const parsed = SearchFormSchema.safeParse({
      destination: "   ",
      duration: 3,
    });
    expect(parsed.success).toBe(false);
  });

  it.each([0, -1, 31, 1.5])("rejects duration %p", (duration) => {
    const parsed = SearchFormSchema.safeParse({
      destination: "Lisbon",
      duration,
    });
    expect(parsed.success).toBe(false);
  });

  it("treats missing preferences as empty string", () => {
    const parsed = SearchFormSchema.safeParse({
      destination: "Lisbon",
      duration: 3,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.preferences).toBe("");
  });
});

describe("buildTripNewHref", () => {
  it("includes destination, duration, and preferences when set", () => {
    const href = buildTripNewHref({
      destination: "Lisbon",
      duration: 3,
      preferences: "vegan",
    });
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/trip/new");
    expect(url.searchParams.get("destination")).toBe("Lisbon");
    expect(url.searchParams.get("duration")).toBe("3");
    expect(url.searchParams.get("preferences")).toBe("vegan");
  });

  it("omits preferences when empty", () => {
    const href = buildTripNewHref({
      destination: "Lisbon",
      duration: 3,
      preferences: "",
    });
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.has("preferences")).toBe(false);
  });

  it("url-encodes values with spaces and special characters", () => {
    const href = buildTripNewHref({
      destination: "São Paulo",
      duration: 7,
      preferences: "no museums, vegan & gluten-free",
    });
    const url = new URL(href, "http://localhost");
    expect(url.searchParams.get("destination")).toBe("São Paulo");
    expect(url.searchParams.get("preferences")).toBe(
      "no museums, vegan & gluten-free",
    );
    expect(href).toContain("S%C3%A3o+Paulo");
  });
});
