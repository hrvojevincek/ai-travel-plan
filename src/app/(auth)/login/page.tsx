import { requireGuest } from "@/features/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  await requireGuest();
  const { redirectTo } = await searchParams;
  return (
    <div>
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
