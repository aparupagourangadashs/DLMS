"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Award, Bell, BookOpen, CalendarDays, ChevronDown, ChevronRight, Gift, HeartHandshake, House, LifeBuoy, Menu, MessagesSquare, PanelLeftClose, PanelLeftOpen, Receipt, Settings, Sparkles, UserRound, ClipboardCheck, type LucideIcon } from "lucide-react";
import { studentHref, studentNav } from "@/lib/student/demo";
import { cn } from "@/lib/cn";
import { palette, type ColorKey } from "@/lib/colors";
import { Logo } from "@/components/Logo";
import { Modal } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import { StudentAvatar } from "./StudentAvatar";

const icons: Record<string, LucideIcon> = {
  announcements: Bell, calendar: CalendarDays, certificates: Award, communities: MessagesSquare,
  exams: ClipboardCheck, help: LifeBuoy, "": House, memberships: HeartHandshake,
  "my-learning": BookOpen, "my-purchases": Receipt, "refer-and-earn": Gift, "settings/profile": Settings,
};

const navColors: Record<string, ColorKey> = {
  announcements: "orange", calendar: "violet", certificates: "amber", communities: "teal",
  exams: "indigo", help: "sky", "": "blue", memberships: "rose",
  "my-learning": "emerald", "my-purchases": "sky", "refer-and-earn": "violet", "settings/profile": "slate",
};

