"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DEMO_TODAY, addDays, batches, type DemoSession } from "@/lib/admin/demo-data";
import type { FormField } from "@/lib/admin/types";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useAdminUi } from "@/store/admin-ui";
import { Badge, toneFor } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { FormDrawer } from "../FormDrawer";
import { DemoNotice, PageHeader } from "../PageHeader";

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

const fields: FormField[] = [
  { key: "title", label: "Session title", type: "text", required: true, placeholder: "Gita – Class 15" },
  { key: "batch", label: "Batch", type: "select", options: batches.map((b) => b.name), required: true },
  { key: "date", label: "Date", type: "date", required: true },
  { key: "time", label: "Start time (IST)", type: "time", required: true },
  { key: "durationMin", label: "Duration (minutes)", type: "number", required: true, placeholder: "60" },
  { key: "link", label: "Live class link", type: "url", placeholder: "https://", help: "Zoom/Meet integration will be decided with IBMV." },
];

export function SessionsCalendar({ sessions: initial }: { sessions: DemoSession[] }) {
  const [sessions, setSessions] = useState(initial);
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(DEMO_TODAY);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<DemoSession | null>(null);
  const pending = useAdminUi((s) => s.pendingCreate === "learning/sessions");
  const setPending = useAdminUi((s) => s.setPendingCreate);

  const byDate = useMemo(() => {
    const map = new Map<string, DemoSession[]>();
    for (const s of sessions) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return map;
  }, [sessions]);

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

  const closeCreate = () => {
    setCreateOpen(false);
    if (pending) setPending(null);
  };

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Schedule and track live classes across all batches. Times are shown in IST."
        status="ready"
        actions={
          <Button variant="gold" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Create Session
          </Button>
        }
      />
      <DemoNotice />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setCursor(DEMO_TODAY)}>
              Today
            </Button>
            <IconButton label={`Previous ${view === "list" ? "week" : view}`} onClick={() => step(-1)}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton label={`Next ${view === "list" ? "week" : view}`} onClick={() => step(1)}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </IconButton>
            <h2 className="ml-1 font-serif text-xl font-semibold" aria-live="polite">
              {heading}
            </h2>
          </div>
          <Tabs
            label="Calendar view"
            value={view}
            onChange={setView}
            items={[
              { value: "list", label: "List" },
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </div>

        {view === "month" ? (
          <MonthView cursor={cursor} byDate={byDate} onSelect={setSelected} onDay={(d) => { setCursor(d); setView("day"); }} />
        ) : view === "week" ? (
          <WeekView cursor={cursor} byDate={byDate} onSelect={setSelected} />
        ) : (
          <ListView
            days={view === "day" ? [cursor] : Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))}
            byDate={byDate}
            onSelect={setSelected}
            onCreate={() => setCreateOpen(true)}
          />
        )}
      </Card>

      <FormDrawer
        open={createOpen || pending}
        title="Create Session"
        description="Fields marked * are required."
        fields={fields}
        initial={{ date: cursor, time: "19:00", durationMin: 60 }}
        submitLabel="Create session"
        onClose={closeCreate}
        onSubmit={(v) => {
          const b = batches.find((x) => x.name === v.batch) ?? batches[0];
          const s: DemoSession = {
            id: `new-${sessions.length + 1}`,
            title: String(v.title),
            batch: b.name,
            course: b.course,
            instructor: b.instructor,
            date: String(v.date),
            time: String(v.time),
            durationMin: Number(v.durationMin) || 60,
            status: "Scheduled",
            enrolled: 0,
            attended: 0,
            topics: "—",
          };
          setSessions((prev) => [...prev, s].sort((a, c) => `${a.date}${a.time}`.localeCompare(`${c.date}${c.time}`)));
          setCursor(s.date);
          closeCreate();
          toast.success("Session scheduled", { description: `${s.title} · ${formatDate(s.date)}, ${formatTime(`${s.date}T${s.time}`)}` });
        }}
      />

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        description={selected ? `${formatDate(selected.date)} · ${formatTime(`${selected.date}T${selected.time}`)} · ${selected.durationMin} min` : undefined}
        footer={
          selected?.status === "Scheduled" ? (
            <Button
              variant="danger"
              onClick={() => {
                setSessions((prev) => prev.map((s) => (s.id === selected.id ? { ...s, status: "Cancelled" } : s)));
                toast.success("Session cancelled", { description: selected.title });
                setSelected(null);
              }}
            >
              Cancel session
            </Button>
          ) : undefined
        }
      >
        {selected ? (
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-muted">Status</dt>
            <dd className="col-span-2">
              <Badge tone={toneFor(selected.status)}>{selected.status}</Badge>
            </dd>
            <dt className="text-muted">Batch</dt>
            <dd className="col-span-2">{selected.batch}</dd>
            <dt className="text-muted">Course</dt>
            <dd className="col-span-2">{selected.course}</dd>
            <dt className="text-muted">Instructor</dt>
            <dd className="col-span-2">{selected.instructor}</dd>
            <dt className="text-muted">Attendance</dt>
            <dd className="col-span-2">{selected.status === "Completed" ? `${selected.attended} of ${selected.enrolled}` : `${selected.enrolled} enrolled`}</dd>
            <dt className="text-muted">Topics</dt>
            <dd className="col-span-2">{selected.topics}</dd>
          </dl>
        ) : null}
      </Modal>
    </>
  );
}

