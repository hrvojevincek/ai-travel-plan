import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  pushMock: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: (input: unknown, cb: unknown) => hoisted.signInEmail(input, cb),
    },
    signUp: {
      email: (input: unknown, cb: unknown) => hoisted.signUpEmail(input, cb),
    },
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: hoisted.pushMock }),
}));

vi.mock("sonner", () => ({
  toast: { error: hoisted.toastError },
}));

import { type UseAuthFormOpts, useAuthForm } from "./client";

function SignInHarness(props: UseAuthFormOpts = {}) {
  const { form, submit, isPending } = useAuthForm("sign-in", props);
  return (
    <form onSubmit={submit}>
      <input aria-label="email" {...form.register("email")} />
      <input
        aria-label="password"
        type="password"
        {...form.register("password")}
      />
      <button type="submit" disabled={isPending}>
        Submit
      </button>
    </form>
  );
}

function SignUpHarness(props: UseAuthFormOpts = {}) {
  const { form, submit } = useAuthForm("sign-up", props);
  return (
    <form onSubmit={submit}>
      <input aria-label="email" {...form.register("email")} />
      <input
        aria-label="password"
        type="password"
        {...form.register("password")}
      />
      <input
        aria-label="confirm"
        type="password"
        {...form.register("confirmPassword")}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

function typeAndSubmit() {
  return userEvent.setup();
}

beforeEach(() => {
  hoisted.signInEmail.mockReset();
  hoisted.signUpEmail.mockReset();
  hoisted.pushMock.mockReset();
  hoisted.toastError.mockReset();
});

describe("useAuthForm('sign-in')", () => {
  it("calls authClient.signIn.email with typed credentials and default callbackURL", async () => {
    hoisted.signInEmail.mockImplementation(async (_input, cb) => {
      await cb.onSuccess?.();
    });

    const user = typeAndSubmit();
    render(<SignInHarness />);
    await user.type(screen.getByLabelText("email"), "ada@example.com");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(hoisted.signInEmail).toHaveBeenCalledTimes(1));
    expect(hoisted.signInEmail.mock.calls[0][0]).toEqual({
      email: "ada@example.com",
      password: "hunter2",
      callbackURL: "/",
    });
  });

  it("pushes the router to the default route on success", async () => {
    hoisted.signInEmail.mockImplementation(async (_input, cb) => {
      await cb.onSuccess?.();
    });

    const user = typeAndSubmit();
    render(<SignInHarness />);
    await user.type(screen.getByLabelText("email"), "ada@example.com");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(hoisted.pushMock).toHaveBeenCalledWith("/"));
  });

  it("honors redirectTo option for both callbackURL and router.push", async () => {
    hoisted.signInEmail.mockImplementation(async (_input, cb) => {
      await cb.onSuccess?.();
    });

    const user = typeAndSubmit();
    render(<SignInHarness redirectTo="/dashboard" />);
    await user.type(screen.getByLabelText("email"), "ada@example.com");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(hoisted.signInEmail).toHaveBeenCalledTimes(1));
    expect(hoisted.signInEmail.mock.calls[0][0].callbackURL).toBe("/dashboard");
    await waitFor(() =>
      expect(hoisted.pushMock).toHaveBeenCalledWith("/dashboard")
    );
  });

  it("shows a toast error and does not navigate on sign-in failure", async () => {
    hoisted.signInEmail.mockImplementation(async (_input, cb) => {
      await cb.onError?.({ error: { message: "invalid credentials" } });
    });

    const user = typeAndSubmit();
    render(<SignInHarness />);
    await user.type(screen.getByLabelText("email"), "ada@example.com");
    await user.type(screen.getByLabelText("password"), "wrong");
    await user.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(hoisted.toastError).toHaveBeenCalledWith("invalid credentials")
    );
    expect(hoisted.pushMock).not.toHaveBeenCalled();
  });

  it("does not call authClient when validation fails (invalid email)", async () => {
    const user = typeAndSubmit();
    render(<SignInHarness />);
    await user.type(screen.getByLabelText("email"), "not-an-email");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.click(screen.getByRole("button"));

    await new Promise((r) => setTimeout(r, 50));
    expect(hoisted.signInEmail).not.toHaveBeenCalled();
  });

  it("calls opts.onSuccess before router.push", async () => {
    const order: string[] = [];
    hoisted.pushMock.mockImplementation(() => order.push("push"));
    hoisted.signInEmail.mockImplementation(async (_input, cb) => {
      await cb.onSuccess?.();
    });
    const onSuccess = vi.fn(() => order.push("onSuccess"));

    const user = typeAndSubmit();
    render(<SignInHarness onSuccess={onSuccess} />);
    await user.type(screen.getByLabelText("email"), "ada@example.com");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(hoisted.pushMock).toHaveBeenCalled());
    expect(order).toEqual(["onSuccess", "push"]);
  });
});

describe("useAuthForm('sign-up')", () => {
  it("calls authClient.signUp.email with name=email, email, password, callbackURL", async () => {
    hoisted.signUpEmail.mockImplementation(async (_input, cb) => {
      await cb.onSuccess?.();
    });

    const user = typeAndSubmit();
    render(<SignUpHarness />);
    await user.type(screen.getByLabelText("email"), "new@example.com");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.type(screen.getByLabelText("confirm"), "hunter2");
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(hoisted.signUpEmail).toHaveBeenCalledTimes(1));
    expect(hoisted.signUpEmail.mock.calls[0][0]).toEqual({
      name: "new@example.com",
      email: "new@example.com",
      password: "hunter2",
      callbackURL: "/",
    });
  });

  it("does not call authClient when passwords do not match", async () => {
    const user = typeAndSubmit();
    render(<SignUpHarness />);
    await user.type(screen.getByLabelText("email"), "new@example.com");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.type(screen.getByLabelText("confirm"), "typoed");
    await user.click(screen.getByRole("button"));

    await new Promise((r) => setTimeout(r, 50));
    expect(hoisted.signUpEmail).not.toHaveBeenCalled();
  });

  it("surfaces server errors via toast on sign-up failure", async () => {
    hoisted.signUpEmail.mockImplementation(async (_input, cb) => {
      await cb.onError?.({ error: { message: "email already exists" } });
    });

    const user = typeAndSubmit();
    render(<SignUpHarness />);
    await user.type(screen.getByLabelText("email"), "dup@example.com");
    await user.type(screen.getByLabelText("password"), "hunter2");
    await user.type(screen.getByLabelText("confirm"), "hunter2");
    await user.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(hoisted.toastError).toHaveBeenCalledWith("email already exists")
    );
    expect(hoisted.pushMock).not.toHaveBeenCalled();
  });
});
