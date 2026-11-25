"use client";

import { Badge, toneFor } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import type { EnrolBatchOption } from "@/lib/admin/enrolment-types";
import type { AdminHoliday, AdminSession, AdminSessionDetail } from "@/lib/admin/sessions";
import type { FormField } from "@/lib/admin/types";
import { ApiError, apiClient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { cardCycle, palette } from "@/lib/colors";
import { formatDate, formatTime } from "@/lib/format";
import { addDays } from "@/lib/ist";
import { useAdminUi } from "@/store/admin-ui";
import { BookOpen, CalendarDays, CalendarOff, CalendarRange, ChevronLeft, ChevronRight, CircleCheck, Clock3, ExternalLink, LayoutGrid, List, PartyPopper, Pencil, Plus, UserRound, Users, Video, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "../FormDrawer";
import { PageHeader } from "../PageHeader";

type View = "list" | "day" | "week" | "month";
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

const weekday = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
const startOfWeek = (iso: string) => addDays(iso, -weekday(iso));
const startOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
function addMonths(iso: string, n: number) {
    const d = new Date(`${startOfMonth(iso)}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
}

/** The dates the API is asked for: the visible days, plus the full six-week grid for the month view. */
function rangeFor(view: View, cursor: string) {
    if (view === "day") return { from: cursor, to: cursor };
    if (view === "month") {
        const start = startOfWeek(startOfMonth(cursor));
        return { from: start, to: addDays(start, 41) };
    }
    const start = startOfWeek(cursor);
    return { from: start, to: addDays(start, 6) };
}

/** A course keeps one colour everywhere, whichever sessions happen to be on screen. */
function courseColor(course: string) {
    let hash = 0;
    for (const char of course) hash = (hash * 31 + char.charCodeAt(0)) % 997;
    return palette[cardCycle[hash % cardCycle.length]];
}

type Loaded = { key: string; sessions: AdminSession[]; holidays: AdminHoliday[]; error?: string };

/** Sessions and holidays for a date range. Rows stay on screen while the next range loads. */
function useSessionRange(from: string, to: string, batch: string) {
    const [nonce, setNonce] = useState(0);
    const [state, setState] = useState<Loaded>({ key: "", sessions: [], holidays: [] });
    const key = `${from}|${to}|${batch}|${nonce}`;

    useEffect(() => {
        const controller = new AbortController();
        apiClient
            .get<{ sessions: AdminSession[]; holidays: AdminHoliday[] }>("/api/admin/sessions", { from, to, batch }, { signal: controller.signal })
            .then((result) => setState({ key, sessions: result.data.sessions, holidays: result.data.holidays }))
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                setState((prev) => ({ ...prev, key, error: error instanceof ApiError ? error.message : "Could not load the sessions." }));
            });
        return () => controller.abort();
    }, [key, from, to, batch]);

    const refetch = useCallback(() => setNonce((n) => n + 1), []);
    const status = state.key !== key ? "loading" : state.error ? "error" : "ready";
    return { sessions: state.sessions, holidays: state.holidays, error: state.error, status, refetch } as const;
}

const failure = (error: unknown, fallback = "Something went wrong. Please try again.") => (error instanceof ApiError ? error.message : fallback);

/** Form errors from the server, keyed by the form's field names. Other failures are shown as a message. */
function formErrors(error: unknown, rename: Record<string, string> = {}) {
    if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        if (error.status !== 400) toast.error(error.message);
        return Object.fromEntries(Object.entries(error.fields).map(([key, message]) => [rename[key] ?? key, message]));
    }
    toast.error(failure(error));
    return undefined;
}

type Props = {
    /** Today's date in IST, from the server. */
    today: string;
    batches: EnrolBatchOption[];
    branches: string[];
    /** Staff tied to branches must name one when marking a holiday. */
    branchRequired: boolean;
    canWrite: boolean;
};

const editFields: FormField[] = [
    { key: "title", label: "Session title", type: "text", required: true, placeholder: "Gita – Class 15" },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "time", label: "Start time (IST)", type: "time", required: true },
    { key: "durationMin", label: "Duration (minutes)", type: "number", required: true, placeholder: "60", min: 15, max: 480 },
    { key: "link", label: "Live class link", type: "url", placeholder: "https://", help: "A secure (https) Zoom, Meet or similar link. Learners see it shortly before the class." },
    { key: "topics", label: "Topics", type: "textarea", placeholder: "What this class covers" },
];

export function SessionsCalendar({ today, batches, branches, branchRequired, canWrite }: Props) {
    const [view, setView] = useState<View>("week");
    const [cursor, setCursor] = useState(today);
    const [batchFilter, setBatchFilter] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [holidayOpen, setHolidayOpen] = useState(false);
    const [selected, setSelected] = useState<AdminSession | null>(null);
    const [editing, setEditing] = useState<AdminSession | null>(null);
    const [removing, setRemoving] = useState<AdminHoliday | null>(null);
    const [removingBusy, setRemovingBusy] = useState(false);
    const pending = useAdminUi((s) => s.pendingCreate === "learning/sessions");
    const setPending = useAdminUi((s) => s.setPendingCreate);

    const { from, to } = rangeFor(view, cursor);
    const { sessions, holidays, status, error, refetch } = useSessionRange(from, to, batchFilter);

    const byDate = useMemo(() => {
        const map = new Map<string, AdminSession[]>();
        for (const s of sessions) map.set(s.date, [...(map.get(s.date) ?? []), s]);
        return map;
    }, [sessions]);
    const holidaysByDate = useMemo(() => {
        const map = new Map<string, AdminHoliday[]>();
        for (const h of holidays) map.set(h.date, [...(map.get(h.date) ?? []), h]);
        return map;
    }, [holidays]);

    const step = (dir: 1 | -1) => {
        if (view === "day") setCursor(addDays(cursor, dir));
        else if (view === "week" || view === "list") setCursor(addDays(cursor, dir * 7));
        else setCursor(addMonths(cursor, dir));
    };

    const heading =
        view === "day"
            ? formatDate(cursor)
            : view === "month"
                ? monthFmt.format(new Date(`${cursor}T00:00:00Z`))
                : `${formatDate(startOfWeek(cursor))} – ${formatDate(addDays(startOfWeek(cursor), 6))}`;

    const inPeriod = (date: string) => (view === "day" ? date === cursor : view === "month" ? date.startsWith(cursor.slice(0, 7)) : date >= startOfWeek(cursor) && date <= addDays(startOfWeek(cursor), 6));
    const periodSessions = sessions.filter((s) => inPeriod(s.date));
    const periodHolidays = holidays.filter((h) => inPeriod(h.date));
    const periodCourses = [...new Set(periodSessions.map((s) => s.course))];

    const closeCreate = () => {
        setCreateOpen(false);
        if (pending) setPending(null);
    };
    const openCreate = () => {
        if (batches.length === 0) {
            toast.error("There are no active batches yet.", { description: "Create a batch under Learning > Batches first." });
            if (pending) setPending(null);
            return;
        }
        setCreateOpen(true);
    };

    const createFields: FormField[] = [
        { key: "title", label: "Session title", type: "text", required: true, placeholder: "Gita – Class 15" },
        { key: "batch", label: "Batch", type: "select", options: batches.map((b) => b.name), required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "time", label: "Start time (IST)", type: "time", required: true },
        { key: "durationMin", label: "Duration (minutes)", type: "number", required: true, placeholder: "60", min: 15, max: 480 },
        { key: "link", label: "Live class link", type: "url", placeholder: "https://", help: "A secure (https) Zoom, Meet or similar link. Learners see it shortly before the class." },
        { key: "topics", label: "Topics", type: "textarea", placeholder: "What this class covers" },
        { key: "repeatWeeks", label: "Repeat weekly for (weeks)", type: "number", min: 0, max: 26, placeholder: "0", help: "0 schedules this date only. 4 adds the same class on the next four weeks as well; holidays are skipped." },
    ];

    const holidayFields: FormField[] = [
        { key: "date", label: "Date", type: "date", required: true },
        { key: "reason", label: "Reason", type: "text", required: true, placeholder: "Diwali", help: "Learners see this on their calendar." },
        {
            key: "branch",
            label: "Branch",
            type: "select",
            options: branchRequired ? branches : ["All branches", ...branches],
            required: true,
            help: branchRequired ? "Scheduled sessions of this branch on that day are cancelled." : "All branches cancels the scheduled sessions everywhere on that day.",
        },
    ];

    const removeHoliday = async () => {
        if (!removing) return;
        setRemovingBusy(true);
        try {
            await apiClient.delete(`/api/admin/sessions/holidays/${removing.id}`);
            toast.success("Holiday removed", { description: `${removing.reason} · ${formatDate(removing.date)}` });
            setRemoving(null);
            refetch();
        } catch (caught) {
            toast.error(failure(caught, "Could not remove this holiday."));
        } finally {
            setRemovingBusy(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Sessions"
                description="Schedule and track live classes across all batches. Times are shown in IST."
                status="ready"
                actions={
                    canWrite ? (
                        <>
                            <Button variant="warning" onClick={() => setHolidayOpen(true)}>
                                <CalendarOff className="size-4" aria-hidden="true" />
                                Mark as Holiday
                            </Button>
                            <Button variant="gold" onClick={openCreate}>
                                <Plus className="size-4" aria-hidden="true" />
                                Create Session
                            </Button>
                        </>
                    ) : undefined
                }
            />

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {([
                    { label: "Sessions in view", value: periodSessions.length, Icon: CalendarDays, color: "blue" },
                    { label: "Scheduled", value: periodSessions.filter((s) => s.status === "Scheduled").length, Icon: Video, color: "violet" },
                    { label: "Completed", value: periodSessions.filter((s) => s.status === "Completed").length, Icon: CircleCheck, color: "emerald" },
                    { label: "Learning hours", value: (periodSessions.filter((s) => s.status !== "Cancelled").reduce((total, s) => total + s.durationMin, 0) / 60).toLocaleString("en-IN", { maximumFractionDigits: 1 }), Icon: Clock3, color: "amber" },
                ] as const).map(({ label, value, Icon, color }) => (
                    <div key={label} className={cn("session-summary", palette[color].tile)}>
                        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", palette[color].solid)}><Icon className="size-5" aria-hidden="true" /></span>
                        <div><p className="text-xs font-medium">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>
                    </div>
                ))}
            </div>

            <Card className="session-calendar">
                <div className="calendar-toolbar">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Button variant="soft-info" onClick={() => setCursor(today)}>
                            Today
                        </Button>
                        <IconButton label={`Previous ${view === "list" ? "week" : view}`} onClick={() => step(-1)}>
                            <ChevronLeft className="size-4" aria-hidden="true" />
                        </IconButton>
                        <IconButton label={`Next ${view === "list" ? "week" : view}`} onClick={() => step(1)}>
                            <ChevronRight className="size-4" aria-hidden="true" />
                        </IconButton>
                        <h2 className="ml-1 min-w-0 basis-full font-serif text-xl font-semibold sm:basis-auto" aria-live="polite">
                            {heading}
                        </h2>
                    </div>
                    <Tabs
                        label="Calendar view"
                        value={view}
                        onChange={setView}
                        className="calendar-view-tabs"
                        items={[
                            { value: "list", label: "List", icon: List, color: "blue" },
                            { value: "day", label: "Day", icon: CalendarDays, color: "teal" },
                            { value: "week", label: "Week", icon: CalendarRange, color: "violet" },
                            { value: "month", label: "Month", icon: LayoutGrid, color: "blue" },
                        ]}
                    />
                    <DatePicker aria-label="Jump to date" value={cursor} onValueChange={setCursor} required className="w-full sm:w-56" />
                    <Select
                        aria-label="Filter by batch"
                        value={batchFilter}
                        onValueChange={setBatchFilter}
                        icon={Users}
                        className="w-full sm:w-56"
                        options={[{ value: "", label: "All batches" }, ...batches.map((b) => ({ value: b.id, label: b.name }))]}
                    />
                </div>
                <div className="calendar-legend">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-foreground"><BookOpen className="size-4 text-accent" aria-hidden="true" />Courses</span>
                    {periodCourses.map((course) => <span key={course} className={cn("calendar-course-label", courseColor(course).tile)}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{course}</span>)}
                    <span className="ml-auto whitespace-nowrap text-xs text-muted">All times in IST</span>
                </div>

                {periodHolidays.length > 0 ? (
                    <ul className="flex flex-wrap gap-2 border-b border-border px-4 py-3" aria-label="Holidays in this period">
                        {periodHolidays.map((h) => (
                            <li key={h.id} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold-soft py-1 pr-1 pl-3 text-xs font-medium text-foreground">
                                <PartyPopper className="size-3.5 shrink-0 text-gold-strong" aria-hidden="true" />
                                <span>{formatDate(h.date)} · {h.reason} · {h.branch || "All branches"}</span>
                                {canWrite ? (
                                    <IconButton label={`Remove holiday ${h.reason}, ${formatDate(h.date)}`} className="size-6" onClick={() => setRemoving(h)}>
                                        <X className="size-3.5" aria-hidden="true" />
                                    </IconButton>
                                ) : <span className="w-2" aria-hidden="true" />}
                            </li>
                        ))}
                    </ul>
                ) : null}

                {status === "error" ? (
                    <EmptyState
                        icon={<CalendarDays className="size-5" />}
                        title="Could not load the sessions"
                        description={error}
                        action={<Button variant="soft-info" onClick={refetch}>Try again</Button>}
                    />
                ) : (
                    <div aria-busy={status === "loading"} className={cn(status === "loading" && "opacity-60 transition-opacity")}>
                        {view === "month" ? (
                            <MonthView cursor={cursor} today={today} byDate={byDate} holidaysByDate={holidaysByDate} onSelect={setSelected} onDay={(d) => { setCursor(d); setView("day"); }} />
                        ) : view === "week" ? (
                            <WeekView cursor={cursor} today={today} byDate={byDate} holidaysByDate={holidaysByDate} onSelect={setSelected} />
                        ) : (
                            <ListView
                                days={view === "day" ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))}
                                today={today}
                                byDate={byDate}
                                holidaysByDate={holidaysByDate}
                                loading={status === "loading"}
                                canWrite={canWrite}
                                onSelect={setSelected}
                                onCreate={openCreate}
                            />
                        )}
                    </div>
                )}
            </Card>

            <FormDrawer
                open={createOpen || pending}
                title="Create Session"
                description="Fields marked * are required."
                fields={createFields}
                initial={{ date: cursor, time: "19:00", durationMin: 60, repeatWeeks: 0 }}
                submitLabel="Create session"
                onClose={closeCreate}
                onSubmit={async (v) => {
                    const batch = batches.find((b) => b.name === v.batch);
                    try {
                        const result = await apiClient.post<{ created: AdminSession[]; skippedHolidays: string[] }>("/api/admin/sessions", {
                            batchId: batch?.id ?? "",
                            title: v.title,
                            date: v.date,
                            time: v.time,
                            durationMin: v.durationMin,
                            link: v.link,
                            topics: v.topics,
                            repeatWeeks: v.repeatWeeks ?? 0,
                        });
                        const first = result.data.created[0];
                        const skipped = result.data.skippedHolidays.length;
                        toast.success(result.data.created.length > 1 ? `${result.data.created.length} sessions scheduled` : "Session scheduled", {
                            description: `${first.title} · ${formatDate(first.date)}, ${formatTime(`${first.date}T${first.time}`)}${skipped ? ` · ${skipped} ${skipped === 1 ? "date" : "dates"} skipped for holidays` : ""}`,
                        });
                        closeCreate();
                        setCursor(first.date);
                        refetch();
                    } catch (caught) {
                        return formErrors(caught, { batchId: "batch" });
                    }
                }}
            />

            <FormDrawer
                open={editing !== null}
                title="Edit Session"
                description={editing ? `${editing.batch} · ${editing.course}` : undefined}
                fields={editFields}
                initial={editing ? { title: editing.title, date: editing.date, time: editing.time, durationMin: editing.durationMin, link: editing.link, topics: editing.topics } : undefined}
                submitLabel="Save changes"
                onClose={() => setEditing(null)}
                onSubmit={async (v) => {
                    if (!editing) return;
                    try {
                        const result = await apiClient.patch<AdminSession>(`/api/admin/sessions/${editing.id}`, {
                            title: v.title,
                            date: v.date,
                            time: v.time,
                            durationMin: v.durationMin,
                            link: v.link,
                            topics: v.topics,
                        });
                        toast.success("Session updated", { description: `${result.data.title} · ${formatDate(result.data.date)}, ${formatTime(`${result.data.date}T${result.data.time}`)}` });
                        setEditing(null);
                        refetch();
                    } catch (caught) {
                        return formErrors(caught);
                    }
                }}
            />

            <FormDrawer
                open={holidayOpen}
                title="Mark as Holiday"
                description="Classes scheduled on this day are cancelled and learners see the holiday on their calendar."
                fields={holidayFields}
                initial={{ date: cursor, branch: branchRequired ? (branches[0] ?? "") : "All branches" }}
                submitLabel="Mark holiday"
                onClose={() => setHolidayOpen(false)}
                onSubmit={async (v) => {
                    try {
                        const result = await apiClient.post<{ holiday: AdminHoliday; cancelled: number }>("/api/admin/sessions/holidays", {
                            date: v.date,
                            reason: v.reason,
                            branch: v.branch === "All branches" ? "" : v.branch,
                        });
                        const n = result.data.cancelled;
                        toast.success("Holiday added", { description: n ? `${n} scheduled ${n === 1 ? "session was" : "sessions were"} cancelled.` : "No scheduled sessions were affected." });
                        setHolidayOpen(false);
                        setCursor(result.data.holiday.date);
                        refetch();
                    } catch (caught) {
                        return formErrors(caught);
                    }
                }}
            />

            <Modal
                open={removing !== null}
                onClose={() => setRemoving(null)}
                title="Remove this holiday?"
                description={removing ? `${removing.reason} · ${formatDate(removing.date)} · ${removing.branch || "All branches"}` : undefined}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setRemoving(null)}>Keep holiday</Button>
                        <Button variant="danger" disabled={removingBusy} onClick={removeHoliday}>Remove holiday</Button>
                    </>
                }
            >
                <p className="text-sm text-muted">Sessions that were cancelled because of this holiday stay cancelled. Schedule them again if classes will run.</p>
            </Modal>

            <Modal
                open={selected !== null}
                onClose={() => setSelected(null)}
                title={selected?.title ?? ""}
                description={selected ? `${formatDate(selected.date)} · ${formatTime(`${selected.date}T${selected.time}`)} · ${selected.durationMin} min` : undefined}
                size="lg"
            >
                {selected ? (
                    <SessionDetails
                        key={selected.id}
                        session={selected}
                        canWrite={canWrite}
                        onChanged={refetch}
                        onClose={() => setSelected(null)}
                        onEdit={() => {
                            setEditing(selected);
                            setSelected(null);
                        }}
                    />
                ) : null}
            </Modal>
        </>
    );
}

type Mark = "PRESENT" | "ABSENT";
const markOf = (value: string): Mark | undefined => (value === "Present" ? "PRESENT" : value === "Absent" ? "ABSENT" : undefined);

function SessionDetails({ session, canWrite, onChanged, onClose, onEdit }: { session: AdminSession; canWrite: boolean; onChanged: () => void; onClose: () => void; onEdit: () => void }) {
    const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
    const [loadError, setLoadError] = useState("");
    const [marks, setMarks] = useState<Record<string, Mark>>({});
    const [saving, setSaving] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [reason, setReason] = useState("");
    const [reasonError, setReasonError] = useState("");
    const [cancelBusy, setCancelBusy] = useState(false);

    const adopt = useCallback((next: AdminSessionDetail) => {
        setDetail(next);
        setMarks(Object.fromEntries(next.roster.flatMap((r) => { const m = markOf(r.mark); return m ? [[r.userId, m] as const] : []; })));
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        apiClient
            .get<AdminSessionDetail>(`/api/admin/sessions/${session.id}`, undefined, { signal: controller.signal })
            .then((result) => adopt(result.data))
            .catch((error: unknown) => {
                if (!controller.signal.aborted) setLoadError(failure(error, "Could not load this session."));
            });
        return () => controller.abort();
    }, [session.id, adopt]);

    const live = detail ?? session;
    const cancelled = live.status === "Cancelled";
    const editable = canWrite && !cancelled;
    const markable = canWrite && detail?.canMarkAttendance === true;
    const saved = new Map((detail?.roster ?? []).map((r) => [r.userId, markOf(r.mark)]));
    const dirty = (detail?.roster ?? []).some((r) => marks[r.userId] !== saved.get(r.userId));
    const marked = Object.keys(marks).length;

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const result = await apiClient.put<AdminSessionDetail>(`/api/admin/sessions/${session.id}/attendance`, { marks: Object.entries(marks).map(([userId, status]) => ({ userId, status })) });
            adopt(result.data);
            toast.success("Attendance saved", { description: `${result.data.attended} of ${result.data.enrolled} present` });
            onChanged();
        } catch (error) {
            toast.error(failure(error, "Could not save attendance."));
        } finally {
            setSaving(false);
        }
    };

    const cancelSession = async () => {
        if (reason.trim().length < 3) {
            setReasonError("Say why the session is cancelled.");
            return;
        }
        setCancelBusy(true);
        try {
            await apiClient.post(`/api/admin/sessions/${session.id}/cancel`, { reason });
            toast.success("Session cancelled", { description: session.title });
            onChanged();
            onClose();
        } catch (error) {
            if (error instanceof ApiError && error.fields.reason) setReasonError(error.fields.reason);
            else toast.error(failure(error, "Could not cancel this session."));
        } finally {
            setCancelBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-3 gap-y-3 text-sm">
                <dt className="text-muted">Status</dt>
                <dd className="col-span-2"><Badge tone={toneFor(live.status)}>{live.status}</Badge></dd>
                <dt className="text-muted">Batch</dt>
                <dd className="col-span-2">{live.batch}</dd>
                <dt className="text-muted">Course</dt>
                <dd className="col-span-2">{live.course}</dd>
                <dt className="text-muted">Instructor</dt>
                <dd className="col-span-2">{live.instructor || "Not assigned"}</dd>
                <dt className="text-muted">Attendance</dt>
                <dd className="col-span-2">{live.status === "Completed" ? `${live.attended} of ${live.enrolled} present` : `${live.enrolled} enrolled`}</dd>
                {live.link && !cancelled ? (
                    <>
                        <dt className="text-muted">Class link</dt>
                        <dd className="col-span-2 min-w-0">
                            <a href={live.link} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-accent underline underline-offset-2">
                                <span className="truncate">{live.link}</span>
                                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                                <span className="sr-only">(opens in a new tab)</span>
                            </a>
                        </dd>
                    </>
                ) : null}
                {live.topics ? (
                    <>
                        <dt className="text-muted">Topics</dt>
                        <dd className="col-span-2 whitespace-pre-wrap">{live.topics}</dd>
                    </>
                ) : null}
                {cancelled ? (
                    <>
                        <dt className="text-muted">Cancelled because</dt>
                        <dd className="col-span-2">{live.cancelReason || "No reason given"}</dd>
                    </>
                ) : null}
            </dl>

            {!cancelled ? (
                <section aria-label="Attendance" className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">Attendance</h3>
                        {markable && detail && detail.roster.length > 0 ? (
                            <Button size="sm" variant="soft-success" onClick={() => setMarks(Object.fromEntries(detail.roster.map((r) => [r.userId, "PRESENT" as Mark])))}>
                                Mark everyone present
                            </Button>
                        ) : null}
                    </div>
                    {loadError ? <p role="alert" className="text-sm text-danger">{loadError}</p> : null}
                    {!detail && !loadError ? <p role="status" className="text-sm text-muted">Loading the class list…</p> : null}
                    {detail && detail.roster.length === 0 ? <p className="text-sm text-muted">No learners are enrolled in this batch yet.</p> : null}
                    {detail && detail.roster.length > 0 ? (
                        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                            {detail.roster.map((r) => {
                                const current = marks[r.userId];
                                return (
                                    <li key={r.userId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true"><UserRound className="size-4" /></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{r.name}</p>
                                            <p className="truncate text-xs text-muted">{r.regNo || r.email}</p>
                                        </div>
                                        {markable ? (
                                            <div role="group" aria-label={`Attendance for ${r.name}`} className="flex gap-1">
                                                <Button size="sm" variant={current === "PRESENT" ? "success" : "secondary"} aria-pressed={current === "PRESENT"} onClick={() => setMarks((prev) => ({ ...prev, [r.userId]: "PRESENT" }))}>Present</Button>
                                                <Button size="sm" variant={current === "ABSENT" ? "danger" : "secondary"} aria-pressed={current === "ABSENT"} onClick={() => setMarks((prev) => ({ ...prev, [r.userId]: "ABSENT" }))}>Absent</Button>
                                            </div>
                                        ) : (
                                            <Badge tone={r.mark === "Present" ? "success" : r.mark === "Absent" ? "danger" : "neutral"}>{r.mark}</Badge>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : null}
                    {canWrite && detail && !detail.canMarkAttendance ? <p className="text-xs text-muted">Attendance can be marked once the session has started.</p> : null}
                    {markable && detail && detail.roster.length > 0 ? (
                        <div className="flex justify-end">
                            <Button variant="success" disabled={saving || !dirty || marked === 0} onClick={saveAttendance}>Save attendance</Button>
                        </div>
                    ) : null}
                </section>
            ) : null}

            {editable && cancelling ? (
                <section aria-label="Cancel this session" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                    <Field id="cancel-reason" label="Why is it cancelled?" required help="Learners of this batch see this reason." error={reasonError}>
                        <textarea
                            id="cancel-reason"
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
                            rows={3}
                            maxLength={300}
                            className={cn(inputClass, "h-auto py-2")}
                            aria-invalid={reasonError ? true : undefined}
                            aria-describedby={reasonError ? "cancel-reason-error" : "cancel-reason-help"}
                            autoFocus
                        />
                    </Field>
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="secondary" onClick={() => { setCancelling(false); setReasonError(""); }}>Keep session</Button>
                        <Button variant="danger" disabled={cancelBusy} onClick={cancelSession}>Cancel session</Button>
                    </div>
                </section>
            ) : editable ? (
                <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                    <Button variant="soft-info" onClick={onEdit}><Pencil className="size-4" aria-hidden="true" />Edit or reschedule</Button>
                    <Button variant="soft-danger" onClick={() => setCancelling(true)}>Cancel session</Button>
                </div>
            ) : null}
        </div>
    );
}

function SessionChip({ s, onSelect, compact }: { s: AdminSession; onSelect: (s: AdminSession) => void; compact?: boolean }) {
    const color = courseColor(s.course);
    return (
        <button
            type="button"
            onClick={() => onSelect(s)}
            className={cn("session-chip", color.tile, compact && "is-compact", s.status === "Cancelled" && "line-through opacity-65")}
        >
            <span className="flex flex-wrap items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 font-bold tabular-nums"><Clock3 className="size-3" aria-hidden="true" />{formatTime(`${s.date}T${s.time}`)}</span>
                {!compact ? <span className="text-[10px] opacity-80">{s.durationMin} min</span> : null}
            </span>
            <span className="mt-1.5 block font-semibold leading-relaxed">{s.title}</span>
            {!compact ? (
                <>
                    <span className="mt-1 block text-[11px] opacity-80">{s.batch}</span>
                    {s.instructor ? <span className="mt-2 inline-flex items-center gap-1 text-[11px]"><UserRound className="size-3 shrink-0" aria-hidden="true" />{s.instructor}</span> : null}
                    <span className="mt-2 flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase">{s.status === "Completed" ? <CircleCheck className="size-3" aria-hidden="true" /> : null}{s.status}</span>
                </>
            ) : <span className="sr-only">, {s.status}</span>}
        </button>
    );
}

function HolidayTag({ holiday }: { holiday: AdminHoliday }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-lg bg-gold-soft px-2 py-1 text-[11px] font-medium text-gold-strong" title={`${holiday.reason} · ${holiday.branch || "All branches"}`}>
            <PartyPopper className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">Holiday: {holiday.reason}</span>
        </span>
    );
}

type ViewProps = { today: string; byDate: Map<string, AdminSession[]>; holidaysByDate: Map<string, AdminHoliday[]>; onSelect: (s: AdminSession) => void };

function WeekView({ cursor, today, byDate, holidaysByDate, onSelect }: ViewProps & { cursor: string }) {
    const start = startOfWeek(cursor);
    return (
        <div className="calendar-week" role="region" aria-label="Weekly sessions">
            <div className="calendar-week-grid">
                {weekdays.map((w, i) => {
                    const d = addDays(start, i);
                    const list = byDate.get(d) ?? [];
                    const off = holidaysByDate.get(d) ?? [];
                    return (
                        <section key={d} aria-label={formatDate(d)} className={cn("calendar-day-column", d === today && "is-today")}>
                            <h3 className="calendar-day-heading">
                                <span>{w}</span><span className="calendar-day-number">{d.slice(8)}</span>
                                <span className="text-[10px] font-medium">{list.length} {list.length === 1 ? "session" : "sessions"}</span>
                            </h3>
                            <div className="flex flex-col gap-2 p-2">
                                {off.map((h) => <HolidayTag key={h.id} holiday={h} />)}
                                {list.length ? list.map((s) => <SessionChip key={s.id} s={s} onSelect={onSelect} />) : off.length ? null : <div className="calendar-free-day"><CalendarDays className="mx-auto mb-2 size-5 opacity-50" aria-hidden="true" /><p>No sessions</p></div>}
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}

function MonthView({ cursor, today, byDate, holidaysByDate, onSelect, onDay }: ViewProps & { cursor: string; onDay: (d: string) => void }) {
    const first = startOfMonth(cursor);
    const gridStart = startOfWeek(first);
    const month = first.slice(0, 7);
    return (
        <div className="relative overflow-x-auto" role="region" aria-label="Monthly sessions; scroll horizontally for more days" tabIndex={0}>
            <div className="min-w-[720px]">
                <div className="calendar-month-heading grid grid-cols-7 text-center text-xs font-semibold" aria-hidden="true">
                    {weekdays.map((w) => (
                        <div key={w} className="py-2">
                            {w}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {Array.from({ length: 42 }, (_, i) => {
                        const d = addDays(gridStart, i);
                        const list = byDate.get(d) ?? [];
                        const off = holidaysByDate.get(d) ?? [];
                        const inMonth = d.startsWith(month);
                        return (
                            <div key={d} className={cn("calendar-month-cell min-h-36 border-r border-b border-border p-2 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-surface-muted/50")}>
                                <button
                                    type="button"
                                    onClick={() => onDay(d)}
                                    aria-label={`${formatDate(d)}, ${list.length} sessions${off.length ? `, holiday: ${off.map((h) => h.reason).join(", ")}` : ""}. Open day view`}
                                    className={cn(
                                        "mb-2 flex size-9 items-center justify-center rounded-xl text-sm font-semibold hover:bg-accent-soft",
                                        d === today && "bg-info text-accent-fg hover:bg-info",
                                        !inMonth && "text-muted",
                                    )}
                                >
                                    {Number(d.slice(8))}
                                </button>
                                <div className="flex flex-col gap-1">
                                    {off.map((h) => <HolidayTag key={h.id} holiday={h} />)}
                                    {list.slice(0, 2).map((s) => (
                                        <SessionChip key={s.id} s={s} onSelect={onSelect} compact />
                                    ))}
                                    {list.length > 2 ? (
                                        <button type="button" onClick={() => onDay(d)} className="px-1 text-left text-xs font-medium text-accent hover:underline">
                                            +{list.length - 2} more
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function ListView({ days, today, byDate, holidaysByDate, loading, canWrite, onSelect, onCreate }: ViewProps & { days: string[]; loading: boolean; canWrite: boolean; onCreate: () => void }) {
    const shown = days.filter((d) => (byDate.get(d) ?? []).length > 0 || (holidaysByDate.get(d) ?? []).length > 0);
    if (shown.length === 0) {
        return loading ? (
            <p role="status" className="px-6 py-14 text-center text-sm text-muted">Loading sessions…</p>
        ) : (
            <EmptyState
                icon={<CalendarDays className="size-5" />}
                title="No sessions in this period"
                description={canWrite ? "Use the arrows to move to another date, or create a session." : "Use the arrows to move to another date."}
                action={canWrite ? <Button variant="gold" onClick={onCreate}>Create Session</Button> : undefined}
            />
        );
    }
    return (
        <div className="divide-y divide-border">
            {shown.map((d) => (
                <section key={d} aria-label={formatDate(d)} className="grid gap-3 px-4 py-4 md:grid-cols-[160px_1fr]">
                    <h3 className="text-sm font-semibold">
                        {weekdays[weekday(d)]}, {formatDate(d)}
                        {d === today ? <Badge tone="accent" className="ml-2">Today</Badge> : null}
                    </h3>
                    <ul className="flex flex-col gap-2">
                        {(holidaysByDate.get(d) ?? []).map((h) => (
                            <li key={h.id}><HolidayTag holiday={h} /></li>
                        ))}
                        {(byDate.get(d) ?? []).map((s) => (
                            <li key={s.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(s)}
                                    className={cn("session-agenda-card flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-4 text-left text-sm", courseColor(s.course).tile)}
                                >
                                    <span className="w-20 font-semibold tabular-nums">{formatTime(`${s.date}T${s.time}`)}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className={cn("block font-medium", s.status === "Cancelled" && "line-through")}>{s.title}</span>
                                        <span className="block text-xs text-muted">
                                            {s.batch}{s.instructor ? ` · ${s.instructor}` : ""} · {s.durationMin} min
                                        </span>
                                    </span>
                                    <Badge tone={toneFor(s.status)}>{s.status}</Badge>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
