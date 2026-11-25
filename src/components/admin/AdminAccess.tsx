"use client";

import type { NavSection } from "@/lib/admin/navigation";
import { visibleAdminNav } from "@/lib/admin/page-permissions";
import type { AnyRole } from "@/server/auth/permissions";
import { createContext, useContext, useMemo } from "react";

const AdminAccessContext = createContext<AnyRole>("LEARNER");

export function AdminAccessProvider({ role, children }: { role: AnyRole; children: React.ReactNode }) {
  return <AdminAccessContext.Provider value={role}>{children}</AdminAccessContext.Provider>;
}

/** Sections and pages the signed-in role may open. Menus only; the server enforces access. */
export function useVisibleNav(): NavSection[] {
  const role = useContext(AdminAccessContext);
  return useMemo(() => visibleAdminNav(role), [role]);
}
