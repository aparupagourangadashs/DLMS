import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Colour by meaning:
 * gold = main page action, success = save/create, warning = archive/holiday,
 * danger = delete/cancel, soft-* = secondary actions with a hint of meaning.
 */
export type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "soft-info"
  | "soft-success"
  | "soft-warning"
  | "soft-danger"
  | "soft-violet";
type Size = "sm" | "md";

const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-sm hover:brightness-110",
  secondary: "border border-border bg-surface text-foreground hover:bg-accent-soft",
  ghost: "text-foreground hover:bg-accent-soft",
  gold: "border border-[#d6ad20] bg-linear-to-b from-[#ffec82] via-[#ffdc4f] to-[#f4c929] text-[#302653] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_5px_rgba(185,150,47,0.35)] hover:from-[#fff1a3] hover:via-[#ffe36c] hover:to-[#f8d64a]",
  success: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 hover:bg-emerald-700",
  warning: "bg-amber-500 text-amber-950 shadow-sm shadow-amber-500/25 hover:bg-amber-400",
  danger: "bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700",
  "soft-info":
    "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20",
  "soft-success":
    "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
  "soft-warning":
    "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
  "soft-danger":
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
  "soft-violet":
    "border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
    variantClass[variant],
    className,
  );
}

type ButtonProps = React.ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function IconButton({
  label,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent-soft disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
