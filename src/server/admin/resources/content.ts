import type { PublishStatus } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import type { Resource } from "@/server/auth/permissions";
import { NotFound } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { statusFromLabel, statusLabels } from "./helpers";

type Base = { id: string; status: PublishStatus };

export type ContentAdapter<T extends Base, W, O, D> = {
    key: string;
    resource: Resource;
    entity: string;
    sortableKeys: string[];
    /** Treat the UI label "Hidden" as Draft (testimonials). */
    hiddenAsDraft?: boolean;
    find(args: { where: W; orderBy: O; skip: number; take: number }): Promise<T[]>;
    count(where: W): Promise<number>;
    counts(where: W): Promise<Array<{ status: PublishStatus; _count: { _all: number } }>>;
    get(id: string): Promise<T | null>;
    create(data: D): Promise<T>;
    update(id: string, data: D, existing: T): Promise<T>;
    setStatus(id: string, status: PublishStatus): Promise<T>;
    remove(id: string): Promise<void>;
    filters(query: ListQuery): W[];
    withStatus(status: PublishStatus): W;
    and(parts: W[]): W;
    orderBy(query: ListQuery): O;
    parse(input: unknown, existing?: T): { data: D; status: PublishStatus };
    toRow(item: T): Row;
    label(item: T): string;
};

/** CRUD for simple publishable content (draft, published, archived) with audit and server-side paging. */
export function contentResource<T extends Base, W, O, D>(adapter: ContentAdapter<T, W, O, D>): ResourceDef {
    const load = async (id: string) => {
        const item = await adapter.get(id);
        if (!item) throw new NotFound();
        return item;
    };
    const action = (suffix: string) => `${adapter.entity}.${suffix}`;

    async function list(query: ListQuery): Promise<ListResult> {
        const base = adapter.filters(query);
        const status = query.tab ? statusFromLabel(query.tab, adapter.hiddenAsDraft) : undefined;
        const where = adapter.and([...base, ...(status ? [adapter.withStatus(status)] : [])]);
        const [rows, total, grouped] = await Promise.all([
            adapter.find({ where, orderBy: adapter.orderBy(query), skip: query.skip, take: query.take }),
            adapter.count(where),
            adapter.counts(adapter.and(base)),
        ]);
        const tabCounts: Record<string, number> = { Published: 0, [adapter.hiddenAsDraft ? "Hidden" : "Draft"]: 0, Archived: 0 };
        for (const row of grouped) {
            const label = statusLabels[row.status];
            tabCounts[adapter.hiddenAsDraft && label === "Draft" ? "Hidden" : label] = row._count._all;
        }
        return { rows: rows.map(adapter.toRow), total, tabCounts };
    }

    async function create(input: unknown, ctx: ResourceContext) {
        const { data, status } = adapter.parse(input);
        const item = await adapter.create(data);
        await writeAudit({ actorId: ctx.user.id, action: action("create"), entity: adapter.entity, entityId: item.id, after: { name: adapter.label(item), status }, ip: ctx.ip });
        return adapter.toRow(item);
    }

    async function update(id: string, input: unknown, ctx: ResourceContext) {
        const existing = await load(id);
        const { data, status } = adapter.parse(input, existing);
        const item = await adapter.update(id, data, existing);
        await writeAudit({
            actorId: ctx.user.id,
            action: existing.status !== status ? action(status === "PUBLISHED" ? "publish" : status === "ARCHIVED" ? "archive" : "unpublish") : action("update"),
            entity: adapter.entity,
            entityId: id,
            before: { name: adapter.label(existing), status: existing.status },
            after: { name: adapter.label(item), status },
            ip: ctx.ip,
        });
        return adapter.toRow(item);
    }

    async function archive(id: string, ctx: ResourceContext) {
        const existing = await load(id);
        const item = await adapter.setStatus(id, "ARCHIVED");
        await writeAudit({ actorId: ctx.user.id, action: action("archive"), entity: adapter.entity, entityId: id, before: { name: adapter.label(existing), status: existing.status }, ip: ctx.ip });
        return adapter.toRow(item);
    }

    async function remove(id: string, ctx: ResourceContext) {
        const existing = await load(id);
        await adapter.remove(id);
        await writeAudit({ actorId: ctx.user.id, action: action("delete"), entity: adapter.entity, entityId: id, before: { name: adapter.label(existing) }, ip: ctx.ip });
    }

    return {
        key: adapter.key,
        resource: adapter.resource,
        sortableKeys: adapter.sortableKeys,
        list,
        get: async (id) => adapter.toRow(await load(id)),
        create,
        update,
        remove,
        actions: { archive },
    };
}
