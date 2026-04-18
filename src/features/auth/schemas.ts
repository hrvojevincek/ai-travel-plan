import { z } from "zod";

const email = z.email("Please enter a valid email address");
const password = z.string().min(1, "Password is required");

export const SignInSchema = z.object({
  email,
  password,
});
export type SignInValues = z.infer<typeof SignInSchema>;

export const SignUpSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type SignUpValues = z.infer<typeof SignUpSchema>;

export type AuthKind = "sign-in" | "sign-up";
export type AuthFormValues<K extends AuthKind> = K extends "sign-in"
  ? SignInValues
  : SignUpValues;
