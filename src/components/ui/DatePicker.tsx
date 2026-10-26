"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover } from "./Popover";
import { Select } from "./Select";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, i, 1))));
const dateLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function parse(value: string) { return new Date(`${value}T00:00:00Z`); }
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type Props = Omit<React.ComponentProps<"button">, "value" | "onChange" | "children"> & {
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  placeholder?: string;
};

export function DatePicker({ value, onValueChange, min, max, required, placeholder = "Choose a date", className, name, id, ...props }: Props) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const panelId = `${triggerId}-calendar`;
  return (
    <Popover
      id={panelId}
      label={props["aria-label"] ?? "Choose a date"}
      className={className}
      panelClassName="date-picker-panel"
      trigger={({ open, toggle, ref }) => (
        <>
          {name ? <input type="hidden" name={name} value={value} /> : null}
          <button {...props} ref={ref} id={triggerId} type="button" className="admin-select-trigger date-picker-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
            <CalendarDays className="size-4 shrink-0 text-info" aria-hidden="true" />
            <span className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted")}>{value ? dateLabel.format(parse(value)) : placeholder}</span>
            <ChevronDown className={cn("size-4 shrink-0 text-accent transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        </>
      )}
    >
      {(close, open) => open ? (
        <CalendarPanel
          value={value}
          min={min}
          max={max}
          required={required}
          onChoose={(date) => {
            onValueChange(date);
            close();
            document.getElementById(triggerId)?.focus();
          }}
        />
      ) : null}
    </Popover>
  );
}

function CalendarPanel({ value, min, max, required, onChoose }: Pick<Props, "value" | "min" | "max" | "required"> & { onChoose: (date: string) => void }) {
  const today = todayIso();
  const clamp = (date: string) => min && date < min ? min : max && date > max ? max : date;
  const [focused, setFocused] = useState(() => clamp(value || today));
  const [month, setMonth] = useState(() => focused.slice(0, 7));
  const root = useRef<HTMLDivElement>(null);
  const first = parse(`${month}-01`);
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const moveMonth = (amount: number) => {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + amount);
    setMonth(iso(next).slice(0, 7));
  };
  const previous = new Date(first);
  previous.setUTCDate(0);
  const next = new Date(first);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const firstYear = Number(min?.slice(0, 4) ?? Math.min(1900, first.getUTCFullYear()));
  const lastYear = Number(max?.slice(0, 4) ?? Math.max(parse(today).getUTCFullYear() + 20, first.getUTCFullYear()));
  return (
    <div ref={root} role="dialog" aria-label="Calendar date selection">
      <div className="date-picker-header">
        <span className="inline-flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4" aria-hidden="true" />Choose your date</span>
        <span className="text-xs opacity-85">{first.getUTCFullYear()}</span>
      </div>
      <div className="flex items-center gap-1 p-2">
        <button type="button" aria-label="Previous month" className="date-picker-nav" disabled={Boolean(min && iso(previous) < min)} onClick={() => moveMonth(-1)}><ChevronLeft className="size-4" aria-hidden="true" /></button>
        <Select
          aria-label="Calendar month"
          value={month.slice(5)}
          className="min-w-0 flex-1"
          options={months.map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label, disabled: Boolean((min && `${first.getUTCFullYear()}-${String(i + 1).padStart(2, "0")}` < min.slice(0, 7)) || (max && `${first.getUTCFullYear()}-${String(i + 1).padStart(2, "0")}` > max.slice(0, 7))) }))}
          onValueChange={(m) => setMonth(`${month.slice(0, 4)}-${m}`)}
        />
        <Select aria-label="Calendar year" value={month.slice(0, 4)} className="w-24" options={Array.from({ length: lastYear - firstYear + 1 }, (_, i) => ({ value: String(firstYear + i), label: String(firstYear + i) }))} onValueChange={(year) => setMonth(clamp(`${year}-${month.slice(5)}-01`).slice(0, 7))} />
        <button type="button" aria-label="Next month" className="date-picker-nav" disabled={Boolean(max && iso(next) > max)} onClick={() => moveMonth(1)}><ChevronRight className="size-4" aria-hidden="true" /></button>
      </div>
      <div role="grid" aria-label={`${months[first.getUTCMonth()]} ${first.getUTCFullYear()}`} className="date-picker-grid">
        <div role="row" className="grid grid-cols-7">{dayNames.map((day) => <span key={day} role="columnheader" className="py-2 text-center text-xs font-semibold text-muted">{day}</span>)}</div>
        {Array.from({ length: 6 }, (_, week) => (
          <div key={week} role="row" className="grid grid-cols-7">
            {Array.from({ length: 7 }, (_, day) => {
              const date = new Date(start);
              date.setUTCDate(start.getUTCDate() + week * 7 + day);
              const dateIso = iso(date);
              const disabled = Boolean((min && dateIso < min) || (max && dateIso > max));
              const inMonth = dateIso.startsWith(month);
              return (
                <div key={dateIso} role="gridcell" aria-selected={value === dateIso}>
                  <button
                    type="button"
                    data-date={dateIso}
                    aria-label={dateLabel.format(date)}
                    aria-current={dateIso === today ? "date" : undefined}
                    disabled={disabled}
                    tabIndex={dateIso === focused || (!focused.startsWith(month) && dateIso === clamp(`${month}-01`)) ? 0 : -1}
                    className={cn("date-picker-day", !inMonth && "is-outside", value === dateIso && "is-selected", dateIso === today && "is-today")}
                    onClick={() => onChoose(dateIso)}
                    onKeyDown={(event) => {
                      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) return;
                      event.preventDefault();
                      const nextDate = new Date(date);
                      const offset = (date.getUTCDay() + 6) % 7;
                      if (event.key === "PageUp" || event.key === "PageDown") {
                        const dayOfMonth = nextDate.getUTCDate();
                        nextDate.setUTCDate(1);
                        nextDate.setUTCMonth(nextDate.getUTCMonth() + (event.key === "PageUp" ? -1 : 1));
                        const last = new Date(nextDate);
                        last.setUTCMonth(last.getUTCMonth() + 1);
                        last.setUTCDate(0);
                        nextDate.setUTCDate(Math.min(dayOfMonth, last.getUTCDate()));
                      } else nextDate.setUTCDate(date.getUTCDate() + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -7 : event.key === "ArrowDown" ? 7 : event.key === "Home" ? -offset : 6 - offset));
                      const target = clamp(iso(nextDate));
                      setFocused(target);
                      setMonth(target.slice(0, 7));
                      requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus());
                    }}
                  >{date.getUTCDate()}</button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border p-2">
        <button type="button" className="date-picker-shortcut" disabled={Boolean((min && today < min) || (max && today > max))} onClick={() => onChoose(today)}>Today</button>
        {!required ? <button type="button" className="date-picker-shortcut text-muted" onClick={() => onChoose("")}>Clear date</button> : <span className="text-xs text-muted">Select a day</span>}
      </div>
    </div>
  );
}

export function DateTimePicker({ value, onValueChange, name, ...props }: Props) {
  const [date = "", time = ""] = value.split("T");
  return (
    <div className="grid min-w-0 gap-2">
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <DatePicker {...props} value={date} onValueChange={(next) => onValueChange(next ? `${next}T${time || "09:00"}` : "")} />
      <label className="time-picker">
        <Clock3 className="size-4 shrink-0 text-info" aria-hidden="true" />
        <input type="time" aria-label="Time (IST)" value={time} disabled={props.disabled} onChange={(event) => onValueChange(`${date || todayIso()}T${event.target.value}`)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        <span className="text-xs font-semibold text-muted">IST</span>
      </label>
    </div>
  );
}
