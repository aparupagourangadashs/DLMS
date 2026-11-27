import type { Prisma } from "@/generated/prisma/client";
import type { ActivitySummary, AttendanceSummary, DashboardOverview, EnrolmentSeries } from "@/lib/admin/dashboard";
import { addDays, istDayRange, istToday, toIst } from "@/lib/ist";
import { prisma } from "@/server/db";

export type DashboardActor = { role: string; branchIds: string[] };

const isScoped = (actor: DashboardActor) => actor.role !== "SUPER_ADMIN" && actor.branchIds.length > 0;
const batchScope = (actor: DashboardActor): Prisma.BatchWhereInput => (isScoped(actor) ? { OR: [{ branchId: { in: actor.branchIds } }, { branchId: null }] } : {});
const learnerScope = (actor: DashboardActor): Prisma.UserWhereInput => (isScoped(actor) ? { learnerProfile: { branchId: { in: actor.branchIds } } } : {});

const WEEKS = 8;
const DAY_MS = 86_400_000;
const mondayOf = (date: string) => addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
const share = (present: number, expected: number) => (expected > 0 ? Math.round((100 * present) / expected) : null);

type Tally = { present: number; expected: number };

async function attendanceSummary(actor: DashboardActor, today: string, now: Date): Promise<AttendanceSummary> {
    const sessions = await prisma.session.findMany({
        where: { startsAt: { gte: istDayRange(addDays(today, -13)).start, lt: istDayRange(today).end }, endsAt: { lt: now }, status: { not: "CANCELLED" }, batch: batchScope(actor) },
        select: { id: true, batchId: true, startsAt: true },
    });
    if (sessions.length === 0) return { percent: null, previousPercent: null, days: [] };
    const [marks, enrolled] = await Promise.all([
        prisma.attendance.groupBy({ by: ["sessionId", "status"], where: { sessionId: { in: sessions.map((s) => s.id) } }, _count: { _all: true } }),
        prisma.enrolment.groupBy({ by: ["batchId"], where: { batchId: { in: [...new Set(sessions.map((s) => s.batchId))] }, status: "ACTIVE" }, _count: { _all: true } }),
    ]);
    const present = new Map<string, number>();
    const marked = new Map<string, number>();
    for (const g of marks) {
        marked.set(g.sessionId, (marked.get(g.sessionId) ?? 0) + g._count._all);
        if (g.status === "PRESENT") present.set(g.sessionId, g._count._all);
    }
    const enrolledIn = new Map(enrolled.flatMap((g) => (g.batchId ? [[g.batchId, g._count._all] as const] : [])));

    const current: Tally = { present: 0, expected: 0 };
    const previous: Tally = { present: 0, expected: 0 };
    const byDay = new Map<string, Tally>();
    const lastWeekStart = addDays(today, -6);
    for (const session of sessions) {
        const count = marked.get(session.id) ?? 0;
        if (count === 0) continue;
        // A learner who left the batch since the class can still have a mark, so the expected number never falls below it.
        const expected = Math.max(enrolledIn.get(session.batchId) ?? 0, count);
        const day = toIst(session.startsAt).date;
        const tally = day >= lastWeekStart ? current : previous;
        tally.present += present.get(session.id) ?? 0;
        tally.expected += expected;
        if (day >= lastWeekStart) {
            const entry = byDay.get(day) ?? { present: 0, expected: 0 };
            entry.present += present.get(session.id) ?? 0;
            entry.expected += expected;
            byDay.set(day, entry);
        }
    }
    return {
        percent: share(current.present, current.expected),
        previousPercent: share(previous.present, previous.expected),
        days: [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, t]) => ({ date, percent: share(t.present, t.expected) ?? 0 })),
    };
}

async function enrolmentSeries(actor: DashboardActor, today: string): Promise<EnrolmentSeries> {
    const thisWeek = mondayOf(today);
    const weekStarts = Array.from({ length: WEEKS }, (_, i) => addDays(thisWeek, (i - (WEEKS - 1)) * 7));
    const range = { gte: istDayRange(weekStarts[0]).start, lt: istDayRange(addDays(thisWeek, 7)).start };
    const [users, enrolments] = await Promise.all([
        prisma.user.findMany({ where: { kind: "LEARNER", createdAt: range, ...learnerScope(actor) }, select: { createdAt: true } }),
        prisma.enrolment.findMany({ where: { enrolledAt: range, status: { not: "CANCELLED" }, user: learnerScope(actor) }, select: { enrolledAt: true } }),
    ]);
    const first = new Date(`${weekStarts[0]}T00:00:00Z`).getTime();
    const tally = (instants: Date[]) => {
        const counts = Array.from({ length: WEEKS }, () => 0);
        for (const at of instants) {
            const index = Math.floor((new Date(`${toIst(at).date}T00:00:00Z`).getTime() - first) / (7 * DAY_MS));
            if (index >= 0 && index < WEEKS) counts[index] += 1;
        }
        return counts;
    };
    return { weekStarts, signups: tally(users.map((u) => u.createdAt)), enrolments: tally(enrolments.map((e) => e.enrolledAt)) };
}

async function activitySummary(actor: DashboardActor, today: string): Promise<ActivitySummary> {
    const from = addDays(today, -9);
    const to = istDayRange(today).end;
    const rows = await prisma.userActivity.findMany({
        where: {
            occurredAt: { gte: istDayRange(from).start, lt: to },
            user: isScoped(actor) ? { learnerProfile: { branchId: { in: actor.branchIds } } } : {},
        },
        select: { userId: true, kind: true, durationSec: true, occurredAt: true },
    });
    const trendMap = new Map<string, { activeUsers: Set<string>; minutes: number; views: number }>();
    for (let i = 0; i < 10; i += 1) {
        trendMap.set(addDays(from, i), { activeUsers: new Set(), minutes: 0, views: 0 });
    }
    for (const row of rows) {
        const day = toIst(row.occurredAt).date;
        const entry = trendMap.get(day);
        if (!entry) continue;
        entry.activeUsers.add(row.userId);
        entry.minutes += row.durationSec;
        if (row.kind === "PAGE_VIEW") entry.views += 1;
    }
    const trend = [...trendMap].map(([date, entry]) => ({
        date,
        activeUsers: entry.activeUsers.size,
        minutes: Math.round(entry.minutes / 60),
        views: entry.views,
    }));
    const last = trend.at(-1);
    const durations = rows.filter((row) => row.durationSec > 0).map((row) => row.durationSec);
    const totalViews = trend.reduce((sum, row) => sum + row.views, 0);
    const averageTimeSec = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;
    return {
        dailyActiveUsers: last?.activeUsers ?? 0,
        averageTimeSec,
        totalViews,
        trend,
    };
}

/** The dashboard's date-independent figures. A part the caller may not read is not computed. */
export async function getDashboardOverview(actor: DashboardActor, include: { attendance: boolean; series: boolean; activity?: boolean }, now = new Date()): Promise<DashboardOverview> {
    const today = istToday(now);
    const [attendance, series, activity] = await Promise.all([
        include.attendance ? attendanceSummary(actor, today, now) : null,
        include.series ? enrolmentSeries(actor, today) : null,
        include.activity ? activitySummary(actor, today) : null,
    ]);
    return include.activity
        ? { today, attendance, series, activity }
        : { today, attendance, series };
}
