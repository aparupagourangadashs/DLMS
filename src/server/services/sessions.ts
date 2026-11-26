import type { Prisma } from "@/generated/prisma/client";
import type { AdminHoliday, AdminSession, AdminSessionDetail } from "@/lib/admin/sessions";
import { addDays, fromIst, istDayRange, toIst } from "@/lib/ist";
import { optionalHttpsUrl } from "@/server/admin/resources/helpers";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import { parseWith } from "@/server/http/validate";
import { labelMap, staffOptions } from "@/server/services/lookups";
import { z } from "zod";

/** Who is acting. Branch-scoped staff only reach the batches of their own branches (and batches that belong to no branch). */
export type SessionActor = { id: string; ip?: string; role: string; branchIds: string[] };
const isScoped = (actor: SessionActor) => actor.role !== "SUPER_ADMIN" && actor.branchIds.length > 0;
const batchScope = (actor: SessionActor): Prisma.BatchWhereInput => (isScoped(actor) ? { OR: [{ branchId: { in: actor.branchIds } }, { branchId: null }] } : {});

const include = { batch: { select: { name: true, branchId: true, course: { select: { title: true } } } } } satisfies Prisma.SessionInclude;
type SessionRow = Prisma.SessionGetPayload<{ include: typeof include }>;

const realDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const date = z.string().trim().refine(realDate, "Choose a valid date.");
const time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time such as 19:00.");
const duration = z.coerce.number().int("Use whole minutes.").min(15, "A session lasts at least 15 minutes.").max(480, "A session lasts at most 8 hours.");

const createSchema = z.object({
    batchId: z.string().min(1, "Choose a batch."),
    title: z.string().trim().min(3, "Enter the session title.").max(300),
    date,
    time,
    durationMin: duration,
    link: optionalHttpsUrl.default(""),
    topics: z.string().trim().max(2000).default(""),
    instructorId: z.string().min(1).optional(),
    repeatWeeks: z.coerce.number().int("Use whole weeks.").min(0).max(26, "Repeat for at most 26 weeks.").default(0),
});

const updateSchema = z.object({
    title: z.string().trim().min(3, "Enter the session title.").max(300).optional(),
    date: date.optional(),
    time: time.optional(),
    durationMin: duration.optional(),
    link: optionalHttpsUrl.optional(),
    topics: z.string().trim().max(2000).optional(),
    instructorId: z.string().min(1).nullable().optional(),
});

function displayStatus(session: Pick<SessionRow, "status" | "endsAt">, now = new Date()): AdminSession["status"] {
    if (session.status === "CANCELLED") return "Cancelled";
    return session.status === "COMPLETED" || session.endsAt < now ? "Completed" : "Scheduled";
}

type Counts = { enrolled: Map<string, number>; attended: Map<string, number>; marked: Map<string, number>; staff: Map<string, string> };

async function countsFor(sessions: SessionRow[]): Promise<Counts> {
    const batchIds = [...new Set(sessions.map((s) => s.batchId))];
    const ids = sessions.map((s) => s.id);
    const [enrolled, marks, staff] = await Promise.all([
        batchIds.length ? prisma.enrolment.groupBy({ by: ["batchId"], where: { batchId: { in: batchIds }, status: "ACTIVE" }, _count: { _all: true } }) : [],
        ids.length ? prisma.attendance.groupBy({ by: ["sessionId", "status"], where: { sessionId: { in: ids } }, _count: { _all: true } }) : [],
        staffOptions(),
    ]);
    const attended = new Map<string, number>();
    const marked = new Map<string, number>();
    for (const g of marks) {
        marked.set(g.sessionId, (marked.get(g.sessionId) ?? 0) + g._count._all);
        if (g.status === "PRESENT") attended.set(g.sessionId, g._count._all);
    }
    return {
        enrolled: new Map(enrolled.flatMap((g) => (g.batchId ? [[g.batchId, g._count._all] as const] : []))),
        attended,
        marked,
        staff: labelMap(staff),
    };
}

function toDto(session: SessionRow, counts: Counts): AdminSession {
    const start = toIst(session.startsAt);
    return {
        id: session.id,
        batchId: session.batchId,
        batch: session.batch.name,
        course: session.batch.course.title,
        title: session.title,
        date: start.date,
        time: start.time,
        durationMin: Math.round((session.endsAt.getTime() - session.startsAt.getTime()) / 60_000),
        startsAt: session.startsAt.toISOString(),
        endsAt: session.endsAt.toISOString(),
        instructor: session.instructorId ? counts.staff.get(session.instructorId) ?? "" : "",
        link: session.joinUrl ?? "",
        status: displayStatus(session),
        cancelReason: session.cancelReason ?? "",
        topics: session.topics ?? "",
        enrolled: counts.enrolled.get(session.batchId) ?? 0,
        attended: counts.attended.get(session.id) ?? 0,
        marked: counts.marked.get(session.id) ?? 0,
    };
}

