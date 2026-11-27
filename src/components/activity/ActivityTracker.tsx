"use client";

import { apiClient } from "@/lib/api/client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ActivityTracker() {
  const pathname = usePathname();
  const started = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    const at = Date.now();
    started.current = { path: pathname, at };
    void apiClient.post("/api/activity", { kind: "PAGE_VIEW", path: pathname, durationSec: 0 }).catch(() => undefined);
    return () => {
      const previous = started.current;
      if (!previous) return;
      const durationSec = Math.min(86_400, Math.max(0, Math.round((Date.now() - previous.at) / 1000)));
      if (durationSec > 0) void apiClient.post("/api/activity", { kind: "PAGE_VIEW", path: previous.path, durationSec }).catch(() => undefined);
    };
  }, [pathname]);

  return null;
}
