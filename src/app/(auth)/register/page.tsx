import { requireGuest } from "@/features/auth";
import { RegisterForm } from "@/features/auth/components/register-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  await requireGuest();
  const { redirectTo } = await searchParams;
  return <RegisterForm redirectTo={redirectTo} />;
}
