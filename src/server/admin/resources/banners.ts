import type { Banner, BannerPlacement, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { istToday } from "@/lib/ist";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { claimImage } from "@/server/services/assets";
import { z } from "zod";
import { dateOnly, isoDay, optionalInt, statusFromLabel, statusLabels } from "./helpers";

const placementLabels: Record<BannerPlacement, string> = { WEBSITE_HOME: "Website home", STUDENT_HOME: "Student portal home" };
const placementFromLabel = (label: string) => (Object.keys(placementLabels) as BannerPlacement[]).find((key) => placementLabels[key] === label);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** An https address, or a path on this site that starts with a single slash. */
export const siteLink = (value: string) => value === "" || /^https:\/\/[^\s]+$/.test(value) || (/^\/[^\s\\]*$/.test(value) && !value.startsWith("//"));

const schema = z.object({
    name: z.string().trim().min(2, "Enter the banner name.").max(200),
    description: z.string().trim().max(400, "Keep the text under 400 characters.").default(""),
    placement: z.string().min(1, "Choose where it shows."),
    image: z.string().default(""),
    link: z.string().trim().max(500).refine(siteLink, "Use a full https:// address, or a path on this site such as /student/my-learning.").default(""),
    startDate: dateOnly.default(null),
    endDate: dateOnly.default(null),
    sortOrder: optionalInt(0, 100_000).default(null),
    status: z.string().default("Draft"),
});

const include = { image: { select: { name: true, fileName: true, sizeBytes: true } } } satisfies Prisma.BannerInclude;
type BannerRow = Prisma.BannerGetPayload<{ include: typeof include }>;

type Showing = "Showing now" | "Scheduled" | "Ended" | "Not published";

/** Whether the site shows this banner on `today` (an IST day). */
function showing(banner: Pick<Banner, "status" | "startsOn" | "endsOn">, today: string): Showing {
    if (banner.status !== "PUBLISHED") return "Not published";
    if (banner.startsOn && isoDay(banner.startsOn) > today) return "Scheduled";
    if (banner.endsOn && isoDay(banner.endsOn) < today) return "Ended";
    return "Showing now";
}

function windowLabel(banner: Pick<Banner, "startsOn" | "endsOn">) {
    if (banner.startsOn && banner.endsOn) return `${formatDate(isoDay(banner.startsOn))} \u2013 ${formatDate(isoDay(banner.endsOn))}`;
    if (banner.startsOn) return `From ${formatDate(isoDay(banner.startsOn))}`;
    if (banner.endsOn) return `Until ${formatDate(isoDay(banner.endsOn))}`;
    return "Always";
}

function toRow(banner: BannerRow, today = istToday()): Row {
    return {
        id: banner.id,
        name: banner.name,
        description: banner.description ?? "",
        placement: placementLabels[banner.placement],
        thumbnail: `/api/assets/${banner.imageAssetId}/file`,
        image: JSON.stringify({ id: banner.imageAssetId, name: banner.image.fileName ?? banner.image.name, size: banner.image.sizeBytes ?? 0 }),
        link: banner.linkUrl ?? "",
        startDate: isoDay(banner.startsOn),
        endDate: isoDay(banner.endsOn),
        window: windowLabel(banner),
        showing: showing(banner, today),
        sortOrder: banner.sortOrder,
        status: statusLabels[banner.status],
        updatedOn: isoDay(banner.updatedAt),
    };
}

function listWhere(query: ListQuery): Prisma.BannerWhereInput[] {
    const and: Prisma.BannerWhereInput[] = [];
    if (query.q) and.push({ OR: [{ name: { contains: query.q } }, { description: { contains: query.q } }] });
    const placement = query.filters.placement ? placementFromLabel(query.filters.placement) : undefined;
    if (query.filters.placement) and.push(placement ? { placement } : { id: "none" });
    return and;
}

async function list(query: ListQuery): Promise<ListResult> {
    const base = listWhere(query);
    const status = query.tab ? statusFromLabel(query.tab) : undefined;
    const where: Prisma.BannerWhereInput = { AND: [...base, ...(status ? [{ status }] : [])] };
    const dir = query.sort?.dir ?? "asc";
    const orderBy: Prisma.BannerOrderByWithRelationInput[] =
        query.sort?.key === "name" ? [{ name: dir }] : query.sort?.key === "updatedOn" ? [{ updatedAt: dir }] : [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }];
    const [rows, total, grouped] = await Promise.all([
        prisma.banner.findMany({ where, include, orderBy, skip: query.skip, take: query.take }),
        prisma.banner.count({ where }),
        prisma.banner.groupBy({ by: ["status"], where: { AND: base }, _count: { _all: true } }),
    ]);
    const tabCounts: Record<string, number> = { Published: 0, Draft: 0, Archived: 0 };
    for (const row of grouped) tabCounts[statusLabels[row.status]] = row._count._all;
    const today = istToday();
    return { rows: rows.map((r) => toRow(r, today)), total, tabCounts };
}

