import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClass } from "@/components/ui/Button";

export default function AdminNotFound() {
  return (
    <EmptyState
      icon={<Compass className="size-5" />}
      title="Page not found"
      description="This admin page doesn't exist. Use search (Ctrl+K) or go back to the dashboard."
      action={
        <Link href="/admin" className={buttonClass("gold")}>
          Go to dashboard
        </Link>
      }
    />
  );
}
