import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <EmptyState
        icon={<Compass className="size-5" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/" className={buttonClass("secondary")}>
              All portals
            </Link>
            <Link href="/admin" className={buttonClass("gold")}>
              Admin dashboard
            </Link>
          </div>
        }
      />
    </main>
  );
}
