import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function StudentHeading({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="student-page-heading mb-6 flex items-start gap-3 rounded-2xl border border-border p-5 sm:gap-4 sm:p-6">
      <span className="student-heading-icon flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"><Icon className="student-duotone-icon size-6" strokeWidth={1.8} aria-hidden="true" /></span>
      <div className="min-w-0"><h1 className="font-serif text-2xl font-semibold break-words sm:text-3xl">{title}</h1><p className="mt-1 text-sm leading-relaxed text-muted">{description}</p></div>
    </div>
  );
}

export function StudentPanel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return <section className={cn("student-panel min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-card", className)}>{title ? <h2 className="mb-4 font-serif text-xl font-semibold">{title}</h2> : null}{children}</section>;
}

export function StudentEmpty({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center"><span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon className="student-duotone-icon size-7" strokeWidth={1.8} aria-hidden="true" /></span><h2 className="text-lg font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">{description}</p></div>;
}
