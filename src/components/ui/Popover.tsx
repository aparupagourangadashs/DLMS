"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Native top-layer disclosure avoids clipping and sticky-table stacking contexts. */
export function Popover({
  trigger,
  label,
  children,
  align = "right",
  panelClassName,
  className,
  matchTriggerWidth = false,
  id,
  role = "region",
}: {
  trigger: (props: { open: boolean; toggle: () => void; close: () => void; ref: React.RefObject<HTMLButtonElement | null> }) => React.ReactNode;
  label: string;
  children: (close: () => void, open: boolean) => React.ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
  className?: string;
  matchTriggerWidth?: boolean;
  id?: string;
  role?: "region" | "listbox";
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      panelRef.current?.hidePopover();
      return;
    }
    const panel = panelRef.current;
    const button = triggerRef.current;
    if (!panel || !button) return;
    if (!panel.matches(":popover-open")) panel.showPopover();
    const position = () => {
      const anchor = button.getBoundingClientRect();
      const gap = 8;
      const edge = 8;
      if (matchTriggerWidth) panel.style.width = `${Math.min(anchor.width, window.innerWidth - edge * 2)}px`;
      const availableBelow = window.innerHeight - anchor.bottom - gap - edge;
      const availableAbove = anchor.top - gap - edge;
      const desiredHeight = Math.min(panel.scrollHeight, matchTriggerWidth ? 320 : window.innerHeight);
      const above = desiredHeight > availableBelow && availableAbove > availableBelow;
      panel.style.maxHeight = `${Math.max(0, Math.min(matchTriggerWidth ? 320 : window.innerHeight, above ? availableAbove : availableBelow))}px`;
      const rect = panel.getBoundingClientRect();
      const left = align === "right" ? anchor.right - rect.width : anchor.left;
      panel.style.left = `${Math.max(edge, Math.min(left, window.innerWidth - rect.width - edge))}px`;
      const top = above ? anchor.top - rect.height - gap : anchor.bottom + gap;
      panel.style.top = `${Math.max(edge, Math.min(top, window.innerHeight - rect.height - edge))}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const popovers = document.querySelectorAll(":popover-open");
        if (popovers[popovers.length - 1] !== panel) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target) && !button.contains(event.target)) {
        setOpen(false);
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target) && !button.contains(event.target)) {
        setOpen(false);
      }
    };
    observer.observe(panel);
    observer.observe(button);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open, align, matchTriggerWidth]);

  return (
    <div className={cn("relative min-w-0", className)}>
      {trigger({
        open,
        toggle: () => setOpen((current) => !current),
        close: () => setOpen(false),
        ref: triggerRef,
      })}
      <div
        id={id ?? panelId}
        ref={panelRef}
        popover="manual"
        role={role}
        aria-label={label}
        className={cn(
          "admin-popover fixed inset-auto m-0 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 text-foreground shadow-xl",
          !matchTriggerWidth && !panelClassName && "min-w-56",
          panelClassName,
        )}
      >
        {children(() => setOpen(false), open)}
      </div>
    </div>
  );
}
