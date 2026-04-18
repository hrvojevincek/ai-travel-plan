import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("clientIp", () => {
  it("returns the first entry in x-forwarded-for when present", async () => {
    const { clientIp } = await import("./rate-limit");
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 10.0.0.1",
    });
    expect(clientIp(headers)).toBe("203.0.113.5");
  });

  it("trims whitespace around forwarded entries", async () => {
    const { clientIp } = await import("./rate-limit");
    const headers = new Headers({
      "x-forwarded-for": "  203.0.113.5  , 10.0.0.1",
    });
    expect(clientIp(headers)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when no x-forwarded-for", async () => {
    const { clientIp } = await import("./rate-limit");
    const headers = new Headers({ "x-real-ip": "198.51.100.9" });
    expect(clientIp(headers)).toBe("198.51.100.9");
  });

  it("returns 'unknown' when no ip headers are present", async () => {
    const { clientIp } = await import("./rate-limit");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("returns 'unknown' when x-real-ip is empty or whitespace-only", async () => {
    const { clientIp } = await import("./rate-limit");
    expect(clientIp(new Headers({ "x-real-ip": "" }))).toBe("unknown");
    expect(clientIp(new Headers({ "x-real-ip": "   " }))).toBe("unknown");
  });

  it("trims whitespace around x-real-ip", async () => {
    const { clientIp } = await import("./rate-limit");
    expect(clientIp(new Headers({ "x-real-ip": "  198.51.100.9  " }))).toBe(
      "198.51.100.9"
    );
  });
});

describe("checkTripGenerateLimit — no Upstash creds", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("passes through with success=true when creds are missing", async () => {
    const { checkTripGenerateLimit } = await import("./rate-limit");
    const result = await checkTripGenerateLimit("203.0.113.5");
    expect(result.success).toBe(true);
    expect(result.scope).toBeNull();
  });
});

describe("checkTripGenerateLimit — with mocked Upstash", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@upstash/redis", () => ({
      Redis: class {},
    }));
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
  });

  afterEach(() => {
    vi.doUnmock("@upstash/redis");
    vi.doUnmock("@upstash/ratelimit");
    process.env = { ...originalEnv };
  });

  it("returns success=false with scope='minute' when the minute limit fires", async () => {
    vi.doMock("@upstash/ratelimit", () => {
      class Ratelimit {
        constructor(public readonly opts: { prefix: string }) {}
        async limit(_id: string) {
          if (this.opts.prefix === "rl:generate:min") {
            return {
              success: false,
              reset: Date.now() + 30_000,
              remaining: 0,
              limit: 5,
            };
          }
          return {
            success: true,
            reset: Date.now() + 86_400_000,
            remaining: 29,
            limit: 30,
          };
        }
        static slidingWindow() {
          return "sliding";
        }
      }
      return { Ratelimit };
    });

    const { checkTripGenerateLimit } = await import("./rate-limit");
    const result = await checkTripGenerateLimit("203.0.113.5");
    expect(result.success).toBe(false);
    expect(result.scope).toBe("minute");
    expect(result.limit).toBe(5);
  });

  it("returns success=false with scope='day' when minute passes but day fires", async () => {
    vi.doMock("@upstash/ratelimit", () => {
      class Ratelimit {
        constructor(public readonly opts: { prefix: string }) {}
        async limit(_id: string) {
          if (this.opts.prefix === "rl:generate:day") {
            return {
              success: false,
              reset: Date.now() + 3600_000,
              remaining: 0,
              limit: 30,
            };
          }
          return {
            success: true,
            reset: Date.now() + 60_000,
            remaining: 4,
            limit: 5,
          };
        }
        static slidingWindow() {
          return "sliding";
        }
      }
      return { Ratelimit };
    });

    const { checkTripGenerateLimit } = await import("./rate-limit");
    const result = await checkTripGenerateLimit("203.0.113.5");
    expect(result.success).toBe(false);
    expect(result.scope).toBe("day");
    expect(result.limit).toBe(30);
  });

  it("fails open when the limiter throws (Upstash/network outage)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("@upstash/ratelimit", () => {
      class Ratelimit {
        constructor(public readonly opts: { prefix: string }) {}
        async limit(_id: string): Promise<never> {
          throw new Error("ECONNREFUSED");
        }
        static slidingWindow() {
          return "sliding";
        }
      }
      return { Ratelimit };
    });

    const { checkTripGenerateLimit } = await import("./rate-limit");
    const result = await checkTripGenerateLimit("203.0.113.5");
    expect(result.success).toBe(true);
    expect(result.scope).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("passing through"),
      expect.objectContaining({ message: "ECONNREFUSED" })
    );
    errorSpy.mockRestore();
  });

  it("returns success=true with the tighter remaining when both pass", async () => {
    vi.doMock("@upstash/ratelimit", () => {
      class Ratelimit {
        constructor(public readonly opts: { prefix: string }) {}
        async limit(_id: string) {
          return this.opts.prefix === "rl:generate:min"
            ? {
                success: true,
                reset: Date.now() + 60_000,
                remaining: 2,
                limit: 5,
              }
            : {
                success: true,
                reset: Date.now() + 86_400_000,
                remaining: 25,
                limit: 30,
              };
        }
        static slidingWindow() {
          return "sliding";
        }
      }
      return { Ratelimit };
    });

    const { checkTripGenerateLimit } = await import("./rate-limit");
    const result = await checkTripGenerateLimit("203.0.113.5");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.limit).toBe(5);
  });
});
