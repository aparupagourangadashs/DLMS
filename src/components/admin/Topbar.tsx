"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, CircleHelp, Menu, Plus, Search, UserRound } from "lucide-react";
import { HELP_HOME, findPage, pageHref, parseAdminPath, quickCreate } from "@/lib/admin/navigation";
import { useAdminUi } from "@/store/admin-ui";
import { Badge } from "@/components/ui/Badge";
import { IconButton, buttonClass } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";

const notifications = [
  { title: "12 submissions waiting for review", time: "10 min ago", href: "/admin/learning/submissions" },
  { title: "Session “Gita – Class 14” starts at 7:00 PM", time: "1 hour ago", href: "/admin/learning/sessions" },
  { title: "5 carts abandoned today", time: "3 hours ago", href: "/admin/sales/abandoned-cart" },
];

const menuItemClass = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent-soft";

function Breadcrumbs() {
  const pathname = usePathname();
  const { help, section, page } = parseAdminPath(pathname);
  const found = section && page ? findPage(section, page) : null;
  const crumbs: Array<{ label: string; href?: string }> = help
    ? [{ label: "Help center", href: found ? HELP_HOME : undefined }, ...(found ? [{ label: found.page.label }] : [])]
    : found
      ? [{ label: found.section.label }, { label: found.page.label }]
      : [{ label: "Admin" }];
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.label} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? <ChevronRight className="size-3.5 text-muted" aria-hidden="true" /> : null}
              {c.href ? (
                <Link href={c.href} className="text-muted hover:text-foreground hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last ? "font-medium" : "text-muted")}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Topbar() {
  const router = useRouter();
  const setMobileNavOpen = useAdminUi((s) => s.setMobileNavOpen);
  const setCommandOpen = useAdminUi((s) => s.setCommandOpen);
  const setPendingCreate = useAdminUi((s) => s.setPendingCreate);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <IconButton label="Open navigation" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
        <Menu className="size-5" aria-hidden="true" />
      </IconButton>
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted hover:bg-accent-soft md:w-64"
          aria-label="Search (Ctrl+K)"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden md:inline">Search…</span>
          <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[10px] md:inline">Ctrl K</kbd>
        </button>

        <Popover
          label="Quick create"
          trigger={({ open, toggle, ref }) => (
            <button ref={ref} type="button" onClick={toggle} aria-expanded={open} className={buttonClass("gold")}>
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
        >
          {(close) => (
            <ul>
              {quickCreate.map((q) => {
                const [section, page] = q.key.split("/");
                return (
                  <li key={q.key}>
                    <button
                      type="button"
                      className={menuItemClass}
                      onClick={() => {
                        close();
                        setPendingCreate(q.key);
                        router.push(pageHref(section, page));
                      }}
                    >
                      <Plus className="size-3.5 text-muted" aria-hidden="true" />
                      {q.label}
                    </button>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-border pt-1">
                <Link href="/admin/users/new-enrolment" onClick={close} className={menuItemClass}>
                  <Plus className="size-3.5 text-muted" aria-hidden="true" />
                  Enrolment
                </Link>
              </li>
            </ul>
          )}
        </Popover>

        <Popover
          label="Notifications"
          panelClassName="w-80"
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={`Notifications (${notifications.length} unread)`}
              className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface hover:bg-accent-soft"
            >
              <Bell className="size-4" aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" aria-hidden="true" />
            </button>
          )}
        >
          {(close) => (
            <div>
              <p className="px-3 pt-2 pb-1 text-sm font-semibold">Notifications</p>
              <ul>
                {notifications.map((n) => (
                  <li key={n.title}>
                    <Link href={n.href} onClick={close} className={cn(menuItemClass, "flex-col items-start gap-0.5")}>
                      <span>{n.title}</span>
                      <span className="text-xs text-muted">{n.time}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Popover>

        <ThemeToggle className="hidden sm:inline-flex" />

        <Popover
          label="Account"
          trigger={({ open, toggle, ref }) => (
            <button
              ref={ref}
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label="Account menu"
              className="flex items-center gap-2 rounded-full border border-border bg-surface p-1 pr-1 hover:bg-accent-soft sm:pr-3"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-lotus-pink/40 text-sm font-semibold" aria-hidden="true">
                DA
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium">Demo Admin</span>
                <span className="block text-[11px] text-muted">Administrator</span>
              </span>
            </button>
          )}
        >
          {(close) => (
            <div className="w-64">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">Demo Admin</p>
                <p className="text-xs text-muted">admin@example.com</p>
                <Badge tone="warning" className="mt-2">
                  Sign-in arrives with the backend
                </Badge>
              </div>
              <div className="border-t border-border pt-1">
                <Link href={pageHref("settings", "my-profile")} onClick={close} className={menuItemClass}>
                  <UserRound className="size-4 text-muted" aria-hidden="true" />
                  My Profile
                </Link>
                <Link href={HELP_HOME} onClick={close} className={menuItemClass}>
                  <CircleHelp className="size-4 text-muted" aria-hidden="true" />
                  Help center
                </Link>
                <Link href="/" onClick={close} className={menuItemClass}>
                  All portals
                </Link>
              </div>
              <div className="flex items-center justify-between border-t border-border px-3 pt-2 pb-1 sm:hidden">
                <span className="text-sm">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}
