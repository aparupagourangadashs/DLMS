"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, CornerDownLeft, Search } from "lucide-react";
import { HELP_HOME, adminNav, findPage, helpHref, pageHref, parseAdminPath } from "@/lib/admin/navigation";
import { cn } from "@/lib/cn";
import { useAdminUi } from "@/store/admin-ui";

const allPages = [
  ...adminNav.flatMap((s) =>
    s.pages.map((p) => ({ key: `${s.slug}/${p.slug}`, section: s.label, label: p.label, description: p.description, href: pageHref(s.slug, p.slug), Icon: s.icon })),
  ),
  { key: "help", section: "Help", label: "Help center", description: "How to use every admin page, step by step", href: HELP_HOME, Icon: CircleHelp },
];

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

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allPages;
    const score = (p: (typeof allPages)[number]) => {
      const label = p.label.toLowerCase();
      if (label.startsWith(q)) return 0;
      if (label.includes(q)) return 1;
      if (p.section.toLowerCase().includes(q)) return 2;
      if (p.description.toLowerCase().includes(q)) return 3;
      return -1;
    };
    return allPages
      .map((p) => ({ p, s: score(p) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((x) => x.p);
  }, [query]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

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
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              go(results[active].href);
            }
          }}
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={results[active] ? `cmd-${results[active].key}` : undefined}
          aria-label="Search pages"
          placeholder="Search pages, e.g. learners, batches, campaigns…"
          className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
      </div>
      <ul id="command-results" role="listbox" aria-label="Pages" className="max-h-[50vh] overflow-y-auto p-2">
        {results.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted">No pages match “{query}”.</li>
        ) : (
          results.map((r, i) => (
            <li
              key={r.key}
              id={`cmd-${r.key}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.href)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5", i === active && "bg-accent-soft")}
            >
              <r.Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {r.label} <span className="font-normal text-muted">· {r.section}</span>
                </span>
                <span className="block truncate text-xs text-muted">{r.description}</span>
              </span>
              {i === active ? <CornerDownLeft className="size-4 text-muted" aria-hidden="true" /> : null}
            </li>
          ))
        )}
      </ul>
    </dialog>
  );
}
