import type { LegalDocument, LegalType, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { isoDay, statusFromLabel, statusLabels } from "./helpers";

const typeLabels: Record<LegalType, string> = { TERMS: "Terms", PRIVACY: "Privacy" };
const typeFromLabel = (label: string) => (Object.keys(typeLabels) as LegalType[]).find((k) => typeLabels[k] === label);

const schema = z.object({
    type: z.enum(["Terms", "Privacy"], { error: "Choose Terms or Privacy." }),
    title: z.string().trim().min(3, "Enter the title.").max(200),
    body: z.string().trim().min(20, "Write the document text.").max(100_000),
    status: z.string().default("Draft"),
});

function toRow(doc: LegalDocument): Row {
    return {
        id: doc.id, title: doc.title, type: typeLabels[doc.type], version: doc.version, body: doc.body,
        status: statusLabels[doc.status], publishedOn: isoDay(doc.publishedAt), updatedOn: doc.updatedAt.toISOString().slice(0, 10),
    };
}

// Legal text is approved wording, so only administrators may publish it.
const mayPublish = (ctx: ResourceContext) => ctx.user.role === "SUPER_ADMIN" || ctx.user.role === "ADMIN";

async function load(id: string) {
    const doc = await prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFound();
    return doc;
}

function filters(query: ListQuery): Prisma.LegalDocumentWhereInput[] {
    const and: Prisma.LegalDocumentWhereInput[] = [];
    if (query.q) and.push({ title: { contains: query.q } });
    const type = query.filters.type ? typeFromLabel(query.filters.type) : undefined;
    if (type) and.push({ type });
    return and;
}

async function list(query: ListQuery): Promise<ListResult> {
    const base = filters(query);
    const status = query.tab ? statusFromLabel(query.tab) : undefined;
    const where: Prisma.LegalDocumentWhereInput = { AND: [...base, ...(status ? [{ status }] : [])] };
    const [rows, total, grouped] = await Promise.all([
        prisma.legalDocument.findMany({ where, orderBy: [{ type: "asc" }, { version: "desc" }], skip: query.skip, take: query.take }),
        prisma.legalDocument.count({ where }),
        prisma.legalDocument.groupBy({ by: ["status"], where: { AND: base }, _count: { _all: true } }),
    ]);
    const tabCounts: Record<string, number> = { Published: 0, Draft: 0, Archived: 0 };
    for (const row of grouped) tabCounts[statusLabels[row.status]] = row._count._all;
    return { rows: rows.map(toRow), total, tabCounts };
}

function parse(input: unknown, ctx: ResourceContext) {
    const parsed = parseWith(schema, input);
    const status = statusFromLabel(parsed.status);
    if (status !== "DRAFT" && status !== "PUBLISHED") throw new ValidationError({ status: "Choose Draft or Published." });
    if (status === "PUBLISHED" && !mayPublish(ctx)) throw new Forbidden("Only an administrator can publish legal text.");
    return { parsed, status, type: typeFromLabel(parsed.type)! };
}

// Publishing makes this version current and archives the previous one in a single transaction.
async function publish(id: string, type: LegalType) {
    await prisma.$transaction([
        prisma.legalDocument.updateMany({ where: { type, status: "PUBLISHED", id: { not: id } }, data: { status: "ARCHIVED" } }),
        prisma.legalDocument.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } }),
    ]);
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const { parsed, status, type } = parse(input, ctx);
    const last = await prisma.legalDocument.findFirst({ where: { type }, orderBy: { version: "desc" }, select: { version: true } });
    const doc = await prisma.legalDocument.create({ data: { type, version: (last?.version ?? 0) + 1, title: parsed.title, body: parsed.body, status: "DRAFT", createdById: ctx.user.id } });
    if (status === "PUBLISHED") await publish(doc.id, type);
    await writeAudit({ actorId: ctx.user.id, action: status === "PUBLISHED" ? "legal.publish" : "legal.create", entity: "LegalDocument", entityId: doc.id, after: { type, version: doc.version }, ip: ctx.ip });
    return toRow(await load(doc.id));
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    if (existing.status !== "DRAFT") throw new BusinessRule("Published text is not edited. Create a new version instead.");
    const { parsed, status, type } = parse(input, ctx);
    await prisma.legalDocument.update({ where: { id }, data: { type, title: parsed.title, body: parsed.body } });
    if (status === "PUBLISHED") await publish(id, type);
    await writeAudit({ actorId: ctx.user.id, action: status === "PUBLISHED" ? "legal.publish" : "legal.update", entity: "LegalDocument", entityId: id, after: { type, version: existing.version }, ip: ctx.ip });
    return toRow(await load(id));
}

async function newVersion(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id);
    const last = await prisma.legalDocument.findFirst({ where: { type: source.type }, orderBy: { version: "desc" }, select: { version: true } });
    const doc = await prisma.legalDocument.create({ data: { type: source.type, version: (last?.version ?? 0) + 1, title: source.title, body: source.body, status: "DRAFT", createdById: ctx.user.id } });
    await writeAudit({ actorId: ctx.user.id, action: "legal.create", entity: "LegalDocument", entityId: doc.id, after: { copiedFrom: id }, ip: ctx.ip });
    return toRow(doc);
}

async function archive(id: string, ctx: ResourceContext): Promise<Row> {
    await load(id);
    if (!mayPublish(ctx)) throw new Forbidden("Only an administrator can archive legal text.");
    const doc = await prisma.legalDocument.update({ where: { id }, data: { status: "ARCHIVED" } });
    await writeAudit({ actorId: ctx.user.id, action: "legal.archive", entity: "LegalDocument", entityId: id, ip: ctx.ip });
    return toRow(doc);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    if (existing.status !== "DRAFT") throw new BusinessRule("Only drafts can be deleted. Archive published text instead.");
    await prisma.legalDocument.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "legal.delete", entity: "LegalDocument", entityId: id, ip: ctx.ip });
}

export const legalResource: ResourceDef = {
    key: "website/legal-pages",
    resource: "siteContent",
    list,
    get: async (id) => toRow(await load(id)),
    create,
    update,
    remove,
    actions: { duplicate: newVersion, archive },
};
