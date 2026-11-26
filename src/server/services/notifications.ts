import { can, staffRoles, type Permission } from "@/server/auth/permissions";
import { prisma } from "@/server/db";
import { parseWith } from "@/server/http/validate";
import "server-only";
import { z } from "zod";

export type NotificationDto = { id: string; kind: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string };
export type NotificationList = { unread: number; items: NotificationDto[] };
export type NewNotification = { kind: string; title: string; body?: string | null; href?: string | null };

const LIST_LIMIT = 20;
const KEEP_MS = 90 * 86_400_000;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}\u2026` : text);
/** A notification may only open a page of this site. */
const onSite = (href?: string | null) => (href && href.length <= 300 && /^\/(?!\/)\S*$/.test(href) ? href : null);

async function deliver(userIds: string[], message: NewNotification, now = new Date()) {
    if (userIds.length === 0) return 0;
    await prisma.inAppNotification.createMany({
        data: userIds.map((userId) => ({ userId, kind: clip(message.kind, 40), title: clip(message.title, 200), body: message.body ? clip(message.body, 500) : null, href: onSite(message.href) })),
    });
    // Old messages are dropped as new ones arrive, so the table needs no separate clean-up job.
    await prisma.inAppNotification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - KEEP_MS) } } });
    return userIds.length;
}

/** Tells every active staff member whose role holds `permission`. Never throws: the event that caused it has already happened. */
export async function notifyStaff(permission: Permission, message: NewNotification, options: { exceptUserId?: string } = {}) {
    try {
        const roles = staffRoles.filter((role) => can(role, permission));
        const people = await prisma.user.findMany({
            where: { kind: "STAFF", status: "ACTIVE", role: { in: roles }, ...(options.exceptUserId ? { id: { not: options.exceptUserId } } : {}) },
            select: { id: true },
        });
        return await deliver(people.map((person) => person.id), message);
    } catch (error) {
        console.error("[notifications] could not notify staff", error);
        return 0;
    }
}

/** Tells one person. Never throws, like `notifyStaff`. */
export async function notifyUser(userId: string, message: NewNotification) {
    try {
        return await deliver([userId], message);
    } catch (error) {
        console.error("[notifications] could not notify a user", error);
        return 0;
    }
}

/** The newest messages in a person's bell, and how many of all of theirs are unread. */
export async function listNotifications(userId: string): Promise<NotificationList> {
    const [rows, unread] = await Promise.all([
        prisma.inAppNotification.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: LIST_LIMIT }),
        prisma.inAppNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { unread, items: rows.map((row) => ({ id: row.id, kind: row.kind, title: row.title, body: row.body, href: row.href, read: row.readAt !== null, createdAt: row.createdAt.toISOString() })) };
}

const readSchema = z.object({ ids: z.array(z.string().min(1).max(40)).max(50).optional() });

/** Marks the listed messages read, or all of them when no list is given. Only the person's own messages can be touched. */
export async function markNotificationsRead(userId: string, input: unknown) {
    const { ids } = parseWith(readSchema, input);
    const result = await prisma.inAppNotification.updateMany({ where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
    return { marked: result.count, unread: await prisma.inAppNotification.count({ where: { userId, readAt: null } }) };
}
