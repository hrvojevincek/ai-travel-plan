"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { safeInternalRedirect } from "./safe-redirect";
import {
  type AuthFormValues,
  type AuthKind,
  SignInSchema,
  type SignInValues,
  SignUpSchema,
  type SignUpValues,
} from "./schemas";

export interface UseAuthFormOpts {
  redirectTo?: string;
  onSuccess?: () => void;
}

export interface UseAuthFormReturn<K extends AuthKind> {
  form: UseFormReturn<AuthFormValues<K>>;
  submit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
}

const SIGN_IN_DEFAULTS: SignInValues = { email: "", password: "" };
const SIGN_UP_DEFAULTS: SignUpValues = {
  email: "",
  password: "",
  confirmPassword: "",
};

export function useAuthForm<K extends AuthKind>(
  kind: K,
  opts: UseAuthFormOpts = {}
): UseAuthFormReturn<K> {
  const router = useRouter();
  const redirectTo = safeInternalRedirect(opts.redirectTo);

  const schema = kind === "sign-in" ? SignInSchema : SignUpSchema;
  const defaultValues =
    kind === "sign-in" ? SIGN_IN_DEFAULTS : SIGN_UP_DEFAULTS;

  const form = useForm<AuthFormValues<K>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as AuthFormValues<K>,
  });

  const submit = form.handleSubmit(async (values) => {
    const onSettled = {
      onSuccess: () => {
        opts.onSuccess?.();
        router.push(redirectTo);
      },
      onError: (ctx: { error: { message: string } }) => {
        toast.error(ctx.error.message);
      },
    };

    if (kind === "sign-in") {
      const v = values as SignInValues;
      await authClient.signIn.email(
        { email: v.email, password: v.password, callbackURL: redirectTo },
        onSettled
      );
    } else {
      const v = values as SignUpValues;
      await authClient.signUp.email(
        {
          name: v.email,
          email: v.email,
          password: v.password,
          callbackURL: redirectTo,
        },
        onSettled
      );
    }
  });

  return { form, submit, isPending: form.formState.isSubmitting };
}
