import Link from "next/link";
import { ArrowRight, Globe, GraduationCap, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { siteConfig } from "@/lib/site";

const portals = [
  {
    title: "Admin panel",
    description: "Manage courses, batches, sessions, learners, marketing, sales and settings.",
    href: "/admin",
    Icon: LayoutDashboard,
    status: "Screens ready for review",
  },
  {
    title: "Student portal",
    description: "My learning, course player, calendar, exams, certificates and account.",
    Icon: GraduationCap,
    status: "Next after admin sign-off",
  },
  {
    title: "Public website",
    description: "Course catalogs, course details, publications, about and contact pages.",
    Icon: Globe,
    status: "Planned",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-serif text-xl font-semibold">{siteConfig.name}</span>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16">
        <p className="text-sm font-medium tracking-wide text-accent uppercase">Welcome</p>
        <h1 className="mt-2 max-w-2xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{siteConfig.name}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          One platform for the public website, the student portal and the admin panel. Choose a portal to review.
        </p>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {portals.map(({ title, description, href, Icon, status }) => {
            const body = (
              <>
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <span className="mt-4 block text-lg font-semibold">{title}</span>
                <span className="mt-1 block flex-1 text-sm text-muted">{description}</span>
                <span className="mt-4 flex items-center justify-between gap-2">
                  <Badge tone={href ? "success" : "neutral"}>{status}</Badge>
                  {href ? <ArrowRight className="size-4 text-accent" aria-hidden="true" /> : null}
                </span>
              </>
            );
            return (
              <li key={title}>
                {href ? (
                  <Link href={href} className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-accent/50">
                    {body}
                  </Link>
                ) : (
                  <div className="flex h-full flex-col rounded-2xl border border-dashed border-border bg-surface/60 p-5" aria-label={`${title} (not available yet)`}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
