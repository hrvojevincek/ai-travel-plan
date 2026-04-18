import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type Session = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export async function getSession(): Promise<Session | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ?? null;
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireGuest(): Promise<void> {
  const session = await getSession();
  if (session) redirect("/");
}
