"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, X } from "lucide-react";
import { HELP_HOME, adminNav, findSectionByPath, helpHref, pageHref, parseAdminPath, type NavSection } from "@/lib/admin/navigation";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/cn";
import { useAdminUi } from "@/store/admin-ui";
import { IconButton } from "@/components/ui/Button";

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
      <span
        className="flex size-9 items-center justify-center rounded-xl bg-accent font-serif text-lg font-bold text-accent-fg shadow-sm"
        aria-hidden="true"
      >
        {siteConfig.shortName[0]}
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-lg font-semibold">{siteConfig.shortName}</span>
        <span className="block text-[11px] tracking-wide text-muted uppercase">Admin panel</span>
      </span>
    </Link>
  );
}

function SubNav({
  section,
  pathname,
  help = false,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  help?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {section.pages.map((p) => {
        const href = help ? helpHref(section.slug, p.slug) : pageHref(section.slug, p.slug);
        const active = pathname === href;
        return (
          <li key={p.slug}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-accent-soft font-semibold text-accent" : "text-foreground/80 hover:bg-accent-soft hover:text-foreground",
              )}
            >
              <span className="truncate">{p.label}</span>
              {p.status === "decision" ? (
                <span className="size-1.5 shrink-0 rounded-full bg-warning" title="Needs IBMV decision" aria-label="Needs IBMV decision" />
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const railItemClass = (active: boolean) =>
  cn(
    "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
    active ? "bg-accent text-accent-fg" : "text-muted hover:bg-accent-soft hover:text-foreground",
  );

export function Sidebar() {
  const pathname = usePathname();
  const { help, section: helpSection } = parseAdminPath(pathname);
  const current = findSectionByPath(pathname);
  const showSubNav = help ? Boolean(helpSection) && current.pages.length > 1 : current.pages.length > 1;

  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 lg:flex" aria-label="Admin navigation">
      <nav className="flex w-20 flex-col items-center gap-1 border-r border-border bg-surface py-4">
        <Link
          href="/admin"
          className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent font-serif text-lg font-bold text-accent-fg"
          aria-label={`${siteConfig.name} admin home`}
        >
          {siteConfig.shortName[0]}
        </Link>
        <ul className="flex w-full flex-col gap-1 px-2">
          {adminNav.map((s) => {
            const Icon = s.icon;
            const active = !help && s.slug === current.slug;
            return (
              <li key={s.slug}>
                <Link href={pageHref(s.slug, s.pages[0].slug)} aria-current={active ? "true" : undefined} className={railItemClass(active)}>
                  <Icon className="size-5" aria-hidden="true" />
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto w-full px-2">
          <Link href={HELP_HOME} aria-current={help ? "true" : undefined} className={railItemClass(help)}>
            <CircleHelp className="size-5" aria-hidden="true" />
            Help
          </Link>
        </div>
      </nav>
      {showSubNav ? (
        <nav className="w-60 overflow-y-auto border-r border-border bg-surface/60 px-3 py-5" aria-label={`${current.label} ${help ? "help topics" : "pages"}`}>
          <p className="mb-3 px-3 font-serif text-xl font-semibold">{help ? `${current.label} help` : current.label}</p>
          <SubNav section={current} pathname={pathname} help={help} />
          {help ? (
            <Link href={HELP_HOME} className="mt-4 block px-3 text-sm font-medium text-accent hover:underline">
              ← All help topics
            </Link>
          ) : null}
        </nav>
      ) : null}
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const open = useAdminUi((s) => s.mobileNavOpen);
  const setOpen = useAdminUi((s) => s.setMobileNavOpen);
  const currentSlug = findSectionByPath(pathname).slug;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <motion.nav
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-surface shadow-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Brand />
              <IconButton label="Close navigation" onClick={() => setOpen(false)} autoFocus>
                <X className="size-5" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {adminNav.map((s) => {
                const Icon = s.icon;
                return (
                  <details key={s.slug} open={s.slug === currentSlug} className="group mb-1">
                    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent-soft">
                      <Icon className="size-5 text-muted" aria-hidden="true" />
                      {s.label}
                    </summary>
                    <div className="mt-1 ml-5 border-l border-border pl-3">
                      <SubNav section={s} pathname={pathname} onNavigate={() => setOpen(false)} />
                    </div>
                  </details>
                );
              })}
            </div>
            <div className="border-t border-border px-3 py-3">
              <Link
                href={HELP_HOME}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-accent-soft"
              >
                <CircleHelp className="size-5 text-muted" aria-hidden="true" />
                Help center
              </Link>
            </div>
          </motion.nav>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
