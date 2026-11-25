import type { LeadSource, LeadStage, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { normalizeEmail } from "@/server/auth/tokens";
import { prisma } from "@/server/db";
import { NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";

const include = { bulkBook: true } satisfies Prisma.LeadInclude;
type LeadRow = Prisma.LeadGetPayload<{ include: typeof include }>;

export const sourceLabels: Record<LeadSource, string> = {
    CONTACT_FORM: "Contact form", BULK_BOOK: "Bulk book enquiry", CAMPAIGN: "Campaign", EVENT: "Event", MANUAL: "Manual entry",
};
export const stageLabels: Record<LeadStage, string> = { NEW: "New", CONTACTED: "Contacted", CONVERTED: "Converted", CLOSED: "Closed" };

const stageFromLabel = (label: string) => (Object.keys(stageLabels) as LeadStage[]).find((k) => stageLabels[k] === label);
const sourceFromLabel = (label: string) => (Object.keys(sourceLabels) as LeadSource[]).find((k) => sourceLabels[k] === label);

const schema = z.object({
    name: z.string().trim().min(2, "Enter the name.").max(120),
    email: z.email("Enter a valid email address.").max(254),
    phone: z.string().trim().regex(/^(\+?[\d\s-]{6,20})?$/, "Enter a valid phone number.").default(""),
    interest: z.string().trim().max(300).default(""),
    stage: z.string().default("New"),
});

function toRow(lead: LeadRow): Row {
    const bulk = lead.bulkBook;
    return {
        id: lead.id,
        name: lead.name,
        city: lead.city ?? "",
        email: lead.email,
        phone: lead.phone ?? "",
        source: sourceLabels[lead.source],
        interest: lead.interest ?? "",
        receivedOn: lead.createdAt.toISOString().slice(0, 10),
        stage: stageLabels[lead.stage],
        consent: lead.consent ? "Yes" : "No",
        details: bulk ? `${bulk.quantity} copies of ${bulk.bookTitle}. Ship to: ${bulk.address}, ${bulk.city} ${bulk.pincode}` : (lead.message ?? ""),
    };
}

function filters(query: ListQuery): Prisma.LeadWhereInput[] {
    const and: Prisma.LeadWhereInput[] = [];
    if (query.q) and.push({ OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }, { phone: { contains: query.q } }] });
    const source = query.filters.source ? sourceFromLabel(query.filters.source) : undefined;
    if (source) and.push({ source });
    if (query.from) and.push({ createdAt: { gte: new Date(`${query.from}T00:00:00Z`) } });
    if (query.to) and.push({ createdAt: { lt: new Date(new Date(`${query.to}T00:00:00Z`).getTime() + 86_400_000) } });
    return and;
}

async function list(query: ListQuery): Promise<ListResult> {
    const base = filters(query);
    const stage = query.tab ? stageFromLabel(query.tab) : undefined;
    const where: Prisma.LeadWhereInput = { AND: [...base, ...(stage ? [{ stage }] : [])] };
    const dir = query.sort?.dir ?? "desc";
    const orderBy: Prisma.LeadOrderByWithRelationInput = query.sort?.key === "name" ? { name: dir } : { createdAt: dir };
    const [rows, total, grouped] = await Promise.all([
        prisma.lead.findMany({ where, include, orderBy, skip: query.skip, take: query.take }),
        prisma.lead.count({ where }),
        prisma.lead.groupBy({ by: ["stage"], where: { AND: base }, _count: { _all: true } }),
    ]);
    const tabCounts: Record<string, number> = { New: 0, Contacted: 0, Converted: 0, Closed: 0 };
    for (const row of grouped) tabCounts[stageLabels[row.stage]] = row._count._all;
    return { rows: rows.map(toRow), total, tabCounts };
}

async function load(id: string) {
    const lead = await prisma.lead.findUnique({ where: { id }, include });
    if (!lead) throw new NotFound();
    return lead;
}

function parse(input: unknown) {
    const parsed = parseWith(schema, input);
    const stage = stageFromLabel(parsed.stage);
    if (!stage) throw new ValidationError({ stage: "Choose a stage from the list." });
    return { parsed, stage };
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const { parsed, stage } = parse(input);
    const lead = await prisma.lead.create({
        data: { name: parsed.name, email: normalizeEmail(parsed.email), phone: parsed.phone || null, interest: parsed.interest || null, stage, source: "MANUAL", assignedToId: ctx.user.id },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: "lead.create", entity: "Lead", entityId: lead.id, after: { source: "MANUAL" }, ip: ctx.ip });
    return toRow(lead);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const { parsed, stage } = parse(input);
    const lead = await prisma.lead.update({
        where: { id },
        data: { name: parsed.name, email: normalizeEmail(parsed.email), phone: parsed.phone || null, interest: parsed.interest || null, stage },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: existing.stage !== stage ? "lead.stage" : "lead.update", entity: "Lead", entityId: id, before: { stage: existing.stage }, after: { stage }, ip: ctx.ip });
    return toRow(lead);
}

async function remove(id: string, ctx: ResourceContext) {
    await load(id);
    await prisma.lead.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "lead.delete", entity: "Lead", entityId: id, ip: ctx.ip });
}

export const leadResource: ResourceDef = {
    key: "marketing/leads",
    resource: "leads",
    sortableKeys: ["name", "receivedOn"],
    list,
    get: async (id) => toRow(await load(id)),
    create,
    update,
    remove,
};
