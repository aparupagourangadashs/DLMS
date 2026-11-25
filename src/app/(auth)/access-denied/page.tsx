import { AuthShell } from "@/components/auth/AuthShell";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Access denied", robots: { index: false } };

export default function AccessDeniedPage() {
  return (
    <AuthShell title="Access denied" description="Your role does not include this area.">
      <p className="text-sm">
        Ask an administrator if you need access, or <Link href="/auth/redirect" className="font-medium text-accent hover:underline">return to your home page</Link>.
      </p>
    </AuthShell>
  );
}
