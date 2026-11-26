"use client";

import { Badge, toneFor } from "@/components/ui/Badge";
import { BarChart, type ChartType } from "@/components/ui/BarChart";
import { Button, IconButton, buttonClass } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartViewSwitch } from "@/components/ui/ChartViewSwitch";
import { DatePicker } from "@/components/ui/DatePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import type { AttendanceSummary, DashboardOverview, EnrolmentSeries } from "@/lib/admin/dashboard";
import type { AdminSession } from "@/lib/admin/sessions";
import { cn } from "@/lib/cn";
import { palette } from "@/lib/colors";
import { formatDate, formatTime } from "@/lib/format";
import { addDays } from "@/lib/ist";
import { useAdminUi } from "@/store/admin-ui";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Eye, IndianRupee, PartyPopper, Sparkles, Star, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "../PageHeader";
import { HolidayDrawer } from "./HolidayDrawer";
import { SessionDetails, useSessionRange } from "./SessionsCalendar";

const whatsNew = [
    "Session recordings: add a link and learners see Watch recording",
    "Course modules and lesson progress for learners",
    "Attendance and holidays from this page",
    "Global search with Ctrl+K",
];

type Props = {
    overview: DashboardOverview;
    canSeeSessions: boolean;
    canWriteSessions: boolean;
    branches: string[];
    /** Staff tied to branches must name one when marking a holiday. */
    branchRequired: boolean;
};

