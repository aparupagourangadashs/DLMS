import { TrendingDown, TrendingUp } from "lucide-react";
import type { Tone } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { palette, type ColorKey } from "@/lib/colors";

const valueTone: Partial<Record<Tone, string>> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  accent: "text-accent",
};

const toneColor: Partial<Record<Tone, ColorKey>> = {
  success: "emerald",
  warning: "amber",
  danger: "rose",
  info: "sky",
  accent: "indigo",
  gold: "amber",
};

/** Picks a card colour from its tone, falling back to a rotating colour. */
export function statColor(tone: Tone | undefined, fallback: ColorKey): ColorKey {
  return (tone && toneColor[tone]) || fallback;
}

export function StatCard({
  label,
  value,
  hint,
  tone,
  change,
  icon,
  color = "indigo",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  change?: number;
  icon?: React.ReactNode;
  color?: ColorKey;
}) {
  const up = (change ?? 0) >= 0;
  const c = palette[color];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card">
      <span className={cn("absolute inset-x-0 top-0 h-1", c.bar)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <p className="pt-1 text-sm text-muted">{label}</p>
        {icon ? (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-[18px]", c.tile)} aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", tone && valueTone[tone])}>{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
        {change !== undefined ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
              up ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
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
