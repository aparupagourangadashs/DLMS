import type { Prisma } from "@/generated/prisma/client";
import { ACTOR_LEARNERS, ACTOR_SYSTEM, describeAction, summarizeChange, type AuditOptions, type AuditRow } from "@/lib/admin/audit";
import { istDayRange } from "@/lib/ist";
import { roleLabels } from "@/server/auth/permissions";
import { prisma } from "@/server/db";
import type { ListQuery } from "@/server/http/list-query";
import "server-only";

export const AUDIT_SORT_KEYS = ["when", "action", "entity"];

const include = {
    actor: { select: { id: true, email: true, role: true, staffProfile: { select: { displayName: true } }, learnerProfile: { select: { name: true } } } },
} satisfies Prisma.AuditEventInclude;

function toRow(event: Prisma.AuditEventGetPayload<{ include: typeof include }>): AuditRow {
    const actor = event.actor;
    return {
        id: event.id,
        at: event.createdAt.toISOString(),
        actorId: event.actorId,
        actorName: actor ? actor.staffProfile?.displayName ?? actor.learnerProfile?.name ?? actor.email : "No account (visitor or system)",
        actorEmail: actor?.email ?? null,
        actorRole: actor ? roleLabels[actor.role] : null,
        action: event.action,
        label: describeAction(event.action),
        entity: event.entity,
        entityId: event.entityId,
        ip: event.ip,
        summary: summarizeChange(event.before, event.after),
        before: event.before,
        after: event.after,
    };
}

function where(query: ListQuery): Prisma.AuditEventWhereInput {
    const and: Prisma.AuditEventWhereInput[] = [];
    if (query.q) {
        and.push({
            OR: [
                { action: { contains: query.q } },
                { entity: { contains: query.q } },
                { entityId: { contains: query.q } },
                { ip: { contains: query.q } },
                { actor: { email: { contains: query.q } } },
                { actor: { staffProfile: { displayName: { contains: query.q } } } },
                { actor: { learnerProfile: { name: { contains: query.q } } } },
            ],
        });
    }
    if (query.filters.action) and.push({ action: query.filters.action });
    if (query.filters.entity) and.push({ entity: query.filters.entity });
    const actor = query.filters.actor;
    if (actor === ACTOR_SYSTEM) and.push({ actorId: null });
    else if (actor === ACTOR_LEARNERS) and.push({ actor: { kind: "LEARNER" } });
    else if (actor) and.push({ actorId: actor });
    if (query.from) and.push({ createdAt: { gte: istDayRange(query.from).start } });
    if (query.to) and.push({ createdAt: { lt: istDayRange(query.to).end } });
    return and.length > 0 ? { AND: and } : {};
}

function orderBy(query: ListQuery): Prisma.AuditEventOrderByWithRelationInput[] {
    const dir = query.sort?.dir ?? "desc";
    if (query.sort?.key === "action") return [{ action: dir }, { createdAt: "desc" }];
    if (query.sort?.key === "entity") return [{ entity: dir }, { createdAt: "desc" }];
    return [{ createdAt: dir }, { id: dir }];
}

/** One page of the audit log, newest first unless sorted otherwise. Callers must already have checked `audit:read`. */
export async function listAuditEvents(query: ListQuery) {
    const filter = where(query);
    const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({ where: filter, include, orderBy: orderBy(query), skip: query.skip, take: query.take }),
        prisma.auditEvent.count({ where: filter }),
    ]);
    return { rows: events.map(toRow), total };
}

const MAX_ACTORS = 200;

/** What the filters offer: the actions and record types in the log, and the staff who appear in it, most recently active first. */
export async function auditFilterOptions(): Promise<AuditOptions> {
    const [actions, entities, actorGroups] = await Promise.all([
        prisma.auditEvent.groupBy({ by: ["action"] }),
        prisma.auditEvent.groupBy({ by: ["entity"] }),
        prisma.auditEvent.groupBy({ by: ["actorId"], where: { actor: { kind: "STAFF" } }, _max: { createdAt: true }, orderBy: { _max: { createdAt: "desc" } }, take: MAX_ACTORS }),
    ]);
    const ids = actorGroups.flatMap((group) => (group.actorId ? [group.actorId] : []));
    const people = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, role: true, staffProfile: { select: { displayName: true } } } });
    const staff = people
        .map((person) => ({ value: person.id, label: `${person.staffProfile?.displayName ?? person.email} (${roleLabels[person.role]})` }))
        .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
    return {
        actions: actions.map((group) => ({ value: group.action, label: describeAction(group.action) })).sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" })),
        entities: entities.map((group) => group.entity).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
        actors: [{ value: ACTOR_LEARNERS, label: "Learners (their own account actions)" }, { value: ACTOR_SYSTEM, label: "No account (visitors and the system)" }, ...staff],
    };
}
