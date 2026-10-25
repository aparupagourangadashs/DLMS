"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Lightweight disclosure popover: closes on outside click and Escape, returns focus to the trigger. */
export function Popover({
  trigger,
  label,
  children,
  align = "right",
  panelClassName,
}: {
  trigger: (props: { open: boolean; toggle: () => void; ref: React.RefObject<HTMLButtonElement | null> }) => React.ReactNode;
  label: string;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), ref: triggerRef })}
      {open ? (
        <div
          role="region"
          aria-label={label}
          className={cn(
            "absolute top-full z-40 mt-2 min-w-56 rounded-xl border border-border bg-surface p-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
