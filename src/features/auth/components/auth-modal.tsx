"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm, RegisterForm } from "./auth-forms";

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMode("sign-in");
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "sign-in" ? "Save this trip" : "Create an account"}
          </DialogTitle>
          <DialogDescription>
            Sign in or register to keep this itinerary. You stay on this page.
          </DialogDescription>
        </DialogHeader>
        {mode === "sign-in" ? (
          <LoginForm
            variant="bare"
            navigate={false}
            onSuccess={onSuccess}
            onSwitch={() => setMode("sign-up")}
          />
        ) : (
          <RegisterForm
            variant="bare"
            navigate={false}
            onSuccess={onSuccess}
            onSwitch={() => setMode("sign-in")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
