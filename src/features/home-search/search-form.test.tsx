import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: hoisted.pushMock }),
}));

import { SearchForm } from "./search-form";

beforeEach(() => {
  hoisted.pushMock.mockReset();
});

describe("SearchForm", () => {
  it("navigates to /trip/new with the typed query params on submit", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    await user.type(screen.getByLabelText("Destination"), "Lisbon");
    await user.clear(screen.getByLabelText("Duration (days)"));
    await user.type(screen.getByLabelText("Duration (days)"), "5");
    await user.type(
      screen.getByLabelText("Preferences (optional)"),
      "vegan, no museums",
    );
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await waitFor(() => expect(hoisted.pushMock).toHaveBeenCalledTimes(1));
    const target = hoisted.pushMock.mock.calls[0][0] as string;
    const url = new URL(target, "http://localhost");
    expect(url.pathname).toBe("/trip/new");
    expect(url.searchParams.get("destination")).toBe("Lisbon");
    expect(url.searchParams.get("duration")).toBe("5");
    expect(url.searchParams.get("preferences")).toBe("vegan, no museums");
  });

  it("does not navigate when destination is empty", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(hoisted.pushMock).not.toHaveBeenCalled();
  });

  it("does not navigate when duration is 0", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);
    await user.type(screen.getByLabelText("Destination"), "Lisbon");
    await user.clear(screen.getByLabelText("Duration (days)"));
    await user.type(screen.getByLabelText("Duration (days)"), "0");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await new Promise((r) => setTimeout(r, 50));
    expect(hoisted.pushMock).not.toHaveBeenCalled();
  });

  it("submits without preferences", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);
    await user.type(screen.getByLabelText("Destination"), "Porto");
    await user.clear(screen.getByLabelText("Duration (days)"));
    await user.type(screen.getByLabelText("Duration (days)"), "2");
    await user.click(screen.getByRole("button", { name: /plan my trip/i }));

    await waitFor(() => expect(hoisted.pushMock).toHaveBeenCalledTimes(1));
    const target = hoisted.pushMock.mock.calls[0][0] as string;
    const url = new URL(target, "http://localhost");
    expect(url.searchParams.has("preferences")).toBe(false);
  });
});
