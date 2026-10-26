import { cn } from "@/lib/cn";

export function StudentAvatar({ className }: { className?: string }) {
  return (
    <span className={cn("student-avatar", className)} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" className="size-full">
        <circle cx="24" cy="24" r="24" fill="#ede7f5" />
        <path d="M6 48c0-12 7-19 18-19s18 7 18 19" fill="#65508b" />
        <path d="m19 29 5 7 5-7" fill="#f1c7a5" />
        <ellipse cx="24" cy="19" rx="10" ry="12" fill="#f1c7a5" />
        <path d="M14 20C9 8 18 4 24 5c11-1 14 9 10 16l-2-8c-5 2-10 1-14-2l-4 9Z" fill="#3b304e" />
        <path d="M21 24c2 2 4 2 6 0" stroke="#9b5f50" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20.5" cy="19" r="1" fill="#3b304e" />
        <circle cx="28.5" cy="19" r="1" fill="#3b304e" />
      </svg>
    </span>
  );
}