export function Dashboard({ overview, canSeeSessions, canWriteSessions, branches, branchRequired }: Props) {
    const router = useRouter();
    const setPendingCreate = useAdminUi((s) => s.setPendingCreate);

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
                                    <p className="mb-2 text-sm font-semibold">Recently added</p>
                                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                                        {whatsNew.map((w) => (
                                            <li key={w}>{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </Popover>
                        {canWriteSessions ? (
                            <Button variant="gold" onClick={scheduleSession}>
                                <CalendarDays className="size-4" aria-hidden="true" />
                                Schedule Session
                            </Button>
                        ) : null}
                    </>
                }
            />

            <WeeklyPerformance attendance={overview.attendance} />
            <ActivityAndEnrolments series={overview.series} />
            {canSeeSessions ? <TodaysSessions today={overview.today} canWrite={canWriteSessions} branches={branches} branchRequired={branchRequired} onSchedule={scheduleSession} /> : null}
        </>
    );
}

function WeeklyPerformance({ attendance }: { attendance: AttendanceSummary | null }) {
    const known = attendance !== null && attendance.percent !== null;
    const change = known && attendance.previousPercent ? Math.round(((attendance.percent! - attendance.previousPercent) / attendance.previousPercent) * 100) : undefined;
    const trend = attendance && attendance.days.length >= 2 ? { labels: attendance.days.map((d) => formatDate(d.date)), values: attendance.days.map((d) => d.percent), unit: "%" } : undefined;
    return (
        <section aria-labelledby="weekly-heading" className="mb-6">
            <h2 id="weekly-heading" className="mb-3 text-lg font-semibold">
                Weekly performance <span className="text-sm font-normal text-muted">· Last 7 days</span>
            </h2>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard label="Avg. time spent" value="—" hint="No data yet" color="indigo" icon={<Clock />} />
                <StatCard label="Total views" value="—" hint="No data yet" color="sky" icon={<Eye />} />
                <StatCard label="Avg. rating" value="—" hint="No data yet" color="amber" icon={<Star />} />
                {attendance ? (
                    <StatCard
                        label="Avg. attendance"
                        value={known ? `${attendance.percent}%` : "—"}
                        change={change}
                        hint={!known ? "No attendance marked yet" : change === undefined ? "Learners present" : "vs last week"}
                        color="emerald"
                        icon={<ClipboardCheck />}
                        trend={trend}
                    />
                ) : null}
            </div>
            <p className="mt-2 text-xs text-muted">Time spent, views and ratings appear once learner activity and feedback are collected.</p>
        </section>
    );
}

function ActivityAndEnrolments({ series }: { series: EnrolmentSeries | null }) {
    const [chart, setChart] = useState<"signups" | "sales">("signups");
    const [chartType, setChartType] = useState<ChartType>("bar");

    return (
        <div className={cn("mb-6 grid min-w-0 gap-5", series && "xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]")}>
            <Card className="min-w-0">
                <CardHeader title={<span className="flex items-center gap-2"><Users className="size-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />Daily active users</span>} description="Last 10 days" />
                <EmptyState icon={<Users className="size-5" />} title="No data yet" description="Daily active learners appear once learner activity is tracked." className="py-10" />
            </Card>
            {series ? (
                <Card className="min-w-0">
                    <CardHeader
                        title={chart === "signups" ? "Signups vs enrollments" : "Sales"}
                        description="Last 8 weeks"
                        actions={
                            <div className="flex flex-wrap items-center gap-2">
                                {chart === "signups" ? <ChartViewSwitch value={chartType} onChange={setChartType} /> : null}
                                <Select<"signups" | "sales">
                                    aria-label="Chart metric"
                                    value={chart}
                                    onValueChange={setChart}
                                    className="w-full sm:w-60"
                                    options={[{ value: "signups", label: "Signup vs Enrollments" }, { value: "sales", label: "Sales" }]}
                                />
                            </div>
                        }
                    />
                    {chart === "signups" ? (
                        <div className="p-5">
                            <p className="mb-4 text-sm text-muted">
                                <strong className="mr-2 text-3xl font-semibold text-foreground">{series.enrolments.slice(-4).reduce((sum, n) => sum + n, 0).toLocaleString("en-IN")}</strong>
                                Enrollments · Last 4 weeks
                            </p>
                            <BarChart
                                title="Weekly signups and enrollments"
                                labels={series.weekStarts.map((start) => formatDate(start).slice(0, 6))}
                                chartType={chartType}
                                series={[
                                    { label: "Signups", values: series.signups, colorClass: "fill-accent", swatchClass: "bg-accent" },
                                    { label: "Enrollments", values: series.enrolments, colorClass: "fill-gold", swatchClass: "bg-gold" },
                                ]}
                            />
                            <p className="mt-3 text-xs text-muted">Weeks start on Monday (IST). A signup is a new learner account; an enrollment is a course or batch place that was not cancelled.</p>
                        </div>
                    ) : (
                        <EmptyState icon={<IndianRupee className="size-5" />} title="No sales yet" description="Sales appear here once online payments are connected." className="py-16" />
                    )}
                </Card>
            ) : null}
        </div>
    );
}

function TodaysSessions({ today, canWrite, branches, branchRequired, onSchedule }: { today: string; canWrite: boolean; branches: string[]; branchRequired: boolean; onSchedule: () => void }) {
    const router = useRouter();
    const [date, setDate] = useState(today);
    const [selected, setSelected] = useState<AdminSession | null>(null);
    const [holidayOpen, setHolidayOpen] = useState(false);
    const { sessions, holidays, status, error, refetch } = useSessionRange(date, date, "");

    // The figures at the top of the page come from the server, so they are refreshed along with the day.
    const changed = () => {
        refetch();
        router.refresh();
    };

    const active = sessions.filter((s) => s.status !== "Cancelled");
    const taken = active.filter((s) => s.marked > 0);
    const signIns = taken.reduce((n, s) => n + s.attended, 0);
    const expected = taken.reduce((n, s) => n + Math.max(s.enrolled, s.marked), 0);

    return (
        <Card>
            <CardHeader
                title="Today's sessions"
                description={formatDate(date) + (date === today ? " · Today" : "")}
                actions={
                    <>
                        <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
                            <IconButton label="Previous day" onClick={() => setDate(addDays(date, -1))}>
                                <ChevronLeft className="size-4" aria-hidden="true" />
                            </IconButton>
                            <DatePicker aria-label="Choose date" value={date} onValueChange={setDate} required className="min-w-0 flex-1 sm:w-48 sm:flex-none" />
                            <IconButton label="Next day" onClick={() => setDate(addDays(date, 1))}>
                                <ChevronRight className="size-4" aria-hidden="true" />
                            </IconButton>
                        </div>
                        {canWrite ? (
                            <Button variant="soft-warning" onClick={() => setHolidayOpen(true)}>
                                <CalendarOff className="size-4" aria-hidden="true" />
                                Mark as Holiday
                            </Button>
                        ) : null}
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
                        ["Cancelled", sessions.length - active.length, "rose"],
                        ["Sign-ins", signIns, "emerald"],
                        ["Not signed in", Math.max(0, expected - signIns), "amber"],
                        ["Attendance", expected ? `${Math.round((signIns / expected) * 100)}%` : "—", "violet"],
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
            <p className="border-b border-border px-5 py-2 text-xs text-muted">Sign-ins are learners marked present. Only sessions whose attendance has been taken are counted.</p>

            {holidays.length > 0 ? (
                <ul className="flex flex-wrap gap-2 border-b border-border px-5 py-3" aria-label="Holidays on this day">
                    {holidays.map((h) => (
                        <li key={h.id} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs font-medium">
                            <PartyPopper className="size-3.5 shrink-0 text-gold-strong" aria-hidden="true" />
                            Holiday: {h.reason} · {h.branch || "All branches"}
                        </li>
                    ))}
                </ul>
            ) : null}

            {status === "error" ? (
                <EmptyState icon={<CalendarDays className="size-5" />} title="Could not load the sessions" description={error} action={<Button variant="soft-info" onClick={refetch}>Try again</Button>} />
            ) : sessions.length === 0 ? (
                <EmptyState
                    icon={<CalendarDays className="size-5" />}
                    title={status === "loading" ? "Loading the sessions…" : "No sessions on this day"}
                    description={status === "loading" ? undefined : canWrite ? "Schedule a session or pick another date." : "Pick another date."}
                    action={status !== "loading" && canWrite ? <Button variant="gold" onClick={onSchedule}>Schedule Session</Button> : undefined}
                />
            ) : (
                <div aria-busy={status === "loading"} className={cn(status === "loading" && "opacity-60 transition-opacity")}>
                    <TableScroll label="Daily sessions; scroll horizontally to see more columns">
                        <table className="admin-data-table">
                            <caption className="sr-only">Sessions on {formatDate(date)}</caption>
                            <thead>
                                <tr>
                                    <th scope="col"><TableHeading icon={CalendarDays}>Session</TableHeading></th>
                                    <th scope="col"><TableHeading icon={Users}>Attendance</TableHeading></th>
                                    <th scope="col"><TableHeading icon={Clock}>Status</TableHeading></th>
                                    <th scope="col"><TableHeading>Topics</TableHeading></th>
                                    <th scope="col" className="px-5 py-3 text-right">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((s) => (
                                    <tr key={s.id} className="border-b border-border last:border-0">
                                        <td className="px-5 py-3">
                                            <div className="admin-table-identity">
                                                <span className="admin-table-avatar" aria-hidden="true"><CalendarDays className="size-4" /></span>
                                                <div>
                                                    <p className="font-semibold">{s.title}</p>
                                                    <p className="mt-0.5 text-xs text-muted">
                                                        {formatTime(`${s.date}T${s.time}`)} · {s.durationMin} min · {s.batch}
                                                        {s.instructor ? ` · ${s.instructor}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 tabular-nums">
                                            {s.status === "Cancelled" ? (
                                                <span className="text-muted">—</span>
                                            ) : s.marked > 0 ? (
                                                `${s.attended} / ${Math.max(s.enrolled, s.marked)}`
                                            ) : (
                                                <span className="text-muted">{s.status === "Completed" ? "Not marked yet" : `${s.enrolled} enrolled`}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge tone={toneFor(s.status)} className="admin-table-status"><Clock className="size-3" aria-hidden="true" />{s.status}</Badge>
                                        </td>
                                        <td className="px-5 py-3 text-muted">{s.status === "Cancelled" ? s.cancelReason : s.topics}</td>
                                        <td className="px-5 py-3 text-right">
                                            <Button size="sm" variant="soft-info" onClick={() => setSelected(s)}>
                                                Open<span className="sr-only"> {s.title}</span>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableScroll>
                </div>
            )}

            <HolidayDrawer
                open={holidayOpen}
                date={date}
                branches={branches}
                branchRequired={branchRequired}
                onClose={() => setHolidayOpen(false)}
                onMarked={(holiday) => {
                    setHolidayOpen(false);
                    setDate(holiday.date);
                    changed();
                }}
            />

            <Modal
                open={selected !== null}
                onClose={() => setSelected(null)}
                title={selected?.title ?? ""}
                description={selected ? `${formatDate(selected.date)} · ${formatTime(`${selected.date}T${selected.time}`)} · ${selected.durationMin} min` : undefined}
                size="lg"
            >
                {selected ? <SessionDetails key={selected.id} session={selected} canWrite={canWrite} onChanged={changed} onClose={() => setSelected(null)} /> : null}
            </Modal>
        </Card>
    );
}
