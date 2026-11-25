import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Choose a new password">
      {token ? <ResetPasswordForm token={token} /> : <p className="text-sm">This link is incomplete. <Link href="/forgot-password" className="font-medium text-accent hover:underline">Request a new one</Link>.</p>}
    </AuthShell>
  );
}