async function load(id: string) {
    const banner = await prisma.banner.findUnique({ where: { id }, include });
    if (!banner) throw new NotFound();
    return banner;
}

function resolve(data: z.output<typeof schema>) {
    const status = statusFromLabel(data.status);
    if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
    const placement = placementFromLabel(data.placement);
    if (!placement) throw new ValidationError({ placement: "Choose Website home or Student portal home." });
    if (data.startDate && data.endDate && data.endDate < data.startDate) throw new ValidationError({ endDate: "The last day cannot be before the first day." });
    return { status, placement };
}

const fields = (data: z.output<typeof schema>, imageAssetId: string, resolved: ReturnType<typeof resolve>, current?: number): Prisma.BannerUncheckedCreateInput => ({
    name: data.name,
    description: data.description || null,
    imageAssetId,
    linkUrl: data.link || null,
    placement: resolved.placement,
    status: resolved.status,
    sortOrder: data.sortOrder ?? current ?? 0,
    startsOn: data.startDate,
    endsOn: data.endDate,
});

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const resolved = resolve(data);
    const imageAssetId = await claimImage(data.image, { name: data.name, actorId: ctx.user.id, field: "image", maxBytes: MAX_IMAGE_BYTES });
    if (!imageAssetId) throw new ValidationError({ image: "Upload the banner image." });
    const created = await prisma.banner.create({ data: fields(data, imageAssetId, resolved), include });
    await writeAudit({ actorId: ctx.user.id, action: "banner.create", entity: "Banner", entityId: created.id, after: { name: created.name, placement: created.placement, status: created.status }, ip: ctx.ip });
    return toRow(created);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const data = parseWith(schema, input);
    const resolved = resolve(data);
    const imageAssetId = await claimImage(data.image, { name: data.name, actorId: ctx.user.id, field: "image", current: existing.imageAssetId, maxBytes: MAX_IMAGE_BYTES });
    if (!imageAssetId) throw new ValidationError({ image: "Upload the banner image." });
    const updated = await prisma.banner.update({ where: { id }, data: fields(data, imageAssetId, resolved, existing.sortOrder), include });
    const action = existing.status !== updated.status ? (updated.status === "PUBLISHED" ? "banner.publish" : updated.status === "ARCHIVED" ? "banner.archive" : "banner.unpublish") : "banner.update";
    await writeAudit({ actorId: ctx.user.id, action, entity: "Banner", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: updated.name, status: updated.status }, ip: ctx.ip });
    return toRow(updated);
}

async function archive(id: string, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const updated = await prisma.banner.update({ where: { id }, data: { status: "ARCHIVED" }, include });
    await writeAudit({ actorId: ctx.user.id, action: "banner.archive", entity: "Banner", entityId: id, before: { status: existing.status }, ip: ctx.ip });
    return toRow(updated);
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id);
    const copy = await prisma.banner.create({
        data: { name: `${source.name} (copy)`.slice(0, 200), description: source.description, imageAssetId: source.imageAssetId, linkUrl: source.linkUrl, placement: source.placement, status: "DRAFT", sortOrder: source.sortOrder, startsOn: source.startsOn, endsOn: source.endsOn },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: "banner.create", entity: "Banner", entityId: copy.id, after: { duplicatedFrom: id }, ip: ctx.ip });
    return toRow(copy);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    await prisma.banner.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "banner.delete", entity: "Banner", entityId: id, before: { name: existing.name }, ip: ctx.ip });
}

export const bannerResource: ResourceDef = {
    key: "marketing/marketing-banners",
    resource: "banners",
    sortableKeys: ["name", "updatedOn"],
    list,
    get: async (id) => toRow(await load(id)),
    create,
    update,
    remove,
    actions: { archive, duplicate },
};
