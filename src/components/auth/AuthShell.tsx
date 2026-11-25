import { Logo } from "@/components/Logo";
import { siteConfig } from "@/lib/site";
import Link from "next/link";

export function AuthShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-3 font-serif text-xl font-semibold">
        <Logo size={44} decorative />
        {siteConfig.name}
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 mb-6 text-sm text-muted">{description}</p> : <div className="mb-6" />}
        {children}
      </div>
    </main>
  );
}
