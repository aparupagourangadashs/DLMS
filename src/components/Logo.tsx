import Image from "next/image";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site";

/** ISKCON line-art logo (black on transparent); inverted in dark mode so it stays visible. */
export function Logo({ size = 44, className, decorative = false }: { size?: number; className?: string; decorative?: boolean }) {
  return (
    <Image
      src="/logo.png"
      alt={decorative ? "" : `${siteConfig.name} logo`}
      width={size}
      height={Math.round((size * 79) / 94)}
      priority
      className={cn("h-auto object-contain dark:invert", className)}
    />
  );
}
