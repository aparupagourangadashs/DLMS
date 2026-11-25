import { VerifyEmailForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthShell";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Verify your email" description="Confirm that this address belongs to you.">
      {token ? <VerifyEmailForm token={token} /> : <p className="text-sm">This link is incomplete. <Link href="/register" className="font-medium text-accent hover:underline">Register again</Link>.</p>}
    </AuthShell>
  );
}
