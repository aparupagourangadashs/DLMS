import type { Prisma, SupportStatus } from "@/generated/prisma/client";
import type { SupportRequestDto } from "@/lib/student/profile";
import { writeAudit } from "@/server/audit";
import type { SessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { sendEmail } from "@/server/notify/email";
import { notifyStaff, notifyUser } from "@/server/services/notifications";
import { getSiteSettings } from "@/server/services/public/site";
import { z } from "zod";

export const supportStatusLabels: Record<SupportStatus, SupportRequestDto["status"]> = { OPEN: "Open", IN_PROGRESS: "In progress", RESOLVED: "Resolved" };
const statusFromLabel = (label: string) => (Object.keys(supportStatusLabels) as SupportStatus[]).find((k) => supportStatusLabels[k] === label);

const createSchema = z.object({
    message: z.string().trim().min(10, "Please write at least 10 characters.").max(2000, "Use at most 2,000 characters."),
});

const withReplies = { replies: { orderBy: { createdAt: "asc" } } } satisfies Prisma.SupportRequestInclude;
type RequestWithReplies = Prisma.SupportRequestGetPayload<{ include: typeof withReplies }>;

const toLearnerDto = (request: RequestWithReplies): SupportRequestDto => ({
    id: request.id,
    message: request.message,
    status: supportStatusLabels[request.status],
    createdAt: request.createdAt.toISOString(),
    replies: request.replies.map((reply) => ({ id: reply.id, body: reply.body, createdAt: reply.createdAt.toISOString() })),
});

/** A learner's own request. The team is told by email (console driver for now) and the learner gets an acknowledgement. */
export async function createSupportRequest(user: Pick<SessionUser, "id" | "name" | "email">, input: unknown, ip?: string): Promise<SupportRequestDto> {
    const { message } = parseWith(createSchema, input);
    const request = await prisma.supportRequest.create({ data: { userId: user.id, name: user.name, email: user.email, message }, include: withReplies });
    await writeAudit({ actorId: user.id, action: "support.create", entity: "SupportRequest", entityId: request.id, ip });
    await notifyStaff("supportRequests:read", { kind: "support.request", title: `New support request from ${user.name}`, body: message, href: `/admin/engage/support?open=${request.id}` });

    const { contact } = await getSiteSettings();
    await sendEmail({ to: contact.email, subject: "New learner support request", text: `${user.name} <${user.email}> wrote:\n\n${message}\n\nOpen Engage > Support Inbox in the admin to reply.` });
    await sendEmail({ to: user.email, subject: "We received your message", text: `Hello ${user.name.split(" ")[0] || "there"},\n\nThank you for writing to IBMV. A member of the team will reply by email.\n\nIBMV` });
    return toLearnerDto(request);
}

export async function listMySupportRequests(userId: string): Promise<SupportRequestDto[]> {
    const rows = await prisma.supportRequest.findMany({ where: { userId }, include: withReplies, orderBy: { createdAt: "desc" }, take: 20 });
    return rows.map(toLearnerDto);
}

// ---- Staff inbox ----------------------------------------------------------

export type SupportListItem = {
    id: string;
    name: string;
    email: string;
    message: string;
    status: SupportRequestDto["status"];
    createdAt: string;
    assignedTo: string;
    replyCount: number;
};

export type SupportThread = SupportListItem & {
    assignedToId: string | null;
    replies: Array<{ id: string; body: string; createdAt: string; author: string; fromStaff: boolean }>;
};

const staffName = (user: { email: string; staffProfile: { displayName: string } | null } | null) => (user ? user.staffProfile?.displayName ?? user.email : "");

const listInclude = { assignedTo: { select: { email: true, staffProfile: { select: { displayName: true } } } }, _count: { select: { replies: true } } } satisfies Prisma.SupportRequestInclude;

function toItem(row: Prisma.SupportRequestGetPayload<{ include: typeof listInclude }>): SupportListItem {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        status: supportStatusLabels[row.status],
        createdAt: row.createdAt.toISOString(),
        assignedTo: staffName(row.assignedTo),
        replyCount: row._count.replies,
    };
}

