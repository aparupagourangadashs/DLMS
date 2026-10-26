"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, LifeBuoy, Search, SearchX } from "lucide-react";
import { generalGuides, helpContent } from "@/lib/admin/help-content";
import { adminNav, helpHref } from "@/lib/admin/navigation";
import { cn } from "@/lib/cn";
import { cardCycle, colorFor, palette } from "@/lib/colors";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { PageHeader } from "../PageHeader";
import { RichText, plainText } from "./RichText";

const topics = adminNav.map((s) => ({
  section: s,
  pages: s.pages.map((p) => {
    const entry = helpContent[`${s.slug}/${p.slug}`];
    const summary = entry?.summary ?? p.description;
    const extra = [...(entry?.tasks ?? []).flatMap((t) => [t.title, ...t.steps]), ...(entry?.tips ?? [])].map(plainText).join(" ");
    return { page: p, summary, searchText: `${s.label} ${p.label} ${summary} ${extra}`.toLowerCase() };
  }),
}));

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const guides = useMemo(
    () => (q ? generalGuides.filter((g) => `${g.title} ${g.steps.map(plainText).join(" ")}`.toLowerCase().includes(q)) : generalGuides),
    [q],
  );
  const sections = useMemo(
    () =>
      topics
        .map((t) => ({
          ...t,
          pages: q ? t.pages.filter((p) => p.searchText.includes(q)) : t.pages,
        }))
        .filter((t) => t.pages.length),
    [q],
  );
  const nothing = !guides.length && !sections.length;

  return (
    <>
      <PageHeader title="Help center" description="Learn what each admin page is for and how to use it, step by step." />

      <div className="admin-feature-banner mb-8 flex-col items-stretch rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", palette.sky.solid)} aria-hidden="true"><LifeBuoy className="size-6" /></span>
          <div><h2 className="text-lg font-semibold">How can we help?</h2><p className="mt-1 text-sm text-muted">Browse guides or search for a page, task, or feature.</p></div>
        </div>
      <div className="relative w-full max-w-2xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sky-600 dark:text-sky-300" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help, e.g. enrol, export, holiday, certificate…"
          aria-label="Search help"
          className={cn(inputClass, "h-12 pl-9 text-base")}
        />
      </div>
      {q ? <p className="text-xs text-muted" role="status">{guides.length} guides and {sections.reduce((sum, s) => sum + s.pages.length, 0)} page topics found</p> : null}
      </div>

      {nothing ? (
        <Card>
          <EmptyState
            icon={<SearchX className="size-5" />}
            title={`No help topics match “${query}”`}
            description="Try another word, such as the page name or what you want to do."
          />
        </Card>
      ) : null}

      {guides.length ? (
        <section aria-labelledby="guides-title" className="mb-10">
          <h2 id="guides-title" className="mb-3 flex items-center gap-2 text-xl font-semibold">
            <BookOpen className="size-5 text-accent" aria-hidden="true" />
            Getting started
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {guides.map((g, index) => (
              <details key={g.id} open={Boolean(q)} className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                <summary className="relative flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                  <span className={cn("absolute inset-x-0 top-0 h-1", palette[cardCycle[index % cardCycle.length]].bar)} aria-hidden="true" />
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", palette[cardCycle[index % cardCycle.length]].tile)} aria-hidden="true"><BookOpen className="size-4" /></span>
                  <span className="flex-1">{g.title}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ol className="flex flex-col gap-2 border-t border-border px-5 py-4 text-sm leading-relaxed">
                  {g.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span>
                        <RichText text={s} />
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {sections.length ? (
        <section aria-labelledby="pages-title">
          <h2 id="pages-title" className="mb-3 text-xl font-semibold">
            Help for each page
          </h2>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {sections.map(({ section, pages }) => (
              <Card key={section.slug} className="min-w-0 overflow-hidden">
                <div className={cn("h-1", colorFor(section.slug).bar)} />
                <div className="p-5">
                <h3 className="mb-3 flex items-center gap-2.5 font-serif text-xl font-semibold">
                  <span className={cn("flex size-9 items-center justify-center rounded-xl", colorFor(section.slug).tile)} aria-hidden="true">
                    <section.icon className="size-[18px]" />
                  </span>
                  {section.label}
                </h3>
                <ul className="flex flex-col gap-1">
                  {pages.map(({ page, summary }) => (
                    <li key={page.slug}>
                      <Link href={helpHref(section.slug, page.slug)} className="group block rounded-xl border border-transparent px-3 py-2.5 hover:border-border hover:bg-accent-soft">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span className="min-w-0 flex-1">
                          {page.label}
                          </span>
                          {page.status === "decision" ? (
                            <span className="size-1.5 rounded-full bg-warning" title="Needs IBMV decision" aria-label="(needs IBMV decision)" />
                          ) : null}
                          <ArrowRight className={cn("size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5", colorFor(section.slug).text)} aria-hidden="true" />
                        </span>
                        <span className="line-clamp-2 text-xs text-muted">{summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
