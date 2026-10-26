import Image from "next/image";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site";

export function Logo({ size = 44, className, decorative = false, variant = "default" }: { size?: number; className?: string; decorative?: boolean; variant?: "default" | "admin" }) {
  const admin = variant === "admin";
  return (
    <Image
      src={admin ? "/admin-logo.png" : "/logo.png"}
      alt={decorative ? "" : `${siteConfig.name} logo`}
      width={size}
      height={admin ? size : Math.round((size * 79) / 94)}
      priority
      className={cn("h-auto shrink-0 object-contain", admin ? "rounded-full" : "dark:invert", className)}
    />
  );
}
