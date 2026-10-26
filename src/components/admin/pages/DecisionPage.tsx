import Link from "next/link";
import { ArrowRight, Check, CircleHelp, ClipboardList, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";
import { colorFor, palette } from "@/lib/colors";
import type { NavPage, NavSection } from "@/lib/admin/navigation";
import { pageHref } from "@/lib/admin/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "../PageHeader";

export type DecisionInfo = { proposal: string[]; questions: string[] };

export function DecisionPage({ section, page, info }: { section: NavSection; page: NavPage; info: DecisionInfo }) {
  const siblings = section.pages.filter((p) => p.slug !== page.slug && p.status !== "decision").slice(0, 4);
  const color = colorFor(section.slug);
  return (
    <>
      <PageHeader title={page.label} description={page.description} status="decision" />
      <div className="admin-feature-banner mb-6 rounded-2xl border border-border">
        <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl", color.solid)} aria-hidden="true"><section.icon className="size-7" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Let&apos;s shape {page.label.toLowerCase()}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
        In the reference system this screen was empty, unavailable, marked “Coming Soon”, or a legacy page. We&apos;ll design it once IBMV
        confirms what it must do. Below is our starting proposal for discussion.
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning"><ClipboardList className="size-3.5" aria-hidden="true" />Planning only · not yet implemented</span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <div className="h-1 bg-violet-500" />
          <CardHeader className="bg-violet-50/60 dark:bg-violet-500/10" title={<span className="inline-flex items-center gap-2"><Lightbulb className="size-5 text-violet-600 dark:text-violet-300" aria-hidden="true" />Proposed capabilities</span>} description="A starting point for your review" />
          <ul className="space-y-3 p-5 text-sm">
            {info.proposal.map((p) => (
              <li key={p} className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted/40 p-3 leading-relaxed"><span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg", palette.violet.tile)} aria-hidden="true"><Check className="size-3.5" /></span><span>{p}</span></li>
            ))}
          </ul>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <div className="h-1 bg-amber-500" />
          <CardHeader className="bg-amber-50/60 dark:bg-amber-500/10" title={<span className="inline-flex items-center gap-2"><CircleHelp className="size-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />Questions for IBMV</span>} description="Decisions needed before implementation" />
          <ol className="space-y-3 p-5 text-sm">
            {info.questions.map((q, i) => (
              <li key={q} className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted/40 p-3 leading-relaxed"><span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold", palette.amber.tile)} aria-hidden="true">{i + 1}</span><span>{q}</span></li>
            ))}
          </ol>
        </Card>
      </div>
      {siblings.length ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-muted">Other {section.label.toLowerCase()} screens</h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <Link key={s.slug} href={pageHref(section.slug, s.slug)} className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl border border-current/15 px-3 py-2 text-sm font-medium hover:brightness-95", color.tile)}>
                {s.label}<ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