function SessionChip({ s, onSelect, compact }: { s: DemoSession; onSelect: (s: DemoSession) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(s)}
      className={cn(
        "w-full rounded-md border-l-4 px-2 py-1 text-left text-xs transition-colors hover:brightness-95",
        s.status === "Cancelled" ? "border-danger bg-danger-soft line-through opacity-75" : s.status === "Completed" ? "border-success bg-success-soft" : "border-accent bg-accent-soft",
      )}
    >
      <span className="font-semibold tabular-nums">{formatTime(`${s.date}T${s.time}`)}</span>{" "}
      <span className={cn(compact && "hidden xl:inline")}>{s.title}</span>
      <span className="sr-only">, {s.status}</span>
    </button>
  );
}

function WeekView({ cursor, byDate, onSelect }: { cursor: string; byDate: Map<string, DemoSession[]>; onSelect: (s: DemoSession) => void }) {
  const start = startOfWeek(cursor);
  return (
    <div className="relative overflow-x-auto">
      <div className="grid min-w-[840px] grid-cols-7 divide-x divide-border">
        {weekdays.map((w, i) => {
          const d = addDays(start, i);
          const list = byDate.get(d) ?? [];
          return (
            <section key={d} aria-label={formatDate(d)} className="min-h-80">
              <h3 className={cn("border-b border-border px-2 py-2 text-center text-xs font-semibold", d === DEMO_TODAY && "bg-accent text-accent-fg")}>
                {w} <span className="block text-lg font-semibold">{d.slice(8)}</span>
              </h3>
              <div className="flex flex-col gap-1.5 p-2">
                {list.length ? list.map((s) => <SessionChip key={s.id} s={s} onSelect={onSelect} />) : <p className="py-4 text-center text-xs text-muted">No sessions</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({
  cursor,
  byDate,
  onSelect,
  onDay,
}: {
  cursor: string;
  byDate: Map<string, DemoSession[]>;
  onSelect: (s: DemoSession) => void;
  onDay: (d: string) => void;
}) {
  const first = startOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const month = first.slice(0, 7);
  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-border text-center text-xs font-semibold text-muted" aria-hidden="true">
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
            const inMonth = d.startsWith(month);
            return (
              <div key={d} className={cn("min-h-28 border-r border-b border-border p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-surface-muted/50")}>
                <button
                  type="button"
                  onClick={() => onDay(d)}
                  aria-label={`${formatDate(d)}, ${list.length} sessions. Open day view`}
                  className={cn(
                    "mb-1 flex size-7 items-center justify-center rounded-full text-xs font-medium hover:bg-accent-soft",
                    d === DEMO_TODAY && "bg-accent text-accent-fg hover:bg-accent",
                    !inMonth && "text-muted",
                  )}
                >
                  {Number(d.slice(8))}
                </button>
                <div className="flex flex-col gap-1">
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

function ListView({
  days,
  byDate,
  onSelect,
  onCreate,
}: {
  days: string[];
  byDate: Map<string, DemoSession[]>;
  onSelect: (s: DemoSession) => void;
  onCreate: () => void;
}) {
  const withSessions = days.filter((d) => (byDate.get(d) ?? []).length);
  if (withSessions.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-5" />}
        title="No sessions in this period"
        description="Use the arrows to move to another date, or create a session."
        action={
          <Button variant="gold" onClick={onCreate}>
            Create Session
          </Button>
        }
      />
    );
  }
  return (
    <div className="divide-y divide-border">
      {withSessions.map((d) => (
        <section key={d} aria-label={formatDate(d)} className="grid gap-3 px-4 py-4 md:grid-cols-[160px_1fr]">
          <h3 className="text-sm font-semibold">
            {weekdays[weekday(d)]}, {formatDate(d)}
            {d === DEMO_TODAY ? <Badge tone="accent" className="ml-2">Today</Badge> : null}
          </h3>
          <ul className="flex flex-col gap-2">
            {(byDate.get(d) ?? []).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border px-4 py-3 text-left text-sm hover:bg-accent-soft/50"
                >
                  <span className="w-20 font-semibold tabular-nums">{formatTime(`${s.date}T${s.time}`)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.title}</span>
                    <span className="block text-xs text-muted">
                      {s.batch} · {s.instructor} · {s.durationMin} min
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
