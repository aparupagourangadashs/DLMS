import type { EventPlatform, EventStatus, EventVisibility, Prisma } from "@/generated/prisma/client";
import { eventCategories, eventCurrencies, membershipLevels, needsLink, needsVenue } from "@/lib/admin/events";
import type { Row } from "@/lib/admin/types";
import { fromIst, toIst } from "@/lib/ist";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { claimImage } from "@/server/services/assets";
import { idByLabel, labelMap, staffOptions } from "@/server/services/lookups";
import { z } from "zod";
import { optionalInt, parseRepeat } from "./helpers";

const statusLabels: Record<EventStatus, string> = { DRAFT: "Draft", ACTIVE: "Active", INACTIVE: "Inactive" };
const visibilityLabels: Record<EventVisibility, string> = { PUBLIC: "Public", PRIVATE: "Private", UNLISTED: "Unlisted" };
const platformLabels: Record<EventPlatform, string> = { IN_PERSON: "In person", ZOOM: "Zoom", YOUTUBE_LIVE: "YouTube Live", OTHER_ONLINE: "Other online", HYBRID: "Hybrid" };
const fromLabel = <K extends string>(labels: Record<K, string>, label: string) => (Object.keys(labels) as K[]).find((key) => labels[key] === label);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DAYS = 31;

const when = z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, "Choose a date and time.");
const dayItem = z.object({ start: when, end: when });
const instant = (local: string) => fromIst(local.slice(0, 10), local.slice(11, 16));

const schema = z.object({
    name: z.string().trim().min(3, "Enter the event name.").max(200),
    description: z.string().trim().min(5, "Describe the event.").max(10_000, "Keep the description under 10,000 characters."),
    image: z.string().default(""),
    days: z.unknown().default(""),
    status: z.string().default("Draft"),
    visibility: z.string().default("Public"),
    platform: z.string().min(1, "Choose the platform."),
    venue: z.string().trim().max(300).default(""),
    meetingLink: z.string().trim().max(500).default(""),
    guestAccess: z.string().default("Members only"),
    manager: z.string().min(1, "Choose the event manager."),
    category: z.string().min(1, "Choose the category."),
    membership: z.string().default("Everyone"),
    feedback: z.string().default("None"),
    pricing: z.string().default("Free"),
    price: z.union([z.string(), z.number(), z.null()]).default(null),
    currency: z.string().default("INR"),
    capacity: optionalInt(1, 1_000_000).default(null),
    pricingNotes: z.string().trim().max(2000).default(""),
});
type Input = z.output<typeof schema>;

const include = { days: { orderBy: { sortOrder: "asc" } }, image: { select: { name: true, fileName: true, sizeBytes: true } } } satisfies Prisma.EventInclude;
type EventRow = Prisma.EventGetPayload<{ include: typeof include }>;

const local = (instantValue: Date) => {
    const { date, time } = toIst(instantValue);
    return `${date}T${time}`;
};

function toRow(event: EventRow, staff: Map<string, string>): Row {
    return {
        id: event.id,
        name: event.name,
        where: event.venue ?? platformLabels[event.platform],
        date: local(event.startsAt),
        visibility: visibilityLabels[event.visibility],
        status: statusLabels[event.status],
        description: event.description,
        image: event.imageAssetId ? JSON.stringify({ id: event.imageAssetId, name: event.image?.fileName ?? event.image?.name ?? "", size: event.image?.sizeBytes ?? 0 }) : "",
        days: JSON.stringify(event.days.map((d) => ({ start: local(d.startsAt), end: local(d.endsAt) }))),
        platform: platformLabels[event.platform],
        venue: event.venue ?? "",
        meetingLink: event.meetingLink ?? "",
        guestAccess: event.guestsAllowed ? "Allowed" : "Members only",
        manager: event.managerId ? staff.get(event.managerId) ?? "" : "",
        category: event.category,
        membership: event.membershipEligibility,
        feedback: "None",
        pricing: event.isPaid ? "Paid" : "Free",
        price: event.priceMinor === null ? null : event.priceMinor / 100,
        currency: event.currency ?? "INR",
        capacity: event.capacity,
        pricingNotes: event.pricingNotes ?? "",
    };
}

async function present(id: string): Promise<Row> {
    const [event, staff] = await Promise.all([load(id), staffOptions()]);
    return toRow(event, labelMap(staff));
}