async function dtos(sessions: SessionRow[]) {
    const counts = await countsFor(sessions);
    return sessions.map((s) => toDto(s, counts));
}

async function holidayWhere(from: string, to: string, actor: SessionActor): Promise<Prisma.HolidayWhereInput> {
    const range = { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) };
    return { date: range, ...(isScoped(actor) ? { OR: [{ branchId: null }, { branchId: { in: actor.branchIds } }] } : {}) };
}

const toHoliday = (h: { id: string; date: Date; reason: string; branch: { name: string } | null }): AdminHoliday => ({ id: h.id, date: h.date.toISOString().slice(0, 10), reason: h.reason, branch: h.branch?.name ?? "" });

/** Sessions and holidays between two IST dates, inclusive. */
export async function listSessions(range: { from: string; to: string; batchId?: string }, actor: SessionActor) {
    if (!realDate(range.from) || !realDate(range.to) || range.from > range.to) throw new ValidationError({ from: "Use a valid date range." });
    if (addDays(range.from, 100) < range.to) throw new ValidationError({ to: "Choose at most 100 days at a time." });
    const rows = await prisma.session.findMany({
        where: { startsAt: { gte: istDayRange(range.from).start, lt: istDayRange(range.to).end }, batch: batchScope(actor), ...(range.batchId ? { batchId: range.batchId } : {}) },
        include,
        orderBy: { startsAt: "asc" },
    });
    const holidays = await prisma.holiday.findMany({ where: await holidayWhere(range.from, range.to, actor), include: { branch: { select: { name: true } } }, orderBy: { date: "asc" } });
    return { sessions: await dtos(rows), holidays: holidays.map(toHoliday) };
}

/** Branch names for the holiday form. Staff tied to branches only see their own, and must name one. */
export async function listHolidayBranches(actor: Pick<SessionActor, "role" | "branchIds">) {
    const scoped = actor.role !== "SUPER_ADMIN" && actor.branchIds.length > 0;
    const branches = await prisma.branch.findMany({ where: { status: "ACTIVE", ...(scoped ? { id: { in: actor.branchIds } } : {}) }, orderBy: { name: "asc" }, select: { name: true } });
    return { branches: branches.map((b) => b.name), required: scoped };
}

async function loadSession(id: string, actor: SessionActor) {
    const session = await prisma.session.findFirst({ where: { id, batch: batchScope(actor) }, include });
    if (!session) throw new NotFound();
    return session;
}

async function holidayOn(day: string, branchId: string | null) {
    return prisma.holiday.findFirst({ where: { date: new Date(`${day}T00:00:00Z`), OR: branchId ? [{ branchId: null }, { branchId }] : [{ branchId: null }] } });
}

