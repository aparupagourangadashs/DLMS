import { LoginForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import { safeNext } from "@/server/auth/redirect";
import { getSessionUser } from "@/server/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(safeNext(next, user.kind));
  return (
    <AuthShell title="Sign in" description="Use your IBMV account to continue.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
