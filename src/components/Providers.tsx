"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";
import { getThemeSnapshot, subscribeTheme } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light" as const);

  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster theme={theme} position="top-right" richColors closeButton />
    </MotionConfig>
  );
}