async function load(id: string) {
    const event = await prisma.event.findUnique({ where: { id }, include });
    if (!event) throw new NotFound();
    return event;
}

/** Checks the form against the event rules and turns labels into what the database stores. */
async function resolve(data: Input, ctx: ResourceContext, currentImage?: string | null) {
    const status = fromLabel(statusLabels, data.status);
    if (!status) throw new ValidationError({ status: "Choose Draft, Active or Inactive." });
    const visibility = fromLabel(visibilityLabels, data.visibility);
    if (!visibility) throw new ValidationError({ visibility: "Choose Public, Private or Unlisted." });
    const platform = fromLabel(platformLabels, data.platform);
    if (!platform) throw new ValidationError({ platform: "Choose one of the listed platforms." });
    if (!(eventCategories as readonly string[]).includes(data.category)) throw new ValidationError({ category: "Choose one of the listed categories." });
    if (!(membershipLevels as readonly string[]).includes(data.membership)) throw new ValidationError({ membership: "Choose one of the listed membership levels." });
    if (data.feedback && data.feedback !== "None") throw new ValidationError({ feedback: "Feedback forms arrive with assessments. Leave this as None." });
    if (data.guestAccess !== "Allowed" && data.guestAccess !== "Members only") throw new ValidationError({ guestAccess: "Choose Allowed or Members only." });

    const items = parseRepeat(data.days, dayItem, MAX_DAYS, "days");
    if (items.length === 0) throw new ValidationError({ days: "Add at least one day." });
    const days = items.map((item, index) => {
        const start = instant(item.start);
        const end = instant(item.end);
        // A date such as 31 February is rolled over by the Date parser; reading it back shows the difference.
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || local(start) !== item.start || local(end) !== item.end) throw new ValidationError({ days: `Day ${index + 1}: choose a real date.` });
        if (end <= start) throw new ValidationError({ days: `Day ${index + 1}: the end must be after the start.` });
        return { start, end };
    });
    days.forEach((day, index) => {
        if (index > 0 && day.start < days[index - 1].end) throw new ValidationError({ days: `Day ${index + 1} starts before day ${index} ends. List the days in order, without overlap.` });
    });

    if (needsVenue(data.platform) && !data.venue) throw new ValidationError({ venue: "Enter the venue or address." });
    if (needsLink(data.platform) && !/^https:\/\/[^\s]+$/.test(data.meetingLink)) throw new ValidationError({ meetingLink: "Enter a full https:// link." });

    const managerId = idByLabel(await staffOptions(), data.manager);
    if (!managerId) throw new ValidationError({ manager: "Choose the event manager from the list." });

    let priceMinor: number | null = null;
    if (data.pricing === "Paid") {
        const price = Number(data.price);
        if (data.price === null || data.price === "" || !Number.isFinite(price) || price <= 0 || price > 1_000_000 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
            throw new ValidationError({ price: "Enter a ticket price above zero, with at most two decimals." });
        }
        if (!(eventCurrencies as readonly string[]).includes(data.currency)) throw new ValidationError({ currency: "Choose INR, USD or EUR." });
        priceMinor = Math.round(price * 100);
    } else if (data.pricing !== "Free") throw new ValidationError({ pricing: "Choose Free or Paid." });

    const imageAssetId = await claimImage(data.image, { name: data.name, actorId: ctx.user.id, field: "image", current: currentImage, maxBytes: MAX_IMAGE_BYTES });
    return { status, visibility, platform, days, managerId, priceMinor, imageAssetId };
}

const fields = (data: Input, r: Awaited<ReturnType<typeof resolve>>) => ({
    name: data.name,
    description: data.description,
    imageAssetId: r.imageAssetId,
    status: r.status,
    visibility: r.visibility,
    platform: r.platform,
    venue: needsVenue(data.platform) ? data.venue : null,
    meetingLink: needsLink(data.platform) ? data.meetingLink : null,
    guestsAllowed: data.guestAccess === "Allowed",
    managerId: r.managerId,
    category: data.category,
    membershipEligibility: data.membership,
    isPaid: r.priceMinor !== null,
    priceMinor: r.priceMinor,
    currency: r.priceMinor === null ? null : data.currency,
    capacity: data.capacity,
    pricingNotes: data.pricingNotes || null,
    startsAt: r.days[0].start,
    endsAt: r.days[r.days.length - 1].end,
});

