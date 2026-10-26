import { cn } from "@/lib/cn";

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Field({
  id,
  label,
  required,
  help,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-danger" aria-hidden="true">
            {" "}*
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-xs text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export { Select } from "./Select";
