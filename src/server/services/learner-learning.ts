import type { Prisma } from "@/generated/prisma/client";
import { addDays, istDayRange, istToday } from "@/lib/ist";
import type { HomeSummary, StudentAnnouncement, StudentCourse, StudentRecording, StudentSession, StudentSessionsData } from "@/lib/student/learning-types";
import { prisma } from "@/server/db";
import { NotFound, ValidationError } from "@/server/http/errors";
import { percentOf } from "./learner-content";
import { listBanners } from "./public/banners";

export type { HomeSummary, StudentAnnouncement, StudentCourse, StudentRecording, StudentSession, StudentSessionsData };

// ---- Courses ----------------------------------------------------------------

const day = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

/** The learner's own enrolments. An active enrolment past its access end date is shown as expired, not active. Cancelled ones are not shown. */
export async function listMyCourses(userId: string, today = istToday()): Promise<StudentCourse[]> {
    const rows = await prisma.enrolment.findMany({
        where: { userId, status: { in: ["ACTIVE", "COMPLETED", "EXPIRED"] } },
        include: { course: { select: { slug: true, title: true, officialUrl: true, category: { select: { title: true } } } }, batch: { select: { name: true } } },
        orderBy: { enrolledAt: "desc" },
    });
    const courseIds = [...new Set(rows.map((r) => r.courseId))];
    const [links, doneGroups] = await Promise.all([
        courseIds.length ? prisma.courseModule.findMany({ where: { courseId: { in: courseIds }, module: { status: "PUBLISHED" } }, select: { courseId: true, module: { select: { _count: { select: { contents: true } } } } } }) : [],
        rows.length ? prisma.lessonProgress.groupBy({ by: ["enrolmentId"], where: { enrolmentId: { in: rows.map((r) => r.id) } }, _count: { _all: true } }) : [],
    ]);
    const totals = new Map<string, number>();
    for (const link of links) totals.set(link.courseId, (totals.get(link.courseId) ?? 0) + link.module._count.contents);
    const doneBy = new Map(doneGroups.map((g) => [g.enrolmentId, g._count._all]));
    return rows.map((row) => {
        const ended = row.accessEndsAt !== null && day(row.accessEndsAt)! < today;
        const lessons = totals.get(row.courseId) ?? 0;
        const completedLessons = Math.min(doneBy.get(row.id) ?? 0, lessons);
        return {
            enrolmentId: row.id,
            slug: row.course.slug,
            title: row.course.title,
            collection: row.course.category.title,
            batch: row.batch?.name ?? "",
            status: row.status === "COMPLETED" ? "Completed" : row.status === "EXPIRED" || ended ? "Expired" : "Active",
            enrolledAt: row.enrolledAt.toISOString(),
            accessStartsAt: day(row.accessStartsAt),
            accessEndsAt: day(row.accessEndsAt),
            progressPercent: lessons > 0 ? percentOf(completedLessons, lessons) : row.progressPercent,
            lessons,
            completedLessons,
            officialUrl: row.course.officialUrl,
        };
    });
}

/** Batches whose sessions and announcements this learner may see. */
async function myBatchIds(userId: string) {
    const rows = await prisma.enrolment.findMany({ where: { userId, status: { in: ["ACTIVE", "COMPLETED"] }, batchId: { not: null } }, select: { batchId: true } });
    return [...new Set(rows.flatMap((r) => (r.batchId ? [r.batchId] : [])))];
}

// ---- Sessions ---------------------------------------------------------------

const JOIN_LEAD_MS = 15 * 60_000;

