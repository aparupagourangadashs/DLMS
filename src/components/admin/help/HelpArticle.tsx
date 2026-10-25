import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleHelp, Info, Lightbulb, Link2, ListChecks, Monitor, TextCursorInput, Users } from "lucide-react";
import type { HelpArticleData } from "@/lib/admin/help";
import { HELP_HOME, helpHref, pageHref, statusLabel, type ScreenStatus } from "@/lib/admin/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RichText } from "./RichText";

const statusTone = { ready: "success", proposed: "info", decision: "warning" } as const;

const statusNote: Record<ScreenStatus, string> = {
  ready: "This screen follows the fields and controls observed in the specification. It currently uses sample data; saving to the database arrives with the backend phase.",
  proposed: "The specification listed this menu item but not its contents, so the layout and fields are our proposal. Please review them and tell us what to change.",
  decision: "What this screen must do is still to be agreed with IBMV. Once the questions above are answered, we'll design the screen and update this help article.",
};

function Section({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="mb-3 flex items-center gap-2 text-xl font-semibold">
        <span className="text-accent" aria-hidden="true">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function HelpArticle({ data }: { data: HelpArticleData }) {
  const { section, page } = data;
  const toc = [
    { id: "purpose", label: "What this page is for" },
    ...(data.screen.length ? [{ id: "screen", label: "What's on the screen" }] : []),
    ...(data.tasks.length ? [{ id: "tasks", label: "How to…" }] : []),
    ...(data.formFields.length ? [{ id: "fields", label: "Form fields" }] : []),
    ...(data.decision ? [{ id: "decision", label: "Proposal and open questions" }] : []),
    ...(data.tips.length ? [{ id: "tips", label: "Tips" }] : []),
    { id: "status", label: "About this screen" },
    ...(data.related.length ? [{ id: "related", label: "Related pages" }] : []),
  ];

  return (
    <article>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-wide text-accent uppercase">Help · {section.label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{page.label}</h1>
            <Badge tone={statusTone[page.status]}>{statusLabel[page.status]}</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-muted">{page.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={HELP_HOME} className={buttonClass("secondary")}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            All help topics
          </Link>
          <Link href={pageHref(section.slug, page.slug)} className={buttonClass("primary")}>
            Open {page.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1fr_220px]">
        <div className="flex min-w-0 flex-col gap-10">
          <Section id="purpose" title="What this page is for" icon={<CircleHelp className="size-5" />}>
            <p className="max-w-3xl leading-relaxed">{data.summary}</p>
            {data.whoUses ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-muted">
                <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-foreground">Who uses it:</strong> {data.whoUses}
                </span>
              </p>
            ) : null}
          </Section>

          {data.screen.length ? (
            <Section id="screen" title="What's on the screen" icon={<Monitor className="size-5" />}>
              <div className="grid gap-3 md:grid-cols-2">
                {data.screen.map((group) => (
                  <Card key={group.heading} className="p-4">
                    <h3 className="mb-2 text-sm font-semibold">{group.heading}</h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <li key={item} className="rounded-full border border-border bg-surface-muted/60 px-2.5 py-1 text-xs">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </Section>
          ) : null}

          {data.tasks.length ? (
            <Section id="tasks" title="How to…" icon={<ListChecks className="size-5" />}>
              <div className="flex flex-col gap-3">
                {data.tasks.map((task) => (
                  <Card key={task.title} className="p-5">
                    <h3 className="mb-3 font-semibold">{task.title}</h3>
                    <ol className="flex flex-col gap-2.5">
                      {task.steps.map((step, j) => (
                        <li key={j} className="flex gap-3 text-sm leading-relaxed">
                          <span
                            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
                            aria-hidden="true"
                          >
                            {j + 1}
                          </span>
                          <span className="pt-0.5">
                            <RichText text={step} />
                          </span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                ))}
              </div>
            </Section>
          ) : null}

          {data.formFields.length ? (
            <Section id="fields" title="Form fields" icon={<TextCursorInput className="size-5" />}>
              <Card className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Fields in the {page.label} form</caption>
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/60 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                      <th scope="col" className="px-4 py-3">Field</th>
                      <th scope="col" className="px-4 py-3">Required</th>
                      <th scope="col" className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.formFields.map((f) => (
                      <tr key={f.label} className="border-b border-border last:border-0">
                        <th scope="row" className="px-4 py-3 text-left font-medium">
                          {f.label}
                        </th>
                        <td className="px-4 py-3">{f.required ? <Badge tone="accent">Required</Badge> : <span className="text-muted">Optional</span>}</td>
                        <td className="px-4 py-3 text-muted">{f.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </Section>
          ) : null}

          {data.decision ? (
            <Section id="decision" title="Proposal and open questions" icon={<Lightbulb className="size-5" />}>
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-2 font-semibold">What we propose</h3>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm">
                    {data.decision.proposal.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-5">
                  <h3 className="mb-2 font-semibold">Questions for IBMV</h3>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                    {data.decision.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </Card>
              </div>
            </Section>
          ) : null}

          {data.tips.length ? (
            <Section id="tips" title="Tips" icon={<Lightbulb className="size-5" />}>
              <ul className="flex flex-col gap-2">
                {data.tips.map((tip) => (
                  <li key={tip} className="rounded-xl border border-gold/40 bg-gold-soft px-4 py-3 text-sm leading-relaxed">
                    <RichText text={tip} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section id="status" title="About this screen" icon={<Info className="size-5" />}>
            <p className="max-w-3xl text-sm leading-relaxed text-muted">{statusNote[page.status]}</p>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Shortcut: press <kbd className="rounded border border-border px-1.5 text-xs">?</kbd> on any admin page to open its help.
            </p>
          </Section>

          {data.related.length ? (
            <Section id="related" title="Related pages" icon={<Link2 className="size-5" />}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.related.map((r) => (
                  <li key={`${r.section.slug}/${r.page.slug}`}>
                    <Card className="flex h-full flex-col gap-1 p-4">
                      <span className="text-xs text-muted">{r.section.label}</span>
                      <Link href={pageHref(r.section.slug, r.page.slug)} className="font-semibold hover:text-accent hover:underline">
                        {r.page.label}
                      </Link>
                      <span className="flex-1 text-sm text-muted">{r.page.description}</span>
                      <Link href={helpHref(r.section.slug, r.page.slug)} className="mt-2 text-sm font-medium text-accent hover:underline">
                        Read help<span className="sr-only"> for {r.page.label}</span>
                      </Link>
                    </Card>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <nav aria-label="On this page" className="hidden xl:block">
          <div className="sticky top-24">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">On this page</p>
            <ul className="flex flex-col gap-1 border-l border-border text-sm">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-muted hover:border-accent hover:text-foreground">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </article>
  );
}
