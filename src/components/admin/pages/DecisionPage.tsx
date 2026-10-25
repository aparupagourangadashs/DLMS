import Link from "next/link";
import { CircleHelp, Lightbulb } from "lucide-react";
import type { NavPage, NavSection } from "@/lib/admin/navigation";
import { pageHref } from "@/lib/admin/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "../PageHeader";

export type DecisionInfo = { proposal: string[]; questions: string[] };

export function DecisionPage({ section, page, info }: { section: NavSection; page: NavPage; info: DecisionInfo }) {
  const siblings = section.pages.filter((p) => p.slug !== page.slug && p.status !== "decision").slice(0, 4);
  return (
    <>
      <PageHeader title={page.label} description={page.description} status="decision" />
      <p className="mb-6 max-w-3xl rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
        In the reference system this screen was empty, unavailable, marked “Coming Soon”, or a legacy page. We&apos;ll design it once IBMV
        confirms what it must do. Below is our starting proposal for discussion.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Lightbulb className="size-4 text-gold-strong" aria-hidden="true" />Proposed capabilities</span>} />
          <ul className="list-disc space-y-2 px-5 py-4 pl-10 text-sm">
            {info.proposal.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><CircleHelp className="size-4 text-accent" aria-hidden="true" />Questions for IBMV</span>} />
          <ol className="list-decimal space-y-2 px-5 py-4 pl-10 text-sm">
            {info.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </Card>
      </div>
      {siblings.length ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-muted">Other {section.label.toLowerCase()} screens</h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <Link key={s.slug} href={pageHref(section.slug, s.slug)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:bg-accent-soft">
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
