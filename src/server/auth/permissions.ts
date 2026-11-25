export const RESOURCES = [
  "team", "branches", "learners", "segments", "customFields", "courses", "categories", "events", "modules",
  "assets", "blogs", "banners", "testimonials", "leads", "siteContent", "batches", "sessions", "announcements",
  "recordings", "enrolments", "supportRequests", "orders", "promoCodes", "fees", "cheques", "memberships",
  "wallet", "questionBanks", "assessments", "submissions", "feedbackForms", "certificates", "grading",
  "communities", "campaigns", "templates", "notifications", "reports", "settings", "audit",
] as const;

export const ACTIONS = ["read", "write", "delete", "export", "publish", "issue", "refund"] as const;

export type Resource = (typeof RESOURCES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Resource}:${Action}`;

export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "INSTRUCTOR" | "CONTENT_EDITOR" | "FINANCE" | "SUPPORT";
export type AnyRole = StaffRole | "LEARNER";

const everything = RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}:${a}` as Permission));

function grant(resources: readonly Resource[], actions: readonly Action[]) {
  return resources.flatMap((r) => actions.map((a) => `${r}:${a}` as Permission));
}

const RW: Action[] = ["read", "write"];
const RWD: Action[] = ["read", "write", "delete"];
const CONTENT: Action[] = ["read", "write", "delete", "publish"];

// Draft matrix pending IBMV approval (decision D3).
const rolePermissions: Record<AnyRole, ReadonlySet<Permission>> = {
  SUPER_ADMIN: new Set(everything),
  ADMIN: new Set(everything.filter((p) => !["settings:write", "audit:read", "audit:export"].includes(p))),
  INSTRUCTOR: new Set<Permission>([
    ...grant(["batches", "learners", "enrolments", "courses", "modules", "assets", "feedbackForms", "assessments", "questionBanks"], ["read"]),
    ...grant(["sessions", "recordings", "submissions", "announcements", "communities"], RW),
  ]),
  CONTENT_EDITOR: new Set<Permission>([
    ...grant(["courses", "categories", "events", "modules", "assets", "blogs", "banners", "testimonials", "siteContent"], CONTENT),
    ...grant(["leads"], ["read"]),
  ]),
  FINANCE: new Set<Permission>([
    ...grant(["orders"], ["read", "write", "refund", "export"]),
    ...grant(["promoCodes", "fees", "cheques", "memberships", "wallet"], RWD),
    ...grant(["reports"], ["read", "export"]),
    ...grant(["learners"], ["read"]),
  ]),
  SUPPORT: new Set<Permission>([
    ...grant(["learners", "enrolments", "supportRequests", "announcements", "leads"], RW),
    ...grant(["batches", "sessions", "communities", "courses"], ["read"]),
  ]),
  LEARNER: new Set(),
};

export function can(role: AnyRole, permission: Permission) {
  return rolePermissions[role].has(permission);
}

export const staffRoles: StaffRole[] = ["SUPER_ADMIN", "ADMIN", "INSTRUCTOR", "CONTENT_EDITOR", "FINANCE", "SUPPORT"];

export const roleLabels: Record<AnyRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  INSTRUCTOR: "Instructor",
  CONTENT_EDITOR: "Content Editor",
  FINANCE: "Finance",
  SUPPORT: "Support",
  LEARNER: "Learner",
};

export function roleFromLabel(label: string): AnyRole | undefined {
  return (Object.keys(roleLabels) as AnyRole[]).find((role) => roleLabels[role] === label);
}

/** Roles that `actor` may assign to others. Only a Super Admin can grant Administrator or Super Admin. */
export function assignableRoles(actor: AnyRole): StaffRole[] {
  if (actor === "SUPER_ADMIN") return staffRoles.filter((r) => r !== "SUPER_ADMIN");
  if (actor === "ADMIN") return ["INSTRUCTOR", "CONTENT_EDITOR", "FINANCE", "SUPPORT"];
  return [];
}
