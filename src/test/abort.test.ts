import { describe, expect, it } from "vitest";
import { isAbortError } from "@/lib/abort";

describe("isAbortError", () => {
  it("matches AbortError and CancelledError names", () => {
    const abort = new Error("Aborted");
    abort.name = "AbortError";
    const cancelled = new Error("Cancelled");
    cancelled.name = "CancelledError";

    expect(isAbortError(abort)).toBe(true);
    expect(isAbortError(cancelled)).toBe(true);
    expect(isAbortError(new Error("nope"))).toBe(false);
    expect(isAbortError("Aborted")).toBe(false);
  });
});
