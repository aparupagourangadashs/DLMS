"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search, SearchX } from "lucide-react";
import { generalGuides, helpContent } from "@/lib/admin/help-content";
import { adminNav, helpHref } from "@/lib/admin/navigation";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { PageHeader } from "../PageHeader";
import { RichText, plainText } from "./RichText";

const topics = adminNav.map((s) => ({
  section: s,
  pages: s.pages.map((p) => ({ page: p, summary: helpContent[`${s.slug}/${p.slug}`]?.summary ?? p.description })),
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
          pages: q ? t.pages.filter((p) => `${t.section.label} ${p.page.label} ${p.summary}`.toLowerCase().includes(q)) : t.pages,
        }))
        .filter((t) => t.pages.length),
    [q],
  );
  const nothing = !guides.length && !sections.length;

  return (
    <>
      <PageHeader title="Help center" description="Learn what each admin page is for and how to use it, step by step." />

      <div className="relative mb-8 max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help, e.g. enrol, export, holiday, certificate…"
          aria-label="Search help"
          className={cn(inputClass, "h-12 pl-9 text-base")}
        />
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
            {guides.map((g) => (
              <details key={g.id} open={Boolean(q)} className="group rounded-2xl border border-border bg-surface shadow-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {g.title}
                  <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
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
              <Card key={section.slug} className="p-5">
                <h3 className="mb-3 flex items-center gap-2 font-serif text-xl font-semibold">
                  <section.icon className="size-5 text-accent" aria-hidden="true" />
                  {section.label}
                </h3>
                <ul className="flex flex-col gap-1">
                  {pages.map(({ page, summary }) => (
                    <li key={page.slug}>
                      <Link href={helpHref(section.slug, page.slug)} className="block rounded-lg px-3 py-2 hover:bg-accent-soft">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {page.label}
                          {page.status === "decision" ? (
                            <span className="size-1.5 rounded-full bg-warning" title="Needs IBMV decision" aria-label="(needs IBMV decision)" />
                          ) : null}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted">{summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