async function assertNoClash(instructorId: string | null, startsAt: Date, endsAt: Date, excludeId?: string) {
    if (!instructorId) return;
    const clash = await prisma.session.findFirst({
        where: { instructorId, status: { not: "CANCELLED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) },
        include: { batch: { select: { name: true } } },
    });
    if (clash) {
        const at = toIst(clash.startsAt);
        throw new Conflict(`The instructor already teaches "${clash.title}" (${clash.batch.name}) on ${at.date} at ${at.time}.`, { time: "Overlaps another session of this instructor." });
    }
}

async function validInstructor(id: string | null | undefined) {
    if (!id) return null;
    const staff = await prisma.user.findFirst({ where: { id, kind: "STAFF", status: "ACTIVE" }, select: { id: true } });
    if (!staff) throw new ValidationError({ instructorId: "Choose an active staff member." });
    return staff.id;
}

/** Schedules one session, or a weekly series. Dates on a holiday or past the batch end are skipped in a series. */
export async function createSessions(input: unknown, actor: SessionActor) {
    const data = parseWith(createSchema, input);
    const batch = await prisma.batch.findFirst({ where: { id: data.batchId, ...batchScope(actor) } });
    if (!batch) throw new ValidationError({ batchId: "Choose an existing batch." });
    if (batch.status !== "ACTIVE") throw new BusinessRule("This batch is not active. Reopen it to add sessions.");
    const firstDay = new Date(`${data.date}T00:00:00Z`);
    if (firstDay < batch.startDate || firstDay > batch.endDate) throw new ValidationError({ date: "The first session must fall within the batch dates." });
    const instructorId = data.instructorId === undefined ? batch.instructorId : await validInstructor(data.instructorId);

    const rows: Prisma.SessionUncheckedCreateInput[] = [];
    const skippedHolidays: string[] = [];
    for (let week = 0; week <= data.repeatWeeks; week += 1) {
        const day = addDays(data.date, week * 7);
        if (new Date(`${day}T00:00:00Z`) > batch.endDate) break;
        if (await holidayOn(day, batch.branchId)) {
            if (data.repeatWeeks === 0) throw new BusinessRule("That day is a holiday.");
            skippedHolidays.push(day);
            continue;
        }
        const startsAt = fromIst(day, data.time);
        const endsAt = new Date(startsAt.getTime() + data.durationMin * 60_000);
        await assertNoClash(instructorId, startsAt, endsAt);
        rows.push({ batchId: batch.id, title: data.title, startsAt, endsAt, joinUrl: data.link || null, topics: data.topics || null, instructorId });
    }
    if (rows.length === 0) throw new BusinessRule("Every date falls on a holiday or after the batch ends.");
    const created = await prisma.$transaction(rows.map((row) => prisma.session.create({ data: row, include })));
    await writeAudit({ actorId: actor.id, action: "session.create", entity: "Session", entityId: created[0].id, after: { batch: batch.name, title: data.title, count: created.length }, ip: actor.ip });
    return { created: await dtos(created), skippedHolidays };
}

export async function updateSession(id: string, input: unknown, actor: SessionActor): Promise<AdminSession> {
    const existing = await loadSession(id, actor);
    if (existing.status === "CANCELLED") throw new BusinessRule("A cancelled session cannot be changed.");
    const data = parseWith(updateSchema, input);
    const current = toIst(existing.startsAt);
    const day = data.date ?? current.date;
    const startsAt = fromIst(day, data.time ?? current.time);
    const minutes = data.durationMin ?? Math.round((existing.endsAt.getTime() - existing.startsAt.getTime()) / 60_000);
    const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
    const instructorId = data.instructorId === undefined ? existing.instructorId : await validInstructor(data.instructorId);

    const moved = startsAt.getTime() !== existing.startsAt.getTime() || endsAt.getTime() !== existing.endsAt.getTime();
    if (moved) {
        if (await holidayOn(day, existing.batch.branchId)) throw new BusinessRule("That day is a holiday.");
        await assertNoClash(instructorId, startsAt, endsAt, id);
    }
    const updated = await prisma.session.update({
        where: { id },
        data: {
            ...(data.title !== undefined ? { title: data.title } : {}),
            startsAt,
            endsAt,
            ...(data.link !== undefined ? { joinUrl: data.link || null } : {}),
            ...(data.topics !== undefined ? { topics: data.topics || null } : {}),
            instructorId,
        },
        include,
    });
    await writeAudit({ actorId: actor.id, action: moved ? "session.reschedule" : "session.update", entity: "Session", entityId: id, before: { startsAt: existing.startsAt }, after: { startsAt, endsAt }, ip: actor.ip });
    return (await dtos([updated]))[0];
}

const cancelSchema = z.object({ reason: z.string().trim().min(3, "Say why the session is cancelled.").max(300) });

/** Cancels a session. Learners see it as cancelled; reminder and notice delivery arrive with the messaging phase. */
export async function cancelSession(id: string, input: unknown, actor: SessionActor): Promise<AdminSession> {
    const { reason } = parseWith(cancelSchema, input);
    const existing = await loadSession(id, actor);
    if (existing.status === "CANCELLED") throw new BusinessRule("This session is already cancelled.");
    const updated = await prisma.session.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason }, include });
    await writeAudit({ actorId: actor.id, action: "session.cancel", entity: "Session", entityId: id, after: { reason }, ip: actor.ip });
    return (await dtos([updated]))[0];
}

const holidaySchema = z.object({ date, reason: z.string().trim().min(3, "Say what the holiday is.").max(200), branch: z.string().trim().default("") });

/** A day with no classes: every scheduled session of the affected batches that day is cancelled. */
export async function markHoliday(input: unknown, actor: SessionActor) {
    const data = parseWith(holidaySchema, input);
    let branchId: string | null = null;
    if (data.branch) {
        const branch = await prisma.branch.findUnique({ where: { name: data.branch } });
        if (!branch) throw new ValidationError({ branch: "Choose an existing branch." });
        if (isScoped(actor) && !actor.branchIds.includes(branch.id)) throw new Forbidden("You can only mark holidays for your own branch.");
        branchId = branch.id;
    } else if (isScoped(actor)) {
        throw new ValidationError({ branch: "Choose your branch." });
    }
    const day = new Date(`${data.date}T00:00:00Z`);
    if (await prisma.holiday.findFirst({ where: { date: day, branchId }, select: { id: true } })) throw new Conflict("This day is already marked as a holiday.", { date: "Already a holiday." });

    const { start, end } = istDayRange(data.date);
    const [holiday, cancelled] = await prisma.$transaction([
        prisma.holiday.create({ data: { date: day, branchId, reason: data.reason, createdById: actor.id }, include: { branch: { select: { name: true } } } }),
        prisma.session.updateMany({
            where: { status: "SCHEDULED", startsAt: { gte: start, lt: end }, batch: branchId ? { branchId } : {} },
            data: { status: "CANCELLED", cancelReason: `Holiday: ${data.reason}` },
        }),
    ]);
    await writeAudit({ actorId: actor.id, action: "holiday.create", entity: "Holiday", entityId: holiday.id, after: { date: data.date, branch: holiday.branch?.name ?? null, cancelled: cancelled.count }, ip: actor.ip });
    return { holiday: toHoliday(holiday), cancelled: cancelled.count };
}

