"use client";

import { HELP_HOME, adminNav, findPage, helpHref, pageHref, parseAdminPath } from "@/lib/admin/navigation";
import { MIN_QUERY, type SearchGroup } from "@/lib/admin/search";
import { ApiError, apiClient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { colorFor } from "@/lib/colors";
import { useDebounced } from "@/lib/use-debounced";
import { useAdminUi } from "@/store/admin-ui";
import { BookOpen, CalendarDays, CircleHelp, CornerDownLeft, FileText, GraduationCap, Image as ImageIcon, Inbox, Layers, LifeBuoy, Megaphone, Newspaper, Quote, Search, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useVisibleNav } from "./AdminAccess";

const allPages = [
  ...adminNav.flatMap((s) =>
    s.pages.map((p) => ({ key: `${s.slug}/${p.slug}`, sectionSlug: s.slug, section: s.label, label: p.label, description: p.description, href: pageHref(s.slug, p.slug), Icon: s.icon })),
  ),
  { key: "help", sectionSlug: "help", section: "Help", label: "Help center", description: "How to use every admin page, step by step", href: HELP_HOME, Icon: CircleHelp },
];

const groupIcons: Record<string, LucideIcon> = {
  learners: UserRound, team: UsersRound, courses: GraduationCap, batches: Layers, events: CalendarDays, announcements: Megaphone, blogs: Newspaper,
  leads: Inbox, support: LifeBuoy, assets: ImageIcon, modules: BookOpen, banners: ImageIcon, testimonials: Quote, books: BookOpen, people: UserRound,
};

/** One line in the results: a page of the admin panel or a record found in the database. */
type Entry = { id: string; href: string; group: string; title: string; subtitle: string; section: string; Icon: LucideIcon; context?: string };

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const open = useAdminUi((s) => s.commandOpen);
  const setOpen = useAdminUi((s) => s.setCommandOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useAdminUi.getState().commandOpen);
      } else if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target) && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        const { help, section, page } = parseAdminPath(pathname);
        router.push(!help && section && page && findPage(section, page) ? helpHref(section, page) : HELP_HOME);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen, router, pathname]);

  return open ? <PaletteDialog onClose={() => setOpen(false)} /> : null;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const typed = query.trim();
  const term = useDebounced(typed, 250);
  const [found, setFound] = useState<{ term: string; groups: SearchGroup[]; error?: string } | null>(null);
  const nav = useVisibleNav();
  const allowed = useMemo(() => new Set(nav.flatMap((s) => s.pages.map((p) => `${s.slug}/${p.slug}`))), [nav]);
  const pages = useMemo(() => allPages.filter((p) => p.key === "help" || allowed.has(p.key)), [allowed]);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Records come from the server once typing pauses; a newer search cancels the one before it.
  useEffect(() => {
    if (term.length < MIN_QUERY) return;
    const controller = new AbortController();
    apiClient
      .get<{ groups: SearchGroup[] }>("/api/admin/search", { q: term }, { signal: controller.signal })
      .then((result) => setFound({ term, groups: result.data.groups }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFound({ term, groups: [], error: error instanceof ApiError ? error.message : "Records could not be searched." });
      });
    return () => controller.abort();
  }, [term]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    const score = (p: (typeof allPages)[number]) => {
      const label = p.label.toLowerCase();
      if (label.startsWith(q)) return 0;
      if (label.includes(q)) return 1;
      if (p.section.toLowerCase().includes(q)) return 2;
      if (p.description.toLowerCase().includes(q)) return 3;
      return -1;
    };
    return pages
      .map((p) => ({ p, s: score(p) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((x) => x.p);
  }, [query, pages]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  // Pages answer at once; records only count once they are for what is typed now.
  const settled = typed.length >= MIN_QUERY && found?.term === typed ? found : null;
  const searching = typed.length >= MIN_QUERY && settled === null;
  const entries: Entry[] = [
    ...results.map((r) => ({ id: `page-${r.key}`, href: r.href, group: "Pages", title: r.label, subtitle: r.description, section: r.sectionSlug, Icon: r.Icon, context: r.section })),
    ...(settled?.groups ?? []).flatMap((g) => g.hits.map((h) => ({ id: `${g.key}-${h.id}`, href: h.href, group: g.label, title: h.title, subtitle: h.subtitle, section: g.section, Icon: groupIcons[g.key] ?? FileText }))),
  ];
  const current = Math.min(active, entries.length - 1);
  const grouped = typed.length >= MIN_QUERY;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label="Search the admin panel"
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-border bg-surface text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive(Math.min(current + 1, entries.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(Math.max(current - 1, 0));
            } else if (e.key === "Enter" && entries[current]) {
              e.preventDefault();
              go(entries[current].href);
            }
          }}
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={entries[current] ? `cmd-${entries[current].id}` : undefined}
          aria-label="Search pages and records"
          placeholder="Search pages and records, e.g. a learner, batch or course…"
          className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
      </div>
      <ul id="command-results" role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
        {entries.length === 0 && !searching ? (
          <li className="px-3 py-8 text-center text-sm text-muted">No pages or records match “{query}”.</li>
        ) : null}
        {entries.map((r, i) => (
          <Fragment key={r.id}>
            {grouped && r.group !== entries[i - 1]?.group ? (
              <li role="presentation" className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                {r.group}
              </li>
            ) : null}
            <li
              id={`cmd-${r.id}`}
              role="option"
              aria-selected={i === current}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.href)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5", i === current && "bg-accent-soft")}
            >
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", colorFor(r.section).tile)} aria-hidden="true">
                <r.Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {r.title} {r.context ? <span className="font-normal text-muted">· {r.context}</span> : null}
                </span>
                {r.subtitle ? <span className="block truncate text-xs text-muted">{r.subtitle}</span> : null}
              </span>
              {i === current ? <CornerDownLeft className="size-4 text-muted" aria-hidden="true" /> : null}
            </li>
          </Fragment>
        ))}
        {searching ? (
          <li role="status" className="px-3 py-3 text-xs text-muted">
            Searching records…
          </li>
        ) : null}
        {settled?.error ? (
          <li role="alert" className="px-3 py-3 text-xs text-danger">
            {settled.error}
          </li>
        ) : null}
      </ul>
    </dialog>
  );
}
