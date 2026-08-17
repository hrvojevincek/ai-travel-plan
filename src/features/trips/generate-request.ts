import { z } from "zod";

export const GENERATE_REQUEST_LIMITS = {
  maxDestinationLength: 100,
  minDurationDays: 1,
  maxDurationDays: 30,
  maxPreferencesLength: 500,
} as const;

declare class GenerateRequestBrand {
  private brand: undefined;
}

export type GenerateRequest = {
  readonly destination: string;
  readonly duration: number;
  readonly preferences?: string;
} & GenerateRequestBrand;

export type GenerateRequestField = "destination" | "duration" | "preferences";

export type ParseFailure = {
  ok: false;
  issues: Partial<Record<GenerateRequestField, string>>;
};

export type ParseSuccess = {
  ok: true;
  request: GenerateRequest;
};

export type ParseResult = ParseSuccess | ParseFailure;

const destinationField = z
  .string()
  .trim()
  .min(1, "Where are you going?")
  .max(GENERATE_REQUEST_LIMITS.maxDestinationLength, "Destination is too long");

const durationField = z.coerce
  .number({ error: "Duration is required" })
  .int("Duration must be a whole number")
  .min(GENERATE_REQUEST_LIMITS.minDurationDays, "At least 1 day")
  .max(
    GENERATE_REQUEST_LIMITS.maxDurationDays,
    `Max ${GENERATE_REQUEST_LIMITS.maxDurationDays} days`
  );

const preferencesField = z
  .string()
  .trim()
  .max(
    GENERATE_REQUEST_LIMITS.maxPreferencesLength,
    "Preferences are too long"
  );

export const GenerateRequestSchema = z.object({
  destination: destinationField,
  duration: durationField,
  preferences: preferencesField.optional(),
});

function isSearchParams(
  source: unknown
): source is { get(name: string): string | null } {
  return (
    typeof source === "object" &&
    source !== null &&
    typeof (source as { get?: unknown }).get === "function"
  );
}

function toBag(source: unknown): unknown {
  if (isSearchParams(source)) {
    return {
      destination: source.get("destination") ?? undefined,
      duration: source.get("duration") ?? undefined,
      preferences: source.get("preferences") ?? undefined,
    };
  }
  if (typeof source === "object" && source !== null && !Array.isArray(source)) {
    const o = source as Record<string, unknown>;
    return {
      destination: o.destination,
      duration: o.duration,
      preferences: o.preferences,
    };
  }
  return source;
}

function issuesFrom(error: z.ZodError): ParseFailure["issues"] {
  const issues: ParseFailure["issues"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      (key === "destination" || key === "duration" || key === "preferences") &&
      issues[key] == null
    ) {
      issues[key] = issue.message;
    }
  }
  return issues;
}

function mint(data: {
  destination: string;
  duration: number;
  preferences?: string;
}): GenerateRequest {
  return {
    destination: data.destination,
    duration: data.duration,
    ...(data.preferences ? { preferences: data.preferences } : {}),
  } as GenerateRequest;
}

export function parse(source: unknown): ParseResult {
  const result = GenerateRequestSchema.safeParse(toBag(source));
  if (!result.success) {
    return { ok: false, issues: issuesFrom(result.error) };
  }
  const preferences = result.data.preferences;
  return {
    ok: true,
    request: mint({
      destination: result.data.destination,
      duration: result.data.duration,
      preferences:
        preferences && preferences.length > 0 ? preferences : undefined,
    }),
  };
}

export function toSearchParams(request: GenerateRequest): URLSearchParams {
  const params = new URLSearchParams();
  params.set("destination", request.destination);
  params.set("duration", String(request.duration));
  if (request.preferences) params.set("preferences", request.preferences);
  return params;
}
