import { BookOpen, CalendarDays, ChartNoAxesCombined, CircleCheck, CircleDashed, CircleDot, Clock3, FileText, Hash, IndianRupee, Layers3, Mail, Tags, UserRound, Users } from "lucide-react";
import type { CellValue, Column, Row } from "@/lib/admin/types";
import { formatDate, formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { cardCycle, palette } from "@/lib/colors";
import { Badge, toneFor } from "@/components/ui/Badge";

export const columnIcons = {
  date: CalendarDays, currency: IndianRupee, progress: ChartNoAxesCombined,
  number: Hash, status: CircleDot, tags: Tags, contact: Mail,
  person: UserRound, course: BookOpen, group: Users, primary: Layers3, text: FileText,
};

export function columnIcon(column: Column): keyof typeof columnIcons {
  if (column.type === "date" || column.type === "datetime" || column.key === "duration") return "date";
  if (column.type === "currency") return "currency";
  if (column.type === "progress" || column.type === "percent") return "progress";
  if (column.type === "number") return "number";
  if (column.type === "badge") return "status";
  if (column.type === "tags") return "tags";
  if (/email|contact/i.test(`${column.key} ${column.label}`)) return "contact";
  if (/instructor|manager|learner|author/i.test(`${column.key} ${column.label}`) && column.key !== "email") return "person";
  if (/course|module/i.test(column.key)) return "course";
  if (/batch|group|segment/i.test(`${column.key} ${column.label}`)) return "group";
  return column.type === "primary" ? "primary" : "text";
}

const thumbClass: Record<string, string> = {
  accent: "from-accent to-accent/60",
  gold: "from-gold to-gold/50",
  lotus: "from-lotus-pink to-lotus-pink/50",
};

function identityColor(value: string) {
  const hash = Array.from(value).reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0);
  return palette[cardCycle[hash % cardCycle.length]];
}

export function cellText(column: Column, value: CellValue): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  switch (column.type) {
    case "date":
      return formatDate(String(value));
    case "datetime":
      return formatDateTime(String(value));
    case "currency":
      return formatINR(Number(value));
    case "number":
      return formatNumber(Number(value));
    case "percent":
    case "progress":
      return `${value}%`;
    default:
      return String(value);
  }
}

export function CellView({ column, row }: { column: Column; row: Row }) {
  const value = row[column.key];
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-muted">—</span>;
  }

  switch (column.type) {
    case "primary": {
      const sub = column.subKey ? row[column.subKey] : null;
      const Icon = columnIcons[columnIcon(column)];
      const person = Icon === UserRound || (column.key === "name" && typeof row.email === "string");
      const initials = String(value).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      return (
        <div className="admin-table-identity">
          <span className={cn("admin-table-avatar", person && "is-person", identityColor(String(value)).tile)} data-color="identity" aria-hidden="true">
            {person ? initials : <Icon className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold text-foreground", /batch/i.test(column.label) && "whitespace-nowrap")}>{String(value)}</p>
            {sub ? <p className="mt-0.5 text-xs text-muted">{column.subKey && /date|on$/i.test(column.subKey) ? formatDate(String(sub)) : String(sub)}</p> : null}
          </div>
        </div>
      );
    }
    case "badge": {
      const tone = toneFor(String(value), column.tones);
      const Icon = tone === "success" ? CircleCheck : tone === "warning" ? Clock3 : tone === "neutral" ? CircleDashed : CircleDot;
      return <Badge tone={tone} className="admin-table-status"><Icon className="size-3" aria-hidden="true" />{String(value)}</Badge>;
    }
    case "tags":
      return (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : [String(value)]).map((t) => (
            <Badge key={t} tone="neutral" className={identityColor(t).tile}>
              {t}
            </Badge>
          ))}
        </div>
      );
    case "progress": {
      const pct = Math.max(0, Math.min(100, Number(value)));
      return (
        <div className={cn("flex min-w-36 items-center gap-3", pct >= 75 ? palette.emerald.text : pct >= 40 ? palette.blue.text : palette.orange.text)}>
          <div className="admin-table-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={column.label}>
            <div className="admin-table-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-bold tabular-nums">{pct}%</span>
        </div>
      );
    }
    case "thumbnail":
      return <div className={cn("h-10 w-16 rounded-md bg-linear-to-br", thumbClass[String(value)] ?? thumbClass.accent)} aria-hidden="true" />;
    case "currency":
    case "number":
    case "percent":
      return <span className={cn("font-medium tabular-nums", column.type === "currency" && "text-foreground")}>{cellText(column, value)}</span>;
    case "date":
    case "datetime":
      return <span className="whitespace-nowrap text-muted tabular-nums">{cellText(column, value)}</span>;
    default: {
      if (column.key === "duration") {
        const dates = String(value).split(" – ");
        return dates.length === 2 ? (
          <span className="flex flex-col gap-0.5 whitespace-nowrap text-xs tabular-nums text-muted">
            <span>{dates[0]}</span>
            <span>– {dates[1]}</span>
          </span>
        ) : <span className="whitespace-nowrap text-muted">{cellText(column, value)}</span>;
      }
      return <span className={cn("block min-w-28 max-w-72", column.key === "course" && "min-w-44")}>{cellText(column, value)}</span>;
    }
  }
}
