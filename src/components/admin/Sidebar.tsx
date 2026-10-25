"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, X, type LucideIcon } from "lucide-react";
import { HELP_HOME, adminNav, findSectionByPath, helpHref, pageHref, parseAdminPath, type NavSection } from "@/lib/admin/navigation";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/cn";
import { colorFor } from "@/lib/colors";
import { useAdminUi } from "@/store/admin-ui";
import { IconButton } from "@/components/ui/Button";
import { Logo } from "@/components/Logo";

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
      <Logo size={40} decorative />
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
  const color = colorFor(section.slug);
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
                active ? cn(color.tile, "font-semibold") : "text-foreground/80 hover:bg-accent-soft hover:text-foreground",
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

function RailItem({ href, label, icon: Icon, section, active }: { href: string; label: string; icon: LucideIcon; section: string; active: boolean }) {
  const color = colorFor(section);
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium transition-colors",
        active ? cn("font-semibold", color.text) : "text-muted hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl transition-all",
          active ? color.solid : cn(color.tile, "group-hover:scale-105 group-hover:shadow-sm"),
        )}
        aria-hidden="true"
      >
        <Icon className="size-[18px]" />
      </span>
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { help, section: helpSection } = parseAdminPath(pathname);
  const current = findSectionByPath(pathname);
  const showSubNav = help ? Boolean(helpSection) && current.pages.length > 1 : current.pages.length > 1;

  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 lg:flex" aria-label="Admin navigation">
      <nav className="flex w-20 flex-col items-center gap-1 border-r border-border bg-surface pb-3">
        <div className="mb-2 flex h-16 w-full shrink-0 items-center justify-center border-b border-border">
          <Link
            href="/admin"
            className="flex items-center justify-center rounded-lg p-1 transition-transform hover:scale-105"
            aria-label={`${siteConfig.name} admin home`}
          >
            <Logo size={52} decorative />
          </Link>
        </div>
        <ul className="flex w-full flex-col gap-0.5 overflow-y-auto px-2">
          {adminNav.map((s) => (
            <li key={s.slug}>
              <RailItem href={pageHref(s.slug, s.pages[0].slug)} label={s.label} icon={s.icon} section={s.slug} active={!help && s.slug === current.slug} />
            </li>
          ))}
        </ul>
        <div className="mt-auto w-full px-2 pt-2">
          <RailItem href={HELP_HOME} label="Help" icon={CircleHelp} section="help" active={help} />
        </div>
      </nav>
      {showSubNav ? (
        <nav className="flex w-60 flex-col border-r border-border bg-surface" aria-label={`${current.label} ${help ? "help topics" : "pages"}`}>
          <p className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5 font-serif text-xl font-semibold">
            <span className={cn("flex size-8 items-center justify-center rounded-lg", colorFor(current.slug).tile)} aria-hidden="true">
              <current.icon className="size-4" />
            </span>
            {help ? `${current.label} help` : current.label}
          </p>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SubNav section={current} pathname={pathname} help={help} />
            {help ? (
              <Link href={HELP_HOME} className="mt-4 block px-3 text-sm font-medium text-accent hover:underline">
                ← All help topics
              </Link>
            ) : null}
          </div>
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
                    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-soft">
                      <span className={cn("flex size-8 items-center justify-center rounded-lg", colorFor(s.slug).tile)} aria-hidden="true">
                        <Icon className="size-4" />
                      </span>
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
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-soft"
              >
                <span className={cn("flex size-8 items-center justify-center rounded-lg", colorFor("help").tile)} aria-hidden="true">
                  <CircleHelp className="size-4" />
                </span>
                Help center
              </Link>
            </div>
          </motion.nav>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
