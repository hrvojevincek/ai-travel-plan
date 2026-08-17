import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/test/helpers/query-wrapper";

const hoisted = vi.hoisted(() => ({
  saveTrip: vi.fn(),
  push: vi.fn(),
  search: "destination=Lisbon&duration=3&mock=1",
}));

vi.mock("@/features/trips/actions", () => ({
  saveTrip: (trip: unknown, opts?: unknown) => hoisted.saveTrip(trip, opts),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: hoisted.push }),
  useSearchParams: () => new URLSearchParams(hoisted.search),
}));

vi.mock("@/features/trips/view", () => ({
  TripView: ({
    onSave,
    canSave,
    saveLabel,
  }: {
    onSave?: () => void;
    canSave?: boolean;
    saveLabel?: string;
  }) => (
    <button type="button" disabled={!canSave} onClick={onSave}>
      {saveLabel}
    </button>
  ),
}));

import { TripNewClient } from "@/app/trip/new/trip-new-client";

describe("TripNewClient save auth", () => {
  beforeEach(() => {
    hoisted.saveTrip.mockReset();
    hoisted.push.mockReset();
    hoisted.search = "destination=Lisbon&duration=3&mock=1";
  });

  it("opens a login dialog instead of navigating away when save returns UNAUTH", async () => {
    hoisted.saveTrip.mockResolvedValue({ ok: false, code: "UNAUTH" });
    const user = userEvent.setup();

    render(
      <QueryWrapper>
        <TripNewClient />
      </QueryWrapper>
    );

    await user.click(screen.getByRole("button", { name: "Save trip" }));

    expect(
      await screen.findByRole("heading", { name: "Save this trip" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(hoisted.push).not.toHaveBeenCalled();
  });

  it("lets the user switch to sign up without leaving the page", async () => {
    hoisted.saveTrip.mockResolvedValue({ ok: false, code: "UNAUTH" });
    const user = userEvent.setup();

    render(
      <QueryWrapper>
        <TripNewClient />
      </QueryWrapper>
    );

    await user.click(screen.getByRole("button", { name: "Save trip" }));
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByRole("heading", { name: "Create an account" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(hoisted.push).not.toHaveBeenCalled();
  });

  it("shows missing-details when duration is out of range", () => {
    hoisted.search = "destination=Lisbon&duration=99";
    render(
      <QueryWrapper>
        <TripNewClient />
      </QueryWrapper>
    );
    expect(
      screen.getByRole("heading", { name: "Missing trip details" })
    ).toBeInTheDocument();
  });

  it("shows missing-details when duration is absent", () => {
    hoisted.search = "destination=Lisbon";
    render(
      <QueryWrapper>
        <TripNewClient />
      </QueryWrapper>
    );
    expect(
      screen.getByRole("heading", { name: "Missing trip details" })
    ).toBeInTheDocument();
  });
});
