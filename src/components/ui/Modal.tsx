"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "drawer" | "dialog";
  side?: "left" | "right";
  size?: "md" | "lg";
  className?: string;
};

/** Modal built on the native <dialog> element (focus trap, Esc to close, inert background). */
export function Modal({ open, onClose, title, description, children, footer, variant = "dialog", side = "right", size = "md", className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        "bg-surface text-foreground shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[1px]",
        variant === "drawer"
          ? cn("my-0 h-dvh max-h-dvh w-full border-border", side === "left" ? "mr-auto ml-0 border-r" : "mr-0 ml-auto border-l", size === "lg" ? "max-w-2xl" : "max-w-md")
          : cn("m-auto w-[calc(100%-2rem)] rounded-2xl border border-border", size === "lg" ? "max-w-2xl" : "max-w-md"),
        className,
      )}
    >
      {open ? (
        <div className={cn("flex flex-col", variant === "drawer" && "h-full")}>
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold">
                {title}
              </h2>
              {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
            </div>
            <IconButton label="Close" onClick={onClose}>
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
          <div className={cn("px-5 py-4", variant === "drawer" && "flex-1 overflow-y-auto")}>{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