export async function listMySessions(userId: string, range: { from: string; to: string }, now = new Date()): Promise<StudentSessionsData> {
    const validDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
    if (!validDay(range.from) || !validDay(range.to) || range.from > range.to) throw new ValidationError({ from: "Use a valid date range." });
    if (addDays(range.from, 100) < range.to) throw new ValidationError({ to: "Choose at most 100 days at a time." });

    const batchIds = await myBatchIds(userId);
    const profile = await prisma.learnerProfile.findUnique({ where: { userId }, select: { branchId: true } });
    const [sessions, holidays] = await Promise.all([
        batchIds.length === 0
            ? []
            : prisma.session.findMany({
                where: { batchId: { in: batchIds }, startsAt: { gte: istDayRange(range.from).start, lt: istDayRange(range.to).end } },
                include: {
                    batch: { select: { name: true, course: { select: { title: true } }, instructor: { select: { email: true, staffProfile: { select: { displayName: true } } } } } },
                    instructor: { select: { email: true, staffProfile: { select: { displayName: true } } } },
                    recordings: { where: { status: "AVAILABLE" }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, url: true } },
                },
                orderBy: { startsAt: "asc" },
            }),
        prisma.holiday.findMany({
            where: { date: { gte: new Date(`${range.from}T00:00:00Z`), lte: new Date(`${range.to}T00:00:00Z`) }, OR: profile?.branchId ? [{ branchId: null }, { branchId: profile.branchId }] : [{ branchId: null }] },
            orderBy: { date: "asc" },
        }),
    ]);

    const result: StudentSession[] = sessions.map((s) => {
        const teacher = s.instructor ?? s.batch.instructor;
        const status = s.status === "CANCELLED" ? "Cancelled" : s.status === "COMPLETED" || s.endsAt < now ? "Completed" : "Scheduled";
        const joinable = status === "Scheduled" && s.joinUrl !== null && now.getTime() >= s.startsAt.getTime() - JOIN_LEAD_MS && now <= s.endsAt;
        return {
            id: s.id,
            title: s.title,
            course: s.batch.course.title,
            batch: s.batch.name,
            startsAt: s.startsAt.toISOString(),
            endsAt: s.endsAt.toISOString(),
            status,
            cancelReason: s.cancelReason ?? "",
            instructor: teacher ? teacher.staffProfile?.displayName ?? teacher.email : "",
            topics: s.topics ?? "",
            joinUrl: joinable ? s.joinUrl : null,
            recordings: s.status === "CANCELLED" ? [] : s.recordings.map((r) => ({ id: r.id, title: r.title || s.title, url: r.url })),
        };
    });
    return { sessions: result, holidays: holidays.map((h) => ({ date: day(h.date)!, reason: h.reason })) };
}

// ---- Announcements ----------------------------------------------------------

const urgencyLabel = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;
const urgencyRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

async function visibleAnnouncements(userId: string, now: Date): Promise<Prisma.AnnouncementWhereInput> {
    const batchIds = await myBatchIds(userId);
    return {
        status: "PUBLISHED",
        publishAt: { lte: now },
        OR: [{ audience: "ALL" }, ...(batchIds.length ? [{ audience: "BATCH" as const, batches: { some: { batchId: { in: batchIds } } } }] : [])],
    };
}

/** Published notices for this learner, most urgent first, newest first within an urgency. Scheduled notices stay hidden until their time. */
export async function listMyAnnouncements(userId: string, now = new Date()): Promise<StudentAnnouncement[]> {
    const rows = await prisma.announcement.findMany({
        where: await visibleAnnouncements(userId, now),
        include: { reads: { where: { userId }, select: { readAt: true } } },
        orderBy: { publishAt: "desc" },
        take: 200,
    });
    return rows
        .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || b.publishAt.getTime() - a.publishAt.getTime())
        .map((a) => ({
            id: a.id,
            title: a.title,
            body: a.body,
            urgency: urgencyLabel[a.urgency],
            tags: Array.isArray(a.tags) ? a.tags.filter((t): t is string => typeof t === "string") : [],
            publishedAt: a.publishAt.toISOString(),
            read: a.reads.length > 0,
        }));
}

/** Records that this learner opened a notice. A notice they cannot see answers 404 like one that does not exist. */
export async function markAnnouncementRead(userId: string, announcementId: string, now = new Date()) {
    const visible = await prisma.announcement.findFirst({ where: { id: announcementId, ...(await visibleAnnouncements(userId, now)) }, select: { id: true } });
    if (!visible) throw new NotFound();
    await prisma.announcementRead.upsert({ where: { announcementId_userId: { announcementId, userId } }, create: { announcementId, userId }, update: {} });
}

// ---- Home -------------------------------------------------------------------

export async function getHomeSummary(userId: string, now = new Date()): Promise<HomeSummary> {
    const today = istToday(now);
    const weekEnd = addDays(today, 6);
    const [courses, week, announcements, banners] = await Promise.all([listMyCourses(userId, today), listMySessions(userId, { from: today, to: weekEnd }, now), listMyAnnouncements(userId, now), listBanners("STUDENT_HOME", now)]);
    const live = week.sessions.filter((s) => s.status !== "Cancelled");
    const todayRange = istDayRange(today);
    return {
        today,
        todaysSessions: week.sessions.filter((s) => new Date(s.startsAt) >= todayRange.start && new Date(s.startsAt) < todayRange.end),
        todaysHolidays: week.holidays.filter((h) => h.date === today),
        continueLearning: courses.filter((c) => c.status === "Active").slice(0, 2),
        activeCourses: courses.filter((c) => c.status === "Active").length,
        completedCourses: courses.filter((c) => c.status === "Completed").length,
        sessionsThisWeek: live.length,
        unreadAnnouncements: announcements.filter((a) => !a.read).length,
        latestAnnouncements: announcements.slice(0, 2),
        banners,
    };
}
