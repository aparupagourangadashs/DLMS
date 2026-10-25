import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
    variant === "primary" && "bg-accent text-accent-fg shadow-sm hover:brightness-110",
    variant === "secondary" && "border border-border bg-surface text-foreground hover:bg-accent-soft",
    variant === "ghost" && "text-foreground hover:bg-accent-soft",
    variant === "danger" && "bg-danger text-white hover:brightness-110",
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
