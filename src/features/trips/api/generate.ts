import {
  GeneratedTripResponse,
  type GeneratedTripResponseT,
} from "../generate";

export async function fetchGeneratedTrip(input: {
  destination: string;
  duration: number;
  preferences?: string;
}): Promise<GeneratedTripResponseT> {
  const res = await fetch("/api/trips/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
  } & Record<string, unknown>;

  if (!res.ok) {
    throw new Error(body.error ?? "Couldn't generate your trip.");
  }

  const parsed = GeneratedTripResponse.safeParse(body);
  if (!parsed.success) {
    throw new Error("Trip came back in an unexpected format.");
  }

  return parsed.data;
}

export type GenerateTripInput = Parameters<typeof fetchGeneratedTrip>[0];
