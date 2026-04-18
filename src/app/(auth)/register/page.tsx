import { requireGuest } from "@/features/auth";
import { RegisterForm } from "@/features/auth/components/register-form";

export default async function Page() {
  await requireGuest();
  return <RegisterForm />;
}
