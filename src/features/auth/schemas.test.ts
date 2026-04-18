import { describe, expect, it } from "vitest";
import { SignInSchema, SignUpSchema } from "./schemas";

describe("SignInSchema", () => {
  it("accepts a valid email + password", () => {
    const parsed = SignInSchema.safeParse({
      email: "a@b.co",
      password: "hunter2",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const parsed = SignInSchema.safeParse({
      email: "not-an-email",
      password: "x",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["email"]);
    }
  });

  it("rejects an empty password", () => {
    const parsed = SignInSchema.safeParse({ email: "a@b.co", password: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].path).toEqual(["password"]);
    }
  });
});

describe("SignUpSchema", () => {
  it("accepts matching passwords", () => {
    const parsed = SignUpSchema.safeParse({
      email: "a@b.co",
      password: "p",
      confirmPassword: "p",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects mismatched passwords with a confirmPassword path error", () => {
    const parsed = SignUpSchema.safeParse({
      email: "a@b.co",
      password: "p",
      confirmPassword: "q",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) =>
        i.path.includes("confirmPassword")
      );
      expect(issue?.message).toBe("Passwords do not match");
    }
  });

  it("rejects empty confirmPassword", () => {
    const parsed = SignUpSchema.safeParse({
      email: "a@b.co",
      password: "p",
      confirmPassword: "",
    });
    expect(parsed.success).toBe(false);
  });
});
