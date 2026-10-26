"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { palette, type ColorKey } from "@/lib/colors";

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: Array<{ value: T; label: string; count?: number; icon?: LucideIcon; color?: ColorKey }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 relative overflow-x-auto", className)}>
      {items.map((item) => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            data-color={item.color}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const idx = items.findIndex((i) => i.value === value);
              const next = items[(idx + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
              onChange(next.value);
              const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]");
              buttons?.[items.indexOf(next)]?.focus();
            }}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
              item.color
                ? cn(selected ? palette[item.color].solid : palette[item.color].tile, "hover:brightness-95 dark:hover:brightness-110")
                : selected ? "bg-accent text-accent-fg" : "text-muted hover:bg-accent-soft hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  selected ? "bg-white/20" : item.color ? "bg-current/10" : "bg-surface-muted",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
