import { Info } from "lucide-react";
import { statusLabel, type ScreenStatus } from "@/lib/admin/navigation";
import { Badge } from "@/components/ui/Badge";
import { HelpButton } from "./HelpButton";

const statusTone = { ready: "success", proposed: "info", decision: "warning" } as const;

export function PageHeader({
  title,
  description,
  status,
  actions,
}: {
  title: string;
  description?: string;
  status?: ScreenStatus;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
          {status ? <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge> : null}
        </div>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HelpButton />
        {actions}
      </div>
    </div>
  );
}

export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-xl border border-gold/40 bg-gold-soft px-3 py-2 text-xs text-foreground/80">
      <Info className="mt-0.5 size-3.5 shrink-0 text-gold-strong" aria-hidden="true" />
      <span>
        {children ??
          "Demo screen with sample data. Changes you make are kept only until you leave the page; saving to the database arrives with the backend phase."}
      </span>
    </p>
  );
}