export async function removeHoliday(id: string, actor: SessionActor) {
    const holiday = await prisma.holiday.findFirst({ where: { id, ...(isScoped(actor) ? { branchId: { in: actor.branchIds } } : {}) } });
    if (!holiday) throw new NotFound();
    await prisma.holiday.delete({ where: { id } });
    await writeAudit({ actorId: actor.id, action: "holiday.delete", entity: "Holiday", entityId: id, before: { date: holiday.date.toISOString().slice(0, 10) }, ip: actor.ip });
}

export async function getSessionDetail(id: string, actor: SessionActor): Promise<AdminSessionDetail> {
    const session = await loadSession(id, actor);
    const [dto] = await dtos([session]);
    const [enrolments, marks, recordings] = await Promise.all([
        prisma.enrolment.findMany({
            where: { batchId: session.batchId, status: "ACTIVE" },
            select: { userId: true, user: { select: { email: true, learnerProfile: { select: { name: true, registrationNo: true } } } } },
            orderBy: { enrolledAt: "asc" },
        }),
        prisma.attendance.findMany({ where: { sessionId: id }, select: { userId: true, status: true } }),
        prisma.recording.findMany({ where: { sessionId: id }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, url: true, status: true } }),
    ]);
    const markOf = new Map(marks.map((m) => [m.userId, m.status]));
    return {
        ...dto,
        roster: enrolments.map((e) => ({
            userId: e.userId,
            name: e.user.learnerProfile?.name ?? e.user.email,
            email: e.user.email,
            regNo: e.user.learnerProfile?.registrationNo ?? "",
            mark: markOf.get(e.userId) === "PRESENT" ? "Present" : markOf.get(e.userId) === "ABSENT" ? "Absent" : "Not marked",
        })),
        canMarkAttendance: session.status !== "CANCELLED" && session.startsAt <= new Date(),
        recordings: recordings.map((r) => ({ id: r.id, title: r.title || session.title, url: r.url, status: r.status === "AVAILABLE" ? "Available" : r.status === "PROCESSING" ? "Processing" : "Failed" })),
    };
}

const attendanceSchema = z.object({
    marks: z.array(z.object({ userId: z.string().min(1), status: z.enum(["PRESENT", "ABSENT"], { error: "Choose Present or Absent." }) })).min(1, "Mark at least one learner.").max(500),
});

/** Saves who was present. Only learners enrolled in the batch can be marked, and only once the session has started. */
export async function markAttendance(id: string, input: unknown, actor: SessionActor): Promise<AdminSessionDetail> {
    const { marks } = parseWith(attendanceSchema, input);
    const session = await loadSession(id, actor);
    if (session.status === "CANCELLED") throw new BusinessRule("A cancelled session has no attendance.");
    if (session.startsAt > new Date()) throw new BusinessRule("Attendance opens when the session starts.");
    const enrolled = new Set((await prisma.enrolment.findMany({ where: { batchId: session.batchId, status: "ACTIVE" }, select: { userId: true } })).map((e) => e.userId));
    const outsiders = marks.filter((m) => !enrolled.has(m.userId));
    if (outsiders.length > 0) throw new ValidationError({ marks: "Some learners are not enrolled in this batch." });
    const now = new Date();
    await prisma.$transaction(
        marks.map((m) =>
            prisma.attendance.upsert({
                where: { sessionId_userId: { sessionId: id, userId: m.userId } },
                create: { sessionId: id, userId: m.userId, status: m.status, signedInAt: m.status === "PRESENT" ? now : null, markedById: actor.id },
                update: { status: m.status, signedInAt: m.status === "PRESENT" ? now : null, markedById: actor.id },
            }),
        ),
    );
    await writeAudit({ actorId: actor.id, action: "attendance.mark", entity: "Session", entityId: id, after: { count: marks.length, present: marks.filter((m) => m.status === "PRESENT").length }, ip: actor.ip });
    return getSessionDetail(id, actor);
}
