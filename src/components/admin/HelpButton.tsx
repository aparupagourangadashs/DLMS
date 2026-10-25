"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { findPage, helpHref, parseAdminPath } from "@/lib/admin/navigation";
import { buttonClass } from "@/components/ui/Button";

/** Links the current admin page to its help article. Hidden on help pages themselves. */
export function HelpButton() {
  const { help, section, page } = parseAdminPath(usePathname());
  const found = !help && section && page ? findPage(section, page) : null;
  if (!found) return null;
  return (
    <Link
      href={helpHref(found.section.slug, found.page.slug)}
      className={buttonClass("secondary")}
      aria-label={`Help for ${found.page.label}`}
      title="How to use this page (shortcut: ?)"
    >
      <CircleHelp className="size-4" aria-hidden="true" />
      Help
    </Link>
  );
}
