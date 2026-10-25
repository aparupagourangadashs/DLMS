import type { Tone } from "@/lib/admin/types";
import { cn } from "@/lib/cn";

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
  gold: "bg-gold-soft text-gold-strong border-transparent",
};

const defaultTones: Record<string, Tone> = {
  active: "success",
  published: "success",
  evaluated: "success",
  completed: "success",
  sent: "success",
  available: "success",
  enrolled: "accent",
  registered: "info",
  scheduled: "info",
  draft: "warning",
  pending: "warning",
  "not evaluated": "warning",
  processing: "warning",
  "on leave": "warning",
  inactive: "neutral",
  hidden: "neutral",
  archived: "neutral",
  expired: "neutral",
  cancelled: "danger",
  failed: "danger",
  high: "danger",
  medium: "warning",
  low: "info",
};

export function toneFor(value: string, tones?: Record<string, Tone>): Tone {
  return tones?.[value] ?? defaultTones[value.toLowerCase()] ?? "neutral";
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
