"use client";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { calendarDays, formatDay, shiftCalendarDate, type CalendarView } from "@/lib/student/demo";
import type { StudentHoliday, StudentSession } from "@/lib/student/learning-types";
import { CalendarDays, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { useMemo, useState } from "react";
import { sessionWhen, StudentSessionItem } from "./StudentSessionItem";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";
import { useStudentSessions } from "./use-student-sessions";

/** The learner's own classes, from the batches they are enrolled in. `today` is the current date in IST, from the server. */
export function StudentCalendar({ today }: { today: string }) {
    const [date, setDate] = useState(today);
    const [view, setView] = useState<CalendarView>("month");
    const days = calendarDays(date, view);
    const { data, status, error, refetch } = useStudentSessions(days[0], days[days.length - 1]);

    const sessionsByDay = useMemo(() => {
        const map = new Map<string, StudentSession[]>();
        for (const session of data?.sessions ?? []) {
            const day = sessionWhen(session).date;
            map.set(day, [...(map.get(day) ?? []), session]);
        }
        return map;
    }, [data]);
    const holidaysByDay = useMemo(() => {
        const map = new Map<string, StudentHoliday[]>();
        for (const holiday of data?.holidays ?? []) map.set(holiday.date, [...(map.get(holiday.date) ?? []), holiday]);
        return map;
    }, [data]);

    const visibleSessions = days.flatMap((day) => sessionsByDay.get(day) ?? []);
    const visibleHolidays = days.flatMap((day) => holidaysByDay.get(day) ?? []);
    const loading = status === "loading";

    return (
        <>
            <StudentHeading title="Calendar" description="Make room for learning. See your classes in day, week or month view." icon={CalendarDays} />
            <StudentPanel className="mb-5">
                <div className="flex flex-wrap items-center gap-2">
                    <Button aria-label="Previous period" onClick={() => setDate(shiftCalendarDate(date, view, -1))}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
                    <div className="min-w-0 flex-1 sm:max-w-64"><DatePicker aria-label="Calendar date" value={date} onValueChange={setDate} required /></div>
                    <Button aria-label="Next period" onClick={() => setDate(shiftCalendarDate(date, view, 1))}><ChevronRight className="size-4" aria-hidden="true" /></Button>
                    <Button onClick={() => setDate(today)}>Today</Button>
                </div>
                <div className="mt-4"><Tabs label="Calendar view" value={view} onChange={setView} items={[{ value: "day", label: "Day", color: "sky" }, { value: "week", label: "Week", color: "teal" }, { value: "month", label: "Month", color: "violet" }]} /></div>
                <p className="mt-3 text-xs text-muted">Asia/Kolkata (IST) · Join links appear 15 minutes before a class starts.</p>
            </StudentPanel>
            {view !== "day" ? (
                <section aria-label={`${view} calendar`} aria-busy={loading} className={cn("mb-5 overflow-hidden rounded-2xl border border-border bg-surface", loading && "opacity-70")}>
                    <div className="grid grid-cols-7 bg-accent-soft">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className="py-3 text-center text-[10px] font-semibold sm:text-xs">{day}</span>)}</div>
                    <div className="grid grid-cols-7">{days.map((day) => {
                        const count = (sessionsByDay.get(day) ?? []).filter((s) => s.status !== "Cancelled").length;
                        const holiday = holidaysByDay.get(day)?.[0];
                        return (
                            <button
                                key={day}
                                type="button"
                                aria-label={`${formatDay(day)}, ${count} ${count === 1 ? "class" : "classes"}${holiday ? `, holiday: ${holiday.reason}` : ""}`}
                                aria-pressed={day === date}
                                onClick={() => setDate(day)}
                                className={cn("flex min-h-16 min-w-0 flex-col items-center gap-1 border-t border-r border-border p-1.5 text-xs hover:bg-accent-soft sm:min-h-24 sm:p-3", day === date ? "bg-accent-soft font-bold text-accent" : day.slice(0, 7) !== date.slice(0, 7) ? "text-muted" : "")}
                            >
                                <span className={cn("flex size-7 items-center justify-center rounded-full", day === date && "bg-accent text-accent-fg", day === today && day !== date && "ring-2 ring-accent")}>{Number(day.slice(8))}</span>
                                {count ? <span className="size-2 rounded-full bg-teal-600 dark:bg-teal-400" aria-hidden="true" /> : null}
                                {holiday ? <PartyPopper className="size-3.5 text-gold-strong" aria-hidden="true" /> : null}
                                <span className="hidden text-[10px] text-muted sm:block">{count ? `${count} ${count === 1 ? "class" : "classes"}` : ""}</span>
                            </button>
                        );
                    })}</div>
                </section>
            ) : null}
            <StudentPanel title={view === "day" ? formatDay(date) : `Classes in this ${view}`}>
                {status === "error" ? (
                    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm">
                        <span>{error}</span>
                        <Button variant="soft-info" onClick={refetch}>Try again</Button>
                    </div>
                ) : null}
                {visibleHolidays.length ? (
                    <ul className="mb-4 space-y-2" aria-label="Holidays">
                        {visibleHolidays.map((holiday) => (
                            <li key={`${holiday.date}-${holiday.reason}`} className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold-soft px-3 py-2 text-sm">
                                <PartyPopper className="size-4 shrink-0 text-gold-strong" aria-hidden="true" />
                                <span><strong>{formatDay(holiday.date)}</strong> · Holiday: {holiday.reason}</span>
                            </li>
                        ))}
                    </ul>
                ) : null}
                {visibleSessions.length ? (
                    <ul className="space-y-3">{visibleSessions.map((session) => <StudentSessionItem key={session.id} session={session} showDate />)}</ul>
                ) : loading ? (
                    <p role="status" className="text-sm text-muted">Loading your classes…</p>
                ) : status === "error" ? null : (
                    <StudentEmpty title="No classes in this period" description="Classes from the batches you are enrolled in appear here. Move to another date to see more." icon={CalendarDays} />
                )}
            </StudentPanel>
        </>
    );
}
