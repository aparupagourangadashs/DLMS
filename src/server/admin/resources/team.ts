import type { Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { assignableRoles, roleFromLabel, roleLabels, type AnyRole } from "@/server/auth/permissions";
import { normalizeEmail } from "@/server/auth/tokens";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { sendPasswordSetupEmail } from "@/server/services/accounts";
import { z } from "zod";

const userInclude = { staffProfile: { include: { branch: true } } } satisfies Prisma.UserInclude;
type TeamUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export function toTeamRow(user: TeamUser): Row {
  return {
    id: user.id,
    name: user.staffProfile?.displayName ?? user.email,
    email: user.email,
    phone: user.phone ?? "",
    role: roleLabels[user.role],
    addedOn: user.createdAt.toISOString().slice(0, 10),
    branch: user.staffProfile?.branch?.name ?? "—",
    state: user.status === "ARCHIVED" ? "Archived" : "Active",
  };
}

const phoneSchema = z
  .string()
  .trim()
  .max(20)
  .regex(/^(\+?[0-9][0-9\s-]{6,18})?$/, "Enter a valid phone number.")
  .optional();

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name.").max(100),
  email: z.email("Enter a valid email address.").max(254),
  phone: phoneSchema,
  role: z.string().min(1, "Choose a role."),
  branch: z.string().min(1, "Choose a branch."),
});

const updateSchema = createSchema.omit({ email: true }).partial();

function branchScope(ctx: ResourceContext): Prisma.UserWhereInput {
  if (ctx.user.role === "SUPER_ADMIN" || ctx.user.branchIds.length === 0) return {};
  return { staffProfile: { branchId: { in: ctx.user.branchIds } } };
}

function listWhere(query: ListQuery, ctx: ResourceContext): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [{ kind: "STAFF" }, branchScope(ctx)];
  if (query.q) {
    and.push({ OR: [{ email: { contains: query.q } }, { staffProfile: { displayName: { contains: query.q } } }] });
  }
  return { AND: and };
}

const tabWhere = (tab?: string): Prisma.UserWhereInput =>
  tab === "Archived" ? { status: "ARCHIVED" } : tab === "Active" ? { status: { not: "ARCHIVED" } } : {};

function orderBy(query: ListQuery): Prisma.UserOrderByWithRelationInput {
  const dir = query.sort?.dir ?? "desc";
  if (query.sort?.key === "name") return { staffProfile: { displayName: dir } };
  if (query.sort?.key === "addedOn") return { createdAt: dir };
  return { createdAt: "desc" };
}

async function list(query: ListQuery, ctx: ResourceContext): Promise<ListResult> {
  const base = listWhere(query, ctx);
  const [rows, total, active, archived] = await Promise.all([
    prisma.user.findMany({ where: { AND: [base, tabWhere(query.tab)] }, include: userInclude, orderBy: orderBy(query), skip: query.skip, take: query.take }),
    prisma.user.count({ where: { AND: [base, tabWhere(query.tab)] } }),
    prisma.user.count({ where: { AND: [base, tabWhere("Active")] } }),
    prisma.user.count({ where: { AND: [base, tabWhere("Archived")] } }),
  ]);
  return { rows: rows.map(toTeamRow), total, tabCounts: { Active: active, Archived: archived } };
}

function resolveRole(label: string, actorRole: AnyRole): AnyRole {
  const role = roleFromLabel(label);
  if (!role || role === "LEARNER") throw new ValidationError({ role: "Choose a valid role." });
  if (!(assignableRoles(actorRole) as AnyRole[]).includes(role)) throw new Forbidden("You cannot assign this role.");
  return role;
}

async function resolveBranch(name: string) {
  const branch = await prisma.branch.findUnique({ where: { name } });
  if (!branch) throw new ValidationError({ branch: "Choose an existing branch." });
  return branch;
}

