import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { Forbidden, Unauthorized } from "@/server/http/errors";
import { redirect } from "next/navigation";
import { cache } from "react";
import "server-only";
import { can, type AnyRole, type Permission } from "./permissions";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AnyRole;
  kind: "STAFF" | "LEARNER";
  branchIds: string[];
};

/** Resolves the signed-in user and re-checks the database so blocked, archived or signed-out-everywhere users lose access at once. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      branches: { select: { branchId: true } },
      staffProfile: { select: { displayName: true } },
      learnerProfile: { select: { name: true } },
    },
  });
  if (!user || user.status !== "ACTIVE" || user.tokenVersion !== session.user.tokenVersion) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.staffProfile?.displayName ?? user.learnerProfile?.name ?? user.email,
    role: user.role,
    kind: user.kind,
    branchIds: user.branches.map((b) => b.branchId),
  };
});

/** For route handlers: throws 401/403. */
export async function requireStaff(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Unauthorized();
  if (user.kind !== "STAFF") throw new Forbidden();
  if (permission && !can(user.role, permission)) throw new Forbidden();
  return user;
}

export async function requireLearner(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Unauthorized();
  if (user.kind !== "LEARNER") throw new Forbidden();
  return user;
}

/** Any signed-in account (staff or learner), for shared endpoints such as change password. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Unauthorized();
  return user;
}

/** For pages and layouts: redirects instead of throwing. */
export async function pageStaff(permission?: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.kind !== "STAFF") redirect("/student");
  if (permission && !can(user.role, permission)) redirect("/access-denied");
  return user;
}

export async function pageLearner(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/student");
  if (user.kind !== "LEARNER") redirect("/admin");
  return user;
}

export function homeFor(user: Pick<SessionUser, "kind">) {
  return user.kind === "STAFF" ? "/admin" : "/student";
}
