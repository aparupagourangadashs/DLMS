import type { MembershipInterval, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { statusFromLabel, statusLabels } from "./helpers";

const intervalLabels: Record<MembershipInterval, string> = { MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly", LIFETIME: "Lifetime" };

const schema = z.object({
  name: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional().default(""),
  price: z.union([z.string(), z.number(), z.null()]).transform((value) => value === null || value === "" ? 0 : Math.round(Number(value) * 100)).refine((value) => Number.isInteger(value) && value >= 0),
  currency: z.enum(["INR", "USD", "EUR", "GBP", "AED"]).default("INR"),
  interval: z.enum(["Monthly", "Quarterly", "Yearly", "Lifetime"]),
  benefits: z.unknown().optional().default(""),
  status: z.string().default("Draft"),
});

const include = { _count: { select: { memberships: true } } } satisfies Prisma.MembershipPlanInclude;
type PlanRow = Prisma.MembershipPlanGetPayload<{ include: typeof include }>;

export function toPlanRow(plan: PlanRow): Row {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? "",
    price: plan.priceMinor / 100,
    currency: plan.currency,
    interval: intervalLabels[plan.interval],
    benefits: JSON.stringify(Array.isArray(plan.benefits) ? plan.benefits.filter((v): v is string => typeof v === "string") : []),
    status: statusLabels[plan.status],
    members: plan._count.memberships,
  };
}

async function list(query: ListQuery): Promise<ListResult> {
  const and: Prisma.MembershipPlanWhereInput[] = [];
  if (query.q) and.push({ name: { contains: query.q } });
  const status = query.tab ? statusFromLabel(query.tab) : undefined;
  if (status) and.push({ status });
  const where: Prisma.MembershipPlanWhereInput = and.length ? { AND: and } : {};
  const [rows, total] = await Promise.all([
    prisma.membershipPlan.findMany({ where, include, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], skip: query.skip, take: query.take }),
    prisma.membershipPlan.count({ where }),
  ]);
  return { rows: rows.map(toPlanRow), total };
}

async function load(id: string) {
  const row = await prisma.membershipPlan.findUnique({ where: { id }, include });
  if (!row) throw new NotFound();
  return row;
}

function parseBenefits(value: unknown) {
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
    } catch {
      return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    }
  }
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  return [];
}

async function resolve(input: z.output<typeof schema>) {
  const status = statusFromLabel(input.status);
  if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
  const interval = (Object.keys(intervalLabels) as MembershipInterval[]).find((value) => intervalLabels[value] === input.interval);
  if (!interval) throw new ValidationError({ interval: "Choose a membership interval." });
  return { status, interval, benefits: parseBenefits(input.benefits) };
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
  const data = parseWith(schema, input);
  const resolved = await resolve(data);
  if (await prisma.membershipPlan.findUnique({ where: { name: data.name }, select: { id: true } })) throw new Conflict("Another membership plan has this name.");
  const row = await prisma.membershipPlan.create({
    data: { name: data.name, description: data.description || null, priceMinor: data.price, currency: data.currency, interval: resolved.interval, benefits: resolved.benefits, status: resolved.status },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "membershipPlan.create", entity: "MembershipPlan", entityId: row.id, after: { name: row.name, status: row.status }, ip: ctx.ip });
  return toPlanRow(row);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
  const existing = await load(id);
  const data = parseWith(schema, input);
  const resolved = await resolve(data);
  if (await prisma.membershipPlan.findFirst({ where: { name: data.name, id: { not: id } }, select: { id: true } })) throw new Conflict("Another membership plan has this name.");
  const row = await prisma.membershipPlan.update({
    where: { id },
    data: { name: data.name, description: data.description || null, priceMinor: data.price, currency: data.currency, interval: resolved.interval, benefits: resolved.benefits, status: resolved.status },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "membershipPlan.update", entity: "MembershipPlan", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: row.name, status: row.status }, ip: ctx.ip });
  return toPlanRow(row);
}

async function remove(id: string, ctx: ResourceContext) {
  const existing = await load(id);
  if (existing._count.memberships > 0) throw new Conflict("This plan has memberships and cannot be deleted. Archive it instead.");
  await prisma.membershipPlan.delete({ where: { id } });
  await writeAudit({ actorId: ctx.user.id, action: "membershipPlan.delete", entity: "MembershipPlan", entityId: id, before: { name: existing.name }, ip: ctx.ip });
}

export const membershipResource: ResourceDef = {
  key: "products/memberships",
  resource: "memberships",
  sortableKeys: ["name", "price"],
  list,
  get: async (id) => toPlanRow(await load(id)),
  create,
  update,
  remove,
};
