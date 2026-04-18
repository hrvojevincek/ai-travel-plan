import { requireGuest } from "@/features/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export default async function Page() {
  await requireGuest();
  return (
    <div>
      <LoginForm />
    </div>
  );
}
