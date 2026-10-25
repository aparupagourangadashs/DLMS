import type { CellValue, Column, Row } from "@/lib/admin/types";
import { formatDate, formatDateTime, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Badge, toneFor } from "@/components/ui/Badge";

const thumbClass: Record<string, string> = {
  accent: "from-accent to-accent/60",
  gold: "from-gold to-gold/50",
  lotus: "from-lotus-pink to-lotus-pink/50",
};

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
      return (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{String(value)}</p>
          {sub ? <p className="text-xs text-muted">{column.subKey && /date|on$/i.test(column.subKey) ? formatDate(String(sub)) : String(sub)}</p> : null}
        </div>
      );
    }
    case "badge":
      return <Badge tone={toneFor(String(value), column.tones)}>{String(value)}</Badge>;
    case "tags":
      return (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(value) ? value : [String(value)]).map((t) => (
            <Badge key={t} tone="neutral">
              {t}
            </Badge>
          ))}
        </div>
      );
    case "progress": {
      const pct = Math.max(0, Math.min(100, Number(value)));
      return (
        <div className="flex min-w-32 items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
            <div className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-accent")} style={{ width: `${pct}%` }} />
          </div>
          <span className="w-10 text-right text-xs tabular-nums text-muted">{pct}%</span>
        </div>
      );
    }
    case "thumbnail":
      return <div className={cn("h-10 w-16 rounded-md bg-linear-to-br", thumbClass[String(value)] ?? thumbClass.accent)} aria-hidden="true" />;
    case "currency":
    case "number":
    case "percent":
      return <span className="tabular-nums">{cellText(column, value)}</span>;
    default:
      return <span>{cellText(column, value)}</span>;
  }
}
