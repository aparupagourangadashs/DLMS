import type { Prisma } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, NotFound, ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";

export type BranchDto = {
  id: string;
  name: string;
  city: string;
  managerId: string | null;
  managerName: string;
  status: "Active" | "Paused";
  staff: number;
  activity: string;
};

type Actor = { id: string; ip: string };

const include = {
  manager: { select: { id: true, staffProfile: { select: { displayName: true } } } },
  _count: { select: { staffProfiles: true } },
} satisfies Prisma.BranchInclude;

const activityLabels: Record<string, string> = {
  "branch.create": "Branch created",
  "branch.update": "Details updated",
  "branch.pause": "Branch paused",
  "branch.reactivate": "Branch reactivated",
};

async function latestActivity(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const events = await prisma.auditEvent.findMany({
    where: { entity: "Branch", entityId: { in: ids } },
    orderBy: { createdAt: "desc" },
    select: { entityId: true, action: true, createdAt: true },
  });
  const latest = new Map<string, string>();
  for (const event of events) {
    if (event.entityId && !latest.has(event.entityId)) {
      latest.set(event.entityId, `${activityLabels[event.action] ?? event.action} · ${event.createdAt.toISOString().slice(0, 10)}`);
    }
  }
  return latest;
}

type BranchWithRelations = Prisma.BranchGetPayload<{ include: typeof include }>;

function toDto(branch: BranchWithRelations, activity: Map<string, string>): BranchDto {
  return {
    id: branch.id,
    name: branch.name,
    city: branch.city ?? "—",
    managerId: branch.managerId,
    managerName: branch.manager?.staffProfile?.displayName ?? "Not assigned",
    status: branch.status === "ACTIVE" ? "Active" : "Paused",
    staff: branch._count.staffProfiles,
    activity: activity.get(branch.id) ?? "No recent activity",
  };
}

export async function listBranches(): Promise<BranchDto[]> {
  const branches = await prisma.branch.findMany({ include, orderBy: { name: "asc" } });
  const activity = await latestActivity(branches.map((b) => b.id));
  return branches.map((b) => toDto(b, activity));
}

const baseSchema = z.object({
  name: z.string().trim().min(2, "Enter the organization name.").max(80),
  city: z.string().trim().max(80).optional(),
  managerId: z.string().min(1).nullable().optional(),
});

const updateSchema = baseSchema.partial().extend({ status: z.enum(["Active", "Paused"]).optional() });

async function assertStaffManager(managerId: string | null | undefined) {
  if (!managerId) return;
  const manager = await prisma.user.findFirst({ where: { id: managerId, kind: "STAFF", status: "ACTIVE" }, select: { id: true } });
  if (!manager) throw new ValidationError({ managerId: "Choose an active staff member." });
}

async function reload(id: string) {
  const branch = await prisma.branch.findUnique({ where: { id }, include });
  if (!branch) throw new NotFound();
  return toDto(branch, await latestActivity([id]));
}

export async function createBranch(input: unknown, actor: Actor) {
  const data = parseWith(baseSchema, input);
  await assertStaffManager(data.managerId);
  if (await prisma.branch.findUnique({ where: { name: data.name }, select: { id: true } })) {
    throw new BusinessRule("That organization name already exists.", { name: "Already in use." });
  }
  const branch = await prisma.branch.create({ data: { name: data.name, city: data.city || null, managerId: data.managerId ?? null } });
  await writeAudit({ actorId: actor.id, action: "branch.create", entity: "Branch", entityId: branch.id, after: { name: data.name }, ip: actor.ip });
  return reload(branch.id);
}

export async function updateBranch(id: string, input: unknown, actor: Actor) {
  const data = parseWith(updateSchema, input);
  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) throw new NotFound();
  await assertStaffManager(data.managerId);
  if (data.name && data.name !== existing.name && (await prisma.branch.findUnique({ where: { name: data.name }, select: { id: true } }))) {
    throw new BusinessRule("That organization name already exists.", { name: "Already in use." });
  }
  await prisma.branch.update({
    where: { id },
    data: {
      name: data.name,
      city: data.city === undefined ? undefined : data.city || null,
      managerId: data.managerId,
      status: data.status === undefined ? undefined : data.status === "Active" ? "ACTIVE" : "PAUSED",
    },
  });
  const action = data.status && data.status !== (existing.status === "ACTIVE" ? "Active" : "Paused") ? (data.status === "Paused" ? "branch.pause" : "branch.reactivate") : "branch.update";
  await writeAudit({ actorId: actor.id, action, entity: "Branch", entityId: id, before: { name: existing.name, status: existing.status }, after: data, ip: actor.ip });
  return reload(id);
}

export async function listStaffLookup() {
  const staff = await prisma.user.findMany({
    where: { kind: "STAFF", status: "ACTIVE" },
    select: { id: true, staffProfile: { select: { displayName: true } }, email: true },
    orderBy: { staffProfile: { displayName: "asc" } },
  });
  return staff.map((s) => ({ id: s.id, name: s.staffProfile?.displayName ?? s.email }));
}