export function StudentShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      desktop.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);
  function navigation(mobile = false) {
    const iconOnly = collapsed && !mobile;
    return (
      <nav id={mobile ? undefined : "student-desktop-navigation"} aria-label={mobile ? "Mobile student navigation" : "Student navigation"}>
        <ul className="space-y-1">
        {studentNav.filter((item) => item.slug !== "announcements").map((item) => {
          const Icon = icons[item.slug];
          const color = palette[navColors[item.slug]];
          const href = studentHref(item.slug);
          const active = item.slug === "" ? path === href
            : item.slug === "my-learning" ? path === href || path.startsWith("/student/learning/")
              : item.slug === "settings/profile" ? path.startsWith("/student/settings/") : path === href;
          return (
            <li key={item.slug}>
              <Link href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                aria-label={iconOnly ? item.label : undefined} title={iconOnly ? item.label : undefined}
                className={cn("student-nav-link group relative flex min-h-11 items-center gap-3 rounded-xl border py-1.5 text-sm font-medium transition-colors",
                  iconOnly ? "justify-center px-1" : "px-2.5",
                  active ? "border-accent/30 bg-linear-to-r from-accent-soft to-surface font-semibold text-foreground shadow-sm" : "border-transparent hover:border-border hover:bg-surface/80")}>
                {active ? <span className="absolute top-3 bottom-3 left-0 w-0.5 rounded-full bg-accent" aria-hidden="true" /> : null}
                <span className={cn("student-nav-icon flex size-9 shrink-0 items-center justify-center rounded-xl", color.solid)}>
                  <Icon className="student-duotone-icon size-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                {!iconOnly ? <><span className="min-w-0 flex-1">{item.label}</span>
                <ChevronRight className={cn("size-3.5 shrink-0", active ? "text-accent" : "text-muted/40 group-hover:text-accent")} aria-hidden="true" /></> : null}
              </Link>
            </li>
          );
        })}
        </ul>
      </nav>
    );
  }
  return (
    <div data-student-portal data-theme="light" className="student-portal min-h-dvh">
      <a href="#student-main" className="sr-only z-50 rounded-lg bg-surface p-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to content</a>
      <header className="student-header sticky top-0 z-30 border-b border-border">
        <span className="student-header-pattern" aria-hidden="true" />
        <div className="relative flex min-h-18 items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <div className="shrink-0 lg:hidden"><button type="button" aria-label="Open student navigation" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)} className="student-header-control flex size-11 items-center justify-center rounded-xl"><Menu className="size-5" aria-hidden="true" /></button></div>
          <Link href="/student" aria-label="IBMV Learning Platform student home" className="student-header-brand flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="student-header-logo flex size-11 shrink-0 items-center justify-center rounded-full"><Logo size={32} decorative /></span><span className="student-header-brand-text hidden min-w-0 rounded-xl px-2 py-2 font-serif text-lg leading-tight font-semibold min-[400px]:block sm:px-3 sm:text-xl">IBMV<span className="hidden sm:inline"> Learning Platform</span><span className="student-header-subtitle block font-sans text-xs font-normal">Student portal</span></span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
            <Link href="/student/announcements" aria-label="Announcements" title="Announcements" aria-current={path === "/student/announcements" ? "page" : undefined} onClick={() => setOpen(false)} className="student-header-control student-header-announcements flex size-11 items-center justify-center rounded-xl"><Bell className="student-duotone-icon size-5" aria-hidden="true" /></Link>
            <Link href="/student/help" aria-label="Help Centre" title="Help Centre" className="student-header-help flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold sm:px-3"><LifeBuoy className="student-duotone-icon size-5" aria-hidden="true" /><span className="hidden sm:inline">Help</span></Link>
            <Popover label="Student account" panelClassName="w-64 student-account-menu" trigger={({ open: accountOpen, toggle, ref }) => (
              <button ref={ref} type="button" aria-label="Student account menu" aria-expanded={accountOpen} onClick={toggle} className="student-header-control student-header-account flex min-h-11 items-center gap-2 rounded-full p-1 text-left sm:rounded-2xl sm:pr-3">
                <StudentAvatar />
                <span className="hidden sm:block"><span className="block text-xs font-semibold">Demo Learner</span><span className="student-header-subtitle block text-[10px]">Your account</span></span>
                <ChevronDown className="student-header-subtitle hidden size-3.5 sm:block" aria-hidden="true" />
              </button>
            )}>
              {(close) => <div><div className="student-account-identity m-1 mb-2 rounded-xl p-3"><p className="text-sm font-semibold">Demo Learner</p><p className="mt-1 text-xs text-muted">Illustrated avatar · Demo account</p></div><nav aria-label="Student account links">{[
                { href: "/student/help", label: "Help Centre", Icon: LifeBuoy },
                { href: "/student/settings/preferences", label: "Preferences", Icon: Settings },
                { href: "/student/settings/profile", label: "Profile", Icon: UserRound },
                { href: "/", label: "Exit demo / All portals", Icon: ArrowLeft },
              ].map(({ href, label, Icon }) => <Link key={href} href={href} onClick={close} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-accent-soft"><Icon className="size-4 text-accent" aria-hidden="true" />{label}</Link>)}</nav></div>}
            </Popover>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside aria-label="Student sidebar" className={cn("sticky top-18 z-20 hidden h-[calc(100dvh-4.5rem)] shrink-0 lg:flex", collapsed ? "w-20" : "w-64")}>
          <div className="student-sidebar flex min-h-0 w-full flex-col overflow-hidden border-r border-border">
            <div className={cn("flex h-20 shrink-0 items-center gap-2 border-b border-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
              {!collapsed ? <div className="min-w-0"><p className="font-serif text-lg font-semibold">Your learning space</p><p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted"><Sparkles className="size-3 text-accent" aria-hidden="true" />Learn. Reflect. Grow.</p></div> : null}
              <button
                type="button"
                aria-label={collapsed ? "Expand student sidebar" : "Collapse student sidebar"}
                title={collapsed ? "Expand student sidebar" : "Collapse student sidebar"}
                aria-expanded={!collapsed}
                aria-controls="student-desktop-navigation"
                onClick={() => setCollapsed((value) => !value)}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface/80 text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft"
              >
                {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
              </button>
            </div>
            <div className="student-nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">{navigation()}</div>
            <div className="shrink-0 border-t border-border bg-surface/70 p-2">
              <Link href="/" aria-label={collapsed ? "Exit demo / All portals" : undefined} title={collapsed ? "Exit demo / All portals" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted hover:bg-accent-soft hover:text-accent", collapsed && "justify-center")}><ArrowLeft className="size-4 shrink-0" aria-hidden="true" />{!collapsed ? "Exit demo / All portals" : null}</Link>
            </div>
          </div>
        </aside>
        <main id="student-main" className="mx-auto min-w-0 max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7">
          <p className="student-demo-note mb-5 rounded-xl border px-4 py-3 text-xs leading-relaxed">
            <strong>Public demo preview.</strong> All learner records are fictional. No sign-in, real enrollment, payment, message delivery or progress tracking is connected. Changes are temporary; do not enter personal information.
          </p>
          {children}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted"><span>IBMV · A space to learn, reflect and grow</span><Link href="/student/help" className="font-medium text-accent hover:underline">Need help?</Link></footer>
        </main>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Student navigation" variant="drawer" side="left">
        <div className="rounded-2xl border border-border bg-linear-to-b from-accent-soft via-surface to-teal-500/5 p-2">{navigation(true)}</div>
        <Link href="/" onClick={() => setOpen(false)} className="mt-5 flex min-h-11 items-center gap-2 text-sm text-accent"><ArrowLeft className="size-4" aria-hidden="true" />Exit demo / All portals</Link>
      </Modal>
    </div>
  );
}