export async function listSupportRequests(query: Pick<ListQuery, "q" | "tab" | "skip" | "take">) {
    const base: Prisma.SupportRequestWhereInput = query.q
        ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }, { message: { contains: query.q } }] }
        : {};
    const status = query.tab ? statusFromLabel(query.tab) : undefined;
    const where: Prisma.SupportRequestWhereInput = status ? { AND: [base, { status }] } : base;
    const [rows, total, grouped] = await Promise.all([
        prisma.supportRequest.findMany({ where, include: listInclude, orderBy: { createdAt: "desc" }, skip: query.skip, take: query.take }),
        prisma.supportRequest.count({ where }),
        prisma.supportRequest.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    ]);
    const tabCounts: Record<string, number> = { Open: 0, "In progress": 0, Resolved: 0 };
    for (const row of grouped) tabCounts[supportStatusLabels[row.status]] = row._count._all;
    return { rows: rows.map(toItem), total, tabCounts };
}

export async function getSupportThread(id: string): Promise<SupportThread> {
    const row = await prisma.supportRequest.findUnique({
        where: { id },
        include: { ...listInclude, replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { kind: true, email: true, staffProfile: { select: { displayName: true } } } } } } },
    });
    if (!row) throw new NotFound();
    return {
        ...toItem(row),
        assignedToId: row.assignedToId,
        replies: row.replies.map((reply) => ({
            id: reply.id,
            body: reply.body,
            createdAt: reply.createdAt.toISOString(),
            author: staffName(reply.author) || "IBMV team",
            fromStaff: reply.author?.kind !== "LEARNER",
        })),
    };
}

const updateSchema = z.object({ status: z.string().optional(), assignedToId: z.string().min(1).nullable().optional() });

export async function updateSupportRequest(id: string, input: unknown, actor: { id: string; ip?: string }): Promise<SupportThread> {
    const data = parseWith(updateSchema, input);
    const existing = await prisma.supportRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFound();

    const update: Prisma.SupportRequestUncheckedUpdateInput = {};
    if (data.status !== undefined) {
        const status = statusFromLabel(data.status);
        if (!status) throw new ValidationError({ status: "Choose Open, In progress or Resolved." });
        update.status = status;
    }
    if (data.assignedToId !== undefined) {
        if (data.assignedToId !== null) {
            const staff = await prisma.user.findFirst({ where: { id: data.assignedToId, kind: "STAFF", status: "ACTIVE" }, select: { id: true } });
            if (!staff) throw new ValidationError({ assignedToId: "Choose an active staff member." });
        }
        update.assignedToId = data.assignedToId;
    }
    if (Object.keys(update).length > 0) {
        await prisma.supportRequest.update({ where: { id }, data: update });
        await writeAudit({
            actorId: actor.id,
            action: update.status !== undefined && update.status !== existing.status ? "support.status" : "support.update",
            entity: "SupportRequest",
            entityId: id,
            before: { status: existing.status, assignedToId: existing.assignedToId },
            after: { status: update.status ?? existing.status, assignedToId: update.assignedToId === undefined ? existing.assignedToId : update.assignedToId },
            ip: actor.ip,
        });
        const assignee = update.assignedToId;
        if (typeof assignee === "string" && assignee !== existing.assignedToId && assignee !== actor.id) {
            await notifyUser(assignee, { kind: "support.assigned", title: "A support request was assigned to you", body: `${existing.name}: ${existing.message}`, href: `/admin/engage/support?open=${id}` });
        }
    }
    return getSupportThread(id);
}

const replySchema = z.object({ body: z.string().trim().min(2, "Write a reply.").max(5000, "Use at most 5,000 characters.") });

/** Adds a staff reply, emails it to the learner, and moves an Open request to In progress. */
export async function replyToSupportRequest(id: string, input: unknown, actor: { id: string; ip?: string }): Promise<SupportThread> {
    const { body } = parseWith(replySchema, input);
    const existing = await prisma.supportRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFound();
    await prisma.$transaction([
        prisma.supportReply.create({ data: { requestId: id, authorId: actor.id, body } }),
        prisma.supportRequest.update({
            where: { id },
            data: { status: existing.status === "OPEN" ? "IN_PROGRESS" : existing.status, assignedToId: existing.assignedToId ?? actor.id },
        }),
    ]);
    await writeAudit({ actorId: actor.id, action: "support.reply", entity: "SupportRequest", entityId: id, after: { length: body.length }, ip: actor.ip });
    await sendEmail({ to: existing.email, subject: "A reply from IBMV", text: `Hello ${existing.name.split(" ")[0] || "there"},\n\n${body}\n\nYou can also see this reply under Help in your student portal.\n\nIBMV` });
    return getSupportThread(id);
}