async function loadTarget(id: string, ctx: ResourceContext) {
  const target = await prisma.user.findFirst({ where: { id, kind: "STAFF", ...branchScope(ctx) }, include: userInclude });
  if (!target) throw new NotFound();
  return target;
}

function assertMayManage(target: TeamUser, ctx: ResourceContext) {
  // Only a Super Admin may change Administrators or other Super Admins.
  if ((target.role === "SUPER_ADMIN" || target.role === "ADMIN") && ctx.user.role !== "SUPER_ADMIN") throw new Forbidden();
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
  const data = parseWith(createSchema, input);
  const role = resolveRole(data.role, ctx.user.role);
  const branch = await resolveBranch(data.branch);
  const email = normalizeEmail(data.email);
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Conflict("A user with this email already exists.", { email: "Already in use." });
  }
  const user = await prisma.user.create({
    data: {
      email,
      phone: data.phone || null,
      kind: "STAFF",
      role,
      emailVerifiedAt: new Date(),
      staffProfile: { create: { displayName: data.name, branchId: branch.id } },
    },
    include: userInclude,
  });
  await writeAudit({ actorId: ctx.user.id, action: "team.create", entity: "User", entityId: user.id, after: { email, role, branch: branch.name }, ip: ctx.ip });
  await sendPasswordSetupEmail(user.id, user.email, "invite");
  return toTeamRow(user);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
  const data = parseWith(updateSchema, input);
  const target = await loadTarget(id, ctx);
  assertMayManage(target, ctx);

  const userData: Prisma.UserUpdateInput = {};
  const profileData: Prisma.StaffProfileUpdateInput = {};
  if (data.name !== undefined) profileData.displayName = data.name;
  if (data.phone !== undefined) userData.phone = data.phone || null;
  if (data.branch !== undefined) profileData.branch = { connect: { id: (await resolveBranch(data.branch)).id } };
  if (data.role !== undefined) {
    const role = resolveRole(data.role, ctx.user.role);
    if (role !== target.role) {
      if (target.id === ctx.user.id) throw new BusinessRule("You cannot change your own role.");
      userData.role = role;
      userData.tokenVersion = { increment: 1 };
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { ...userData, staffProfile: { update: profileData } },
    include: userInclude,
  });
  await writeAudit({
    actorId: ctx.user.id,
    action: "team.update",
    entity: "User",
    entityId: id,
    before: { name: target.staffProfile?.displayName, role: target.role, branch: target.staffProfile?.branch?.name, phone: target.phone },
    after: { name: updated.staffProfile?.displayName, role: updated.role, branch: updated.staffProfile?.branch?.name, phone: updated.phone },
    ip: ctx.ip,
  });
  return toTeamRow(updated);
}

async function setArchived(id: string, archived: boolean, ctx: ResourceContext): Promise<Row> {
  const target = await loadTarget(id, ctx);
  assertMayManage(target, ctx);
  if (archived) {
    if (target.id === ctx.user.id) throw new BusinessRule("You cannot archive your own account.");
    if (target.role === "SUPER_ADMIN") {
      const others = await prisma.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE", id: { not: id } } });
      if (others === 0) throw new BusinessRule("At least one active Super Admin is required.");
    }
  }
  const updated = await prisma.user.update({
    where: { id },
    // Bumping tokenVersion signs the person out everywhere.
    data: archived ? { status: "ARCHIVED", tokenVersion: { increment: 1 } } : { status: "ACTIVE" },
    include: userInclude,
  });
  await writeAudit({ actorId: ctx.user.id, action: archived ? "team.archive" : "team.restore", entity: "User", entityId: id, ip: ctx.ip });
  return toTeamRow(updated);
}

export const teamResource: ResourceDef = {
  key: "users/team",
  resource: "team",
  sortableKeys: ["name", "addedOn"],
  list,
  create,
  update,
  actions: {
    archive: (id, ctx) => setArchived(id, true, ctx),
    restore: (id, ctx) => setArchived(id, false, ctx),
  },
};
