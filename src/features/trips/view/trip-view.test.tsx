import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PartialTrip } from "./trip-view";
import { TripView } from "./trip-view";

vi.mock("@/features/maps", () => ({
  TripMap: () => <div data-testid="trip-map">Trip map</div>,
}));

const tripFixture: PartialTrip = {
  destination: "Lisbon",
  summary: "3-day plan",
  days: [
    {
      dayNumber: 1,
      activities: [
        {
          id: "a1",
          name: "Pastéis de Belém",
          type: "breakfast",
          durationMinutes: 30,
        },
      ],
    },
    {
      dayNumber: 2,
      activities: [
        {
          id: "a2",
          name: "Time Out Market",
          type: "lunch",
          durationMinutes: 60,
        },
      ],
    },
    {
      dayNumber: 3,
      activities: [
        {
          id: "a3",
          name: "Miradouro da Senhora do Monte",
          type: "activity",
          durationMinutes: 45,
        },
      ],
    },
  ],
};

describe("TripView day tabs", () => {
  it("shows Day 1 content by default", () => {
    render(<TripView trip={tripFixture} expectedDays={3} destination="Lisbon" />);

    expect(
      screen.getByRole("tab", { name: "Day 1", selected: true })
    ).toBeInTheDocument();
    expect(screen.getByText("pastéis de belém")).toBeInTheDocument();
    expect(screen.queryByText("time out market")).not.toBeInTheDocument();
  });

  it("switches visible itinerary content when another day tab is clicked", async () => {
    const user = userEvent.setup();
    render(<TripView trip={tripFixture} expectedDays={3} destination="Lisbon" />);

    await user.click(screen.getByRole("tab", { name: "Day 2" }));
    expect(
      screen.getByRole("tab", { name: "Day 2", selected: true })
    ).toBeInTheDocument();
    expect(screen.getByText("time out market")).toBeInTheDocument();
    expect(screen.queryByText("pastéis de belém")).not.toBeInTheDocument();
  });
});
