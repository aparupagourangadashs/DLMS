import { TrendingDown, TrendingUp } from "lucide-react";
import type { Tone } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

const valueTone: Partial<Record<Tone, string>> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  accent: "text-accent",
};

export function StatCard({
  label,
  value,
  hint,
  tone,
  change,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  change?: number;
  icon?: React.ReactNode;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {icon ? <span className="text-muted" aria-hidden="true">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums", tone && valueTone[tone])}>{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
        {change !== undefined ? (
          <span className={cn("inline-flex items-center gap-1 font-medium", up ? "text-success" : "text-danger")}>
            {up ? <TrendingUp className="size-3.5" aria-hidden="true" /> : <TrendingDown className="size-3.5" aria-hidden="true" />}
            {up ? "+" : ""}
            {change}%<span className="sr-only">{up ? "increase" : "decrease"}</span>
          </span>
        ) : null}
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}
