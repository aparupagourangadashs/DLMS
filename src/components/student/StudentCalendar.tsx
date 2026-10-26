"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { calendarDays, demoDate, formatDay, sessions, shiftCalendarDate, type CalendarView } from "@/lib/student/demo";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Tabs } from "@/components/ui/Tabs";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";

export function StudentCalendar() {
  const [date, setDate] = useState(demoDate);
  const [view, setView] = useState<CalendarView>("month");
  const days = calendarDays(date, view);
  const visibleSessions = sessions.filter((session) => days.includes(session.date));
  return (
    <>
      <StudentHeading title="Calendar" description="Make room for learning. Explore a fictional class schedule in day, week or month view." icon={CalendarDays} />
      <StudentPanel className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button aria-label="Previous period" onClick={() => setDate(shiftCalendarDate(date, view, -1))}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
          <div className="min-w-0 flex-1 sm:max-w-64"><DatePicker aria-label="Calendar date" value={date} onValueChange={setDate} required /></div>
          <Button aria-label="Next period" onClick={() => setDate(shiftCalendarDate(date, view, 1))}><ChevronRight className="size-4" aria-hidden="true" /></Button>
          <Button onClick={() => {
            const now = new Date();
            setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
          }}>Today</Button>
          <Button variant="soft-info" onClick={() => setDate(demoDate)}>Demo dates</Button>
        </div>
        <div className="mt-4"><Tabs label="Calendar view" value={view} onChange={setView} items={[{ value: "day", label: "Day", color: "sky" }, { value: "week", label: "Week", color: "teal" }, { value: "month", label: "Month", color: "violet" }]} /></div>
        <p className="mt-3 text-xs text-muted">Asia/Kolkata (IST) · No live meeting service is connected.</p>
      </StudentPanel>
      {view !== "day" ? (
        <section aria-label={`${view} calendar`} className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-7 bg-accent-soft">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className="py-3 text-center text-[10px] font-semibold sm:text-xs">{day}</span>)}</div>
          <div className="grid grid-cols-7">{days.map((day) => {
            const count = sessions.filter((s) => s.date === day).length;
            return <button key={day} type="button" aria-label={`${formatDay(day)}, ${count} sample sessions`} aria-pressed={day === date} onClick={() => setDate(day)} className={cn("flex min-h-16 min-w-0 flex-col items-center gap-1 border-t border-r border-border p-1.5 text-xs hover:bg-accent-soft sm:min-h-24 sm:p-3", day === date ? "bg-accent-soft font-bold text-accent" : day.slice(0, 7) !== date.slice(0, 7) ? "text-muted" : "")}><span className={cn("flex size-7 items-center justify-center rounded-full", day === date && "bg-accent text-accent-fg")}>{Number(day.slice(8))}</span>{count ? <span className="size-2 rounded-full bg-teal-600 dark:bg-teal-400" aria-hidden="true" /> : null}<span className="hidden text-[10px] text-muted sm:block">{count ? `${count} class` : ""}</span></button>;
          })}</div>
        </section>
      ) : null}
      <StudentPanel title={view === "day" ? formatDay(date) : `Sessions in this ${view}`}>
        {visibleSessions.length ? <ul className="space-y-3">{visibleSessions.map((session) => <li key={session.id} className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4"><p className="text-xs font-semibold text-accent">{formatDay(session.date)}</p><h3 className="mt-1 font-semibold">{session.title}</h3><p className="mt-2 flex items-center gap-2 text-xs text-muted"><Clock3 className="size-4" aria-hidden="true" />{session.time} IST · {session.duration} minutes</p><Link href={`/student/learning/${session.course}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-accent hover:underline">View course preview</Link></li>)}</ul> : <StudentEmpty title="No sample classes in this period" description="Choose Demo dates to return to the illustrative timetable." icon={CalendarDays} />}
      </StudentPanel>
    </>
  );
}
