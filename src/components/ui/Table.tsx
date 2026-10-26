import { Columns3, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function TableScroll({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("admin-table-scroll", className)} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export function TableHeading({ children, icon: Icon = Columns3 }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <span className="admin-table-heading">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
