"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Clock, Eye, Sparkles, Star, Users } from "lucide-react";
import { DEMO_TODAY, addDays, type DemoSession } from "@/lib/admin/demo-data";
import { formatDate, formatINR, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { palette } from "@/lib/colors";
import { useAdminUi } from "@/store/admin-ui";
import { Badge, toneFor } from "@/components/ui/Badge";
import { BarChart } from "@/components/ui/BarChart";
import { Button, IconButton, buttonClass } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import { StatCard } from "@/components/ui/StatCard";
import { DemoNotice, PageHeader } from "../PageHeader";

const weeks = ["Sep 7", "Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12", "Oct 19", "Oct 26"];
const signups = [142, 168, 155, 190, 210, 184, 236, 198];
const enrollments = [96, 120, 104, 141, 162, 150, 188, 171];
const sales = [48200, 61500, 52800, 74400, 88100, 79300, 101600, 93400];

const whatsNew = [
  "Global search with Ctrl+K",
  "Quick-create menu (New)",
  "CSV export on learner, team and cart lists",
  "Session calendar with list, day, week and month views",
];

export function Dashboard({ sessions: initialSessions }: { sessions: DemoSession[] }) {
  const router = useRouter();
  const setPendingCreate = useAdminUi((s) => s.setPendingCreate);
  const [chart, setChart] = useState<"signups" | "sales">("signups");
  const [date, setDate] = useState(DEMO_TODAY);
  const [sessions, setSessions] = useState(initialSessions);
  const [signedIn, setSignedIn] = useState<Set<string>>(new Set());
  const [holidayOpen, setHolidayOpen] = useState(false);

  const day = useMemo(() => sessions.filter((s) => s.date === date), [sessions, date]);
  const active = day.filter((s) => s.status !== "Cancelled");
  const attended = day.reduce((n, s) => n + s.attended, 0);
  const expected = day.filter((s) => s.status === "Completed").reduce((n, s) => n + s.enrolled, 0);
  const signIns = day.filter((s) => signedIn.has(s.id) || s.status === "Completed").length;

  const scheduleSession = () => {
    setPendingCreate("learning/sessions");
    router.push("/admin/learning/sessions");
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How learning is going this week, and what's happening today."
        status="ready"
        actions={
          <>
            <Popover
              label="What's new"
              panelClassName="w-72"
              trigger={({ open, toggle, ref }) => (
                <Button ref={ref} onClick={toggle} aria-expanded={open} variant="soft-violet">
                  <Sparkles className="size-4" aria-hidden="true" />
                  What&apos;s New
                </Button>
              )}
            >
              {() => (
                <div className="p-2">
                  <p className="mb-2 text-sm font-semibold">In this preview</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                    {whatsNew.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Popover>
            <Button variant="gold" onClick={scheduleSession}>
              <CalendarDays className="size-4" aria-hidden="true" />
              Schedule Session
            </Button>
          </>
        }
      />

      <DemoNotice />

      <section aria-labelledby="weekly-heading" className="mb-6">
        <h2 id="weekly-heading" className="sr-only">
          Weekly performance
        </h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Avg. time spent" value="42 min" change={8} hint="vs last week" color="indigo" icon={<Clock />} />
          <StatCard label="Total views" value="12,480" change={12} hint="vs last week" color="sky" icon={<Eye />} />
          <StatCard label="Avg. rating" value="4.7 / 5" change={2} hint="vs last week" color="amber" icon={<Star />} />
          <StatCard label="Daily active users" value="1,126" change={-3} hint="vs yesterday" color="emerald" icon={<Users />} />
        </div>
      </section>

      <Card className="mb-6">
        <CardHeader
          title={chart === "signups" ? "Signups vs enrollments" : "Sales"}
          description="Last 8 weeks"
          actions={
            <select
              aria-label="Chart metric"
              value={chart}
              onChange={(e) => setChart(e.target.value as "signups" | "sales")}
              className={`${inputClass} w-auto`}
            >
              <option value="signups">Signup vs Enrollments</option>
              <option value="sales">Sales</option>
            </select>
          }
        />
        <div className="p-5">
          {chart === "signups" ? (
            <BarChart
              title="Weekly signups and enrollments"
              labels={weeks}
              series={[
                { label: "Signups", values: signups, colorClass: "fill-accent", swatchClass: "bg-accent" },
                { label: "Enrollments", values: enrollments, colorClass: "fill-gold", swatchClass: "bg-gold" },
              ]}
            />
          ) : (
            <BarChart
              title="Weekly sales"
              labels={weeks}
              format={(n) => (n >= 1000 ? `₹${Math.round(n / 1000)}k` : formatINR(n))}
              series={[{ label: "Sales (₹)", values: sales, colorClass: "fill-success", swatchClass: "bg-success" }]}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Today's sessions"
          description={formatDate(date) + (date === DEMO_TODAY ? " · Today" : "")}
          actions={
            <>
              <div className="flex items-center gap-1">
                <IconButton label="Previous day" onClick={() => setDate(addDays(date, -1))}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </IconButton>
                <input
                  type="date"
                  aria-label="Choose date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className={`${inputClass} w-auto`}
                />
                <IconButton label="Next day" onClick={() => setDate(addDays(date, 1))}>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
              <Button variant="soft-warning" onClick={() => setHolidayOpen(true)} disabled={active.length === 0}>
                <CalendarOff className="size-4" aria-hidden="true" />
                Mark as Holiday
              </Button>
              <Link href="/admin/learning/sessions" className={buttonClass("secondary")}>
                View Calendar
              </Link>
            </>
          }
        />
        <dl className="grid grid-cols-2 gap-px border-b border-border bg-border sm:grid-cols-5">
          {(
            [
              ["Scheduled", active.length, "blue"],
              ["Cancelled", day.length - active.length, "rose"],
              ["Sign-ins", signIns, "emerald"],
              ["Not signed in", Math.max(0, active.length - signIns), "amber"],
              ["Attendance", expected ? `${Math.round((attended / expected) * 100)}%` : "—", "violet"],
            ] as const
          ).map(([label, value, color]) => (
            <div key={label} className="flex items-center gap-3 bg-surface px-5 py-3">
              <span className={cn("h-8 w-1 rounded-full", palette[color].bar)} aria-hidden="true" />
              <div>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className={cn("text-lg font-semibold tabular-nums", palette[color].text)}>{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        {day.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-5" />}
            title="No sessions on this day"
            description="Schedule a session or pick another date."
            action={
              <Button variant="gold" onClick={scheduleSession}>
                Schedule Session
              </Button>
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Sessions on {formatDate(date)}</caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  <th scope="col" className="px-5 py-3">Session</th>
                  <th scope="col" className="px-5 py-3">Attendance</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3">Topics</th>
                  <th scope="col" className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {day.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted">
                        {formatTime(`${s.date}T${s.time}`)} · {s.durationMin} min · {s.batch} · {s.instructor}
                      </p>
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {s.status === "Completed" ? `${s.attended} / ${s.enrolled}` : <span className="text-muted">{s.enrolled} enrolled</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={toneFor(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted">{s.topics}</td>
                    <td className="px-5 py-3 text-right">
                      {s.status === "Scheduled" ? (
                        signedIn.has(s.id) ? (
                          <Badge tone="success">Signed in</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="soft-success"
                            onClick={() => {
                              setSignedIn((prev) => new Set(prev).add(s.id));
                              toast.success("Signed in to session", { description: s.title });
                            }}
                          >
                            Sign in
                          </Button>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={holidayOpen}
        onClose={() => setHolidayOpen(false)}
        title="Mark as holiday?"
        footer={
          <>
            <Button onClick={() => setHolidayOpen(false)}>Cancel</Button>
            <Button
              variant="warning"
              onClick={() => {
                setSessions((prev) => prev.map((s) => (s.date === date && s.status === "Scheduled" ? { ...s, status: "Cancelled" } : s)));
                setHolidayOpen(false);
                toast.success(`${formatDate(date)} marked as a holiday`, { description: "Learners would be notified once messaging is connected." });
              }}
            >
              Mark as holiday
            </Button>
          </>
        }
      >
        <p className="text-sm">
          All {day.filter((s) => s.status === "Scheduled").length} scheduled sessions on <strong>{formatDate(date)}</strong> will be cancelled.
        </p>
      </Modal>
    </>
  );
}