const dayRows = (days: Array<{ start: Date; end: Date }>) => days.map((d, index) => ({ startsAt: d.start, endsAt: d.end, sortOrder: index }));

function listWhere(query: ListQuery): Prisma.EventWhereInput[] {
    const and: Prisma.EventWhereInput[] = [];
    if (query.q) and.push({ name: { contains: query.q } });
    if (query.filters.visibility) {
        const visibility = fromLabel(visibilityLabels, query.filters.visibility);
        and.push(visibility ? { visibility } : { id: "none" });
    }
    return and;
}

async function list(query: ListQuery): Promise<ListResult> {
    const base = listWhere(query);
    const status = query.tab ? fromLabel(statusLabels, query.tab) : undefined;
    const where: Prisma.EventWhereInput = { AND: [...base, ...(status ? [{ status }] : [])] };
    const dir = query.sort?.dir ?? "desc";
    const [rows, total, grouped, staff] = await Promise.all([
        prisma.event.findMany({ where, include, orderBy: query.sort?.key === "name" ? { name: dir } : { startsAt: dir }, skip: query.skip, take: query.take }),
        prisma.event.count({ where }),
        prisma.event.groupBy({ by: ["status"], where: { AND: base }, _count: { _all: true } }),
        staffOptions(),
    ]);
    const tabCounts: Record<string, number> = { Active: 0, Draft: 0, Inactive: 0 };
    for (const row of grouped) tabCounts[statusLabels[row.status]] = row._count._all;
    const names = labelMap(staff);
    return { rows: rows.map((r) => toRow(r, names)), total, tabCounts };
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(schema, input);
    const resolved = await resolve(data, ctx);
    const id = await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: { ...fields(data, resolved), createdById: ctx.user.id, days: { create: dayRows(resolved.days) } },
        });
        return event.id;
    });
    await writeAudit({ actorId: ctx.user.id, action: "event.create", entity: "Event", entityId: id, after: { name: data.name, status: resolved.status, days: resolved.days.length }, ip: ctx.ip });
    return present(id);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const data = parseWith(schema, input);
    const resolved = await resolve(data, ctx, existing.imageAssetId);
    await prisma.$transaction([
        prisma.eventDay.deleteMany({ where: { eventId: id } }),
        prisma.event.update({ where: { id }, data: { ...fields(data, resolved), days: { create: dayRows(resolved.days) } } }),
    ]);
    const action = existing.status !== resolved.status ? (resolved.status === "ACTIVE" ? "event.publish" : "event.unpublish") : "event.update";
    await writeAudit({ actorId: ctx.user.id, action, entity: "Event", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: data.name, status: resolved.status }, ip: ctx.ip });
    return present(id);
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id);
    const copy = await prisma.event.create({
        data: {
            name: `${source.name} (copy)`.slice(0, 200),
            description: source.description,
            imageAssetId: source.imageAssetId,
            status: "DRAFT",
            visibility: source.visibility,
            platform: source.platform,
            venue: source.venue,
            meetingLink: source.meetingLink,
            guestsAllowed: source.guestsAllowed,
            managerId: source.managerId,
            category: source.category,
            membershipEligibility: source.membershipEligibility,
            isPaid: source.isPaid,
            priceMinor: source.priceMinor,
            currency: source.currency,
            capacity: source.capacity,
            pricingNotes: source.pricingNotes,
            startsAt: source.startsAt,
            endsAt: source.endsAt,
            createdById: ctx.user.id,
            days: { create: dayRows(source.days.map((d) => ({ start: d.startsAt, end: d.endsAt }))) },
        },
    });
    await writeAudit({ actorId: ctx.user.id, action: "event.create", entity: "Event", entityId: copy.id, after: { duplicatedFrom: id }, ip: ctx.ip });
    return present(copy.id);
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    if (existing.status === "ACTIVE") throw new BusinessRule("An active event cannot be deleted. Make it inactive first.");
    await prisma.event.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "event.delete", entity: "Event", entityId: id, before: { name: existing.name, status: existing.status }, ip: ctx.ip });
}

export const eventResource: ResourceDef = {
    key: "products/events",
    resource: "events",
    sortableKeys: ["name", "date"],
    list,
    get: (id) => present(id),
    options: async () => ({ manager: (await staffOptions()).map((s) => s.label) }),
    create,
    update,
    remove,
    actions: { duplicate },
};
