"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { type UseAuthFormOpts, useAuthForm } from "@/features/auth/client";

export interface AuthFormLayoutProps extends UseAuthFormOpts {
  /** Dialogs omit the Card chrome; dedicated pages keep it. */
  variant?: "card" | "bare";
  onSwitch?: () => void;
}

function SwitchLink({
  prompt,
  action,
  href,
  onSwitch,
}: {
  prompt: string;
  action: string;
  href: string;
  onSwitch?: () => void;
}) {
  return (
    <div className="text-center text-sm">
      {prompt}{" "}
      {onSwitch ? (
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={onSwitch}
        >
          {action}
        </button>
      ) : (
        <Link href={href} className="underline underline-offset-4">
          {action}
        </Link>
      )}
    </div>
  );
}

function Shell({
  variant,
  title,
  description,
  children,
}: {
  variant: "card" | "bare";
  title: string;
  description: string;
  children: ReactNode;
}) {
  if (variant === "bare") return children;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

export function LoginForm({
  redirectTo,
  onSuccess,
  navigate,
  variant = "card",
  onSwitch,
}: AuthFormLayoutProps = {}) {
  const { form, submit, isPending } = useAuthForm("sign-in", {
    redirectTo,
    onSuccess,
    navigate,
  });

  return (
    <Shell
      variant={variant}
      title="Welcome back"
      description="Login to continue"
    >
      <Form {...form}>
        <form onSubmit={submit}>
          <div className="grid gap-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Email" type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="********" type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              Login
            </Button>
            <SwitchLink
              prompt="Don't have an account?"
              action="Sign up"
              href="/register"
              onSwitch={onSwitch}
            />
          </div>
        </form>
      </Form>
    </Shell>
  );
}

export function RegisterForm({
  redirectTo,
  onSuccess,
  navigate,
  variant = "card",
  onSwitch,
}: AuthFormLayoutProps = {}) {
  const { form, submit, isPending } = useAuthForm("sign-up", {
    redirectTo,
    onSuccess,
    navigate,
  });

  return (
    <Shell
      variant={variant}
      title="Get started"
      description="Create your account to get started"
    >
      <Form {...form}>
        <form onSubmit={submit}>
          <div className="grid gap-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Email" type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="********" type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="********" type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              Sign up
            </Button>
            <SwitchLink
              prompt="Already have an account?"
              action="Login"
              href="/login"
              onSwitch={onSwitch}
            />
          </div>
        </form>
      </Form>
    </Shell>
  );
}
