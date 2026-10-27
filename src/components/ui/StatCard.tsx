import type { Tone } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { palette, type ColorKey } from "@/lib/colors";
import { TrendingDown, TrendingUp } from "lucide-react";

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

const cardGradient: Record<ColorKey, string> = {
  indigo: "from-indigo-50 via-white to-violet-50",
  violet: "from-violet-50 via-white to-fuchsia-50",
  blue: "from-blue-50 via-white to-sky-50",
  teal: "from-teal-50 via-white to-cyan-50",
  rose: "from-rose-50 via-white to-pink-50",
  orange: "from-orange-50 via-white to-amber-50",
  emerald: "from-emerald-50 via-white to-teal-50",
  amber: "from-amber-50 via-white to-yellow-50",
  slate: "from-slate-100 via-white to-blue-50",
  sky: "from-sky-50 via-white to-cyan-50",
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
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  change?: number;
  icon?: React.ReactNode;
  color?: ColorKey;
  trend?: { labels: string[]; values: number[]; unit?: string };
}) {
  const up = (change ?? 0) >= 0;
  const c = palette[color];
  return (
    <div className={cn("admin-stat-card relative overflow-hidden rounded-2xl border border-border bg-linear-to-br p-4 shadow-card dark:bg-surface dark:from-surface dark:via-surface dark:to-surface", cardGradient[color])}>
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
      {trend ? <Sparkline label={label} trend={trend} color={c.text} /> : null}
    </div>
  );
}

function Sparkline({ label, trend, color }: { label: string; trend: { labels: string[]; values: number[]; unit?: string }; color: string }) {
  const max = Math.max(1, ...trend.values);
  const points = trend.values.map((value, index) => ({
    x: 4 + (index * 192) / Math.max(1, trend.values.length - 1),
    y: 44 - (value / max) * 36,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  return (
    <figure className={cn("mt-3", color)}>
      <svg viewBox="0 0 200 50" className="h-14 w-full" role="img" aria-label={`${label}: seven-day trend`}>
        <path d={`${line} L196,48 L4,48 Z`} fill="currentColor" opacity={0.1} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={2.5} fill="currentColor"><title>{`${trend.labels[index]}: ${trend.values[index]}${trend.unit ?? ""}`}</title></circle>)}
      </svg>
      <figcaption className="sr-only">{trend.values.map((value, index) => `${trend.labels[index]}: ${value}${trend.unit ?? ""}`).join("; ")}</figcaption>
    </figure>
  );
}
