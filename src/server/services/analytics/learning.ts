import type { BatchStatus, EnrolmentStatus, Prisma } from "@/generated/prisma/client";
import type { ReportColumn, ReportRow } from "@/lib/admin/reports";
import { formatNumber } from "@/lib/format";
import { istToday, toIst } from "@/lib/ist";
import { prisma } from "@/server/db";
import "server-only";
import { MAX_ROWS, SCAN_LIMIT, batchScope, dayEnd, dayStart, daysBetween, largest, learnerScope, lessonTotals, overPeriods, share, type Query, type ReportActor, type Runner } from "./shared";

const batchStatusLabels: Record<BatchStatus, string> = { ACTIVE: "Active", COMPLETED: "Completed", ARCHIVED: "Archived" };
const batchStatusFrom = (label?: string) => (Object.keys(batchStatusLabels) as BatchStatus[]).find((key) => batchStatusLabels[key] === label);

const percent = (value: number | null) => (value === null ? "\u2014" : `${value}%`);
const cap = <T>(items: T[]) => ({ rows: items.slice(0, MAX_ROWS), truncated: items.length > MAX_ROWS });

function batchWhere(query: Query, actor: ReportActor): Prisma.BatchWhereInput {
    const status = batchStatusFrom(query.status);
    return { ...batchScope(actor, query.branchId), ...(query.courseId ? { courseId: query.courseId } : {}), ...(status ? { status } : {}) };
}

export const batchProgress: Runner = async (query, actor) => {
    const where = batchWhere(query, actor);
    const [found, groups] = await Promise.all([
        prisma.batch.findMany({ where, include: { course: { select: { title: true } }, branch: { select: { name: true } } }, orderBy: { name: "asc" }, take: MAX_ROWS + 1 }),
        prisma.enrolment.groupBy({ by: ["batchId", "status"], where: { batch: where, status: { in: ["ACTIVE", "COMPLETED"] } }, _count: { _all: true }, _sum: { progressPercent: true } }),
    ]);
    const batches = found.slice(0, MAX_ROWS);
    const tally = new Map<string, { learners: number; completed: number; progress: number }>();
    for (const group of groups) {
        if (!group.batchId) continue;
        const entry = tally.get(group.batchId) ?? { learners: 0, completed: 0, progress: 0 };
        entry.learners += group._count._all;
        if (group.status === "COMPLETED") entry.completed += group._count._all;
        entry.progress += group._sum.progressPercent ?? 0;
        tally.set(group.batchId, entry);
    }
    let learners = 0;
    let completed = 0;
    let progress = 0;
    const rows = batches.map((batch): ReportRow => {
        const entry = tally.get(batch.id) ?? { learners: 0, completed: 0, progress: 0 };
        learners += entry.learners;
        completed += entry.completed;
        progress += entry.progress;
        return { batch: batch.name, course: batch.course.title, branch: batch.branch?.name ?? null, status: batchStatusLabels[batch.status], learners: entry.learners, completed: entry.completed, progress: entry.learners ? Math.round(entry.progress / entry.learners) : null };
    });
    const columns: ReportColumn[] = [
        { key: "batch", label: "Batch" }, { key: "course", label: "Course" }, { key: "branch", label: "Branch" }, { key: "status", label: "Status" },
        { key: "learners", label: "Learners", kind: "number" }, { key: "completed", label: "Completed", kind: "number" }, { key: "progress", label: "Average progress", kind: "percent" },
    ];
    const biggest = largest(rows, 12, (row) => Number(row.learners));
    return {
        columns,
        rows,
        truncated: found.length > MAX_ROWS,
        summary: [
            { label: "Batches", value: formatNumber(rows.length) },
            { label: "Learners", value: formatNumber(learners) },
            { label: "Average progress", value: percent(learners ? Math.round(progress / learners) : null) },
            { label: "Completed", value: formatNumber(completed) },
        ],
        chart: rows.length ? { title: "Average progress of the largest batches", seriesLabel: "Average progress", labels: biggest.map((row) => String(row.batch)), values: biggest.map((row) => Number(row.progress ?? 0)), unit: "%" } : null,
    };
};

function enrolmentWhere(query: Query, actor: ReportActor, statuses: EnrolmentStatus[]): Prisma.EnrolmentWhereInput {
    return { status: { in: statuses }, ...(query.courseId ? { courseId: query.courseId } : {}), user: { kind: "LEARNER", ...learnerScope(actor, query.branchId) } };
}

const progressBands: Array<[string, (value: number) => boolean]> = [
    ["Not started", (v) => v === 0],
    ["1\u201325%", (v) => v >= 1 && v <= 25],
    ["26\u201350%", (v) => v >= 26 && v <= 50],
    ["51\u201375%", (v) => v >= 51 && v <= 75],
    ["76\u201399%", (v) => v >= 76 && v <= 99],
    ["Completed", (v) => v >= 100],
];

export const learnerProgress: Runner = async (query, actor) => {
    const statuses: EnrolmentStatus[] = query.status === "Completed" ? ["COMPLETED"] : query.status === "Active" ? ["ACTIVE"] : ["ACTIVE", "COMPLETED"];
    const where = enrolmentWhere(query, actor, statuses);
    const [found, done] = await Promise.all([
        prisma.enrolment.findMany({
            where,
            include: { user: { select: { learnerProfile: { select: { name: true, registrationNo: true } } } }, course: { select: { title: true } }, batch: { select: { name: true } } },
            orderBy: { enrolledAt: "desc" },
            take: MAX_ROWS + 1,
        }),
        prisma.lessonProgress.groupBy({ by: ["enrolmentId"], where: { enrolment: where }, _count: { _all: true }, _max: { completedAt: true } }),
    ]);
    const enrolments = found.slice(0, MAX_ROWS);
    const totals = await lessonTotals([...new Set(enrolments.map((enrolment) => enrolment.courseId))]);
    const lessons = new Map(done.map((group) => [group.enrolmentId, group]));
    const rows = enrolments.map((enrolment): ReportRow => {
        const progress = lessons.get(enrolment.id);
        return {
            learner: enrolment.user.learnerProfile?.name ?? null,
            registrationNo: enrolment.user.learnerProfile?.registrationNo ?? null,
            course: enrolment.course.title,
            batch: enrolment.batch?.name ?? null,
            lessonsDone: progress?._count._all ?? 0,
            lessonsTotal: totals.get(enrolment.courseId) ?? 0,
            progress: enrolment.progressPercent,
            lastLesson: progress?._max.completedAt ? toIst(progress._max.completedAt).date : null,
            status: enrolment.status === "COMPLETED" ? "Completed" : "Active",
        };
    });
    const values = rows.map((row) => Number(row.progress));
    const columns: ReportColumn[] = [
        { key: "learner", label: "Learner" }, { key: "registrationNo", label: "Registration no." }, { key: "course", label: "Course" }, { key: "batch", label: "Batch" },
        { key: "lessonsDone", label: "Lessons completed", kind: "number" }, { key: "lessonsTotal", label: "Lessons in course", kind: "number" }, { key: "progress", label: "Progress", kind: "percent" },
        { key: "lastLesson", label: "Last lesson", kind: "date" }, { key: "status", label: "Status" },
    ];
    return {
        columns,
        rows,
        truncated: found.length > MAX_ROWS,
        summary: [
            { label: "Enrolments", value: formatNumber(rows.length) },
            { label: "Average progress", value: percent(values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null) },
            { label: "Completed", value: formatNumber(rows.filter((row) => row.status === "Completed").length) },
            { label: "Not started", value: formatNumber(values.filter((v) => v === 0).length) },
        ],
        chart: rows.length ? { title: "Learners by progress", seriesLabel: "Learners", labels: progressBands.map(([label]) => label), values: progressBands.map(([, inBand]) => values.filter(inBand).length) } : null,
    };
};

type SessionFact = {
    date: string;
    time: string;
    title: string;
    batchId: string;
    batch: string;
    course: string;
    branch: string | null;
    trainerId: string | null;
    trainer: string | null;
    minutes: number;
    cancelled: boolean;
    held: boolean;
    marked: number;
    present: number;
    expected: number;
};

/** Every class that starts in the period, with its attendance as marked. Learners who left the batch can still have a mark, so the expected number is never below the marks. */
async function loadSessions(query: Query, actor: ReportActor, now: Date): Promise<{ sessions: SessionFact[]; truncated: boolean }> {
    const batch = { ...batchScope(actor, query.branchId), ...(query.courseId ? { courseId: query.courseId } : {}) };
    const where: Prisma.SessionWhereInput = { startsAt: { gte: dayStart(query.from), lt: dayEnd(query.to) }, batch };
    const teacher = { select: { staffProfile: { select: { displayName: true } } } } as const;
    const [found, marks, enrolled] = await Promise.all([
        prisma.session.findMany({
            where,
            include: { instructor: teacher, batch: { select: { name: true, instructorId: true, instructor: teacher, course: { select: { title: true } }, branch: { select: { name: true } } } } },
            orderBy: { startsAt: "desc" },
            take: MAX_ROWS + 1,
        }),
        prisma.attendance.groupBy({ by: ["sessionId", "status"], where: { session: where }, _count: { _all: true } }),
        prisma.enrolment.groupBy({ by: ["batchId"], where: { status: "ACTIVE", batch }, _count: { _all: true } }),
    ]);
    const marked = new Map<string, number>();
    const present = new Map<string, number>();
    for (const group of marks) {
        marked.set(group.sessionId, (marked.get(group.sessionId) ?? 0) + group._count._all);
        if (group.status === "PRESENT") present.set(group.sessionId, group._count._all);
    }
    const enrolledIn = new Map(enrolled.flatMap((group) => (group.batchId ? [[group.batchId, group._count._all] as const] : [])));
    const sessions = found.slice(0, MAX_ROWS).map((session): SessionFact => {
        const count = marked.get(session.id) ?? 0;
        const { date, time } = toIst(session.startsAt);
        const trainer = session.instructor ?? session.batch.instructor;
        return {
            date,
            time,
            title: session.title,
            batchId: session.batchId,
            batch: session.batch.name,
            course: session.batch.course.title,
            branch: session.batch.branch?.name ?? null,
            trainerId: session.instructorId ?? session.batch.instructorId,
            trainer: trainer?.staffProfile?.displayName ?? null,
            minutes: Math.round((session.endsAt.getTime() - session.startsAt.getTime()) / 60_000),
            cancelled: session.status === "CANCELLED",
            held: session.status !== "CANCELLED" && session.endsAt < now,
            marked: count,
            present: present.get(session.id) ?? 0,
            expected: Math.max(enrolledIn.get(session.batchId) ?? 0, count),
        };
    });
    return { sessions, truncated: found.length > MAX_ROWS };
}

const countedClasses = (sessions: SessionFact[]) => sessions.filter((session) => session.held && session.marked > 0);
const tallyOf = (sessions: SessionFact[]) => ({ present: sessions.reduce((n, s) => n + s.present, 0), expected: sessions.reduce((n, s) => n + s.expected, 0) });

export const attendance: Runner = async (query, actor, now) => {
    const { sessions, truncated } = await loadSessions(query, actor, now);
    const classes = countedClasses(sessions);
    const rows = classes.map((s): ReportRow => ({ date: s.date, time: s.time, class: s.title, batch: s.batch, course: s.course, branch: s.branch, expected: s.expected, present: s.present, attendance: share(s.present, s.expected) }));
    const total = tallyOf(classes);
    const series = overPeriods(query, classes.map((s) => ({ date: s.date, value: s.present, of: s.expected })), true);
    const columns: ReportColumn[] = [
        { key: "date", label: "Date", kind: "date" }, { key: "time", label: "Time" }, { key: "class", label: "Class" }, { key: "batch", label: "Batch" }, { key: "course", label: "Course" }, { key: "branch", label: "Branch" },
        { key: "expected", label: "Expected", kind: "number" }, { key: "present", label: "Present", kind: "number" }, { key: "attendance", label: "Attendance", kind: "percent" },
    ];
    return {
        columns,
        rows,
        truncated,
        summary: [
            { label: "Classes with attendance", value: formatNumber(rows.length) },
            { label: "Expected", value: formatNumber(total.expected) },
            { label: "Present", value: formatNumber(total.present) },
            { label: "Attendance", value: percent(share(total.present, total.expected)) },
        ],
        chart: rows.length ? { title: `Attendance by ${series.unit}`, seriesLabel: "Attendance", labels: series.labels, values: series.values, unit: "%" } : null,
    };
};

export const batchAttendance: Runner = async (query, actor, now) => {
    const { sessions, truncated } = await loadSessions(query, actor, now);
    const classes = countedClasses(sessions);
    const byBatch = new Map<string, SessionFact[]>();
    for (const s of classes) byBatch.set(s.batchId, [...(byBatch.get(s.batchId) ?? []), s]);
    const rows = [...byBatch.values()].map((list): ReportRow => {
        const tally = tallyOf(list);
        return { batch: list[0].batch, course: list[0].course, branch: list[0].branch, classes: list.length, expected: tally.expected, present: tally.present, attendance: share(tally.present, tally.expected) };
    });
    const total = tallyOf(classes);
    const columns: ReportColumn[] = [
        { key: "batch", label: "Batch" }, { key: "course", label: "Course" }, { key: "branch", label: "Branch" },
        { key: "classes", label: "Classes", kind: "number" }, { key: "expected", label: "Expected", kind: "number" }, { key: "present", label: "Present", kind: "number" }, { key: "attendance", label: "Attendance", kind: "percent" },
    ];
    const busiest = largest(rows, 12, (row) => Number(row.classes));
    return {
        columns,
        rows,
        truncated,
        summary: [
            { label: "Batches", value: formatNumber(rows.length) },
            { label: "Classes with attendance", value: formatNumber(classes.length) },
            { label: "Present", value: formatNumber(total.present) },
            { label: "Attendance", value: percent(share(total.present, total.expected)) },
        ],
        chart: rows.length ? { title: "Attendance of the batches with most classes", seriesLabel: "Attendance", labels: busiest.map((row) => String(row.batch)), values: busiest.map((row) => Number(row.attendance ?? 0)), unit: "%" } : null,
    };
};

export const trainerSummary: Runner = async (query, actor, now) => {
    const { sessions, truncated } = await loadSessions(query, actor, now);
    const byTrainer = new Map<string, { name: string; classes: number; cancelled: number; batches: Set<string>; present: number; expected: number }>();
    for (const s of sessions) {
        const key = s.trainerId ?? "none";
        const entry = byTrainer.get(key) ?? { name: s.trainer ?? "Unassigned", classes: 0, cancelled: 0, batches: new Set<string>(), present: 0, expected: 0 };
        if (s.cancelled) entry.cancelled += 1;
        else if (s.held) {
            entry.classes += 1;
            entry.batches.add(s.batchId);
            if (s.marked > 0) {
                entry.present += s.present;
                entry.expected += s.expected;
            }
        }
        byTrainer.set(key, entry);
    }
    const rows = [...byTrainer.values()]
        .filter((entry) => entry.classes > 0 || entry.cancelled > 0)
        .map((entry): ReportRow => ({ trainer: entry.name, classes: entry.classes, cancelled: entry.cancelled, batches: entry.batches.size, expected: entry.expected, present: entry.present, attendance: share(entry.present, entry.expected) }));
    const held = rows.reduce((n, row) => n + Number(row.classes), 0);
    const columns: ReportColumn[] = [
        { key: "trainer", label: "Trainer" }, { key: "classes", label: "Classes held", kind: "number" }, { key: "cancelled", label: "Cancelled", kind: "number" }, { key: "batches", label: "Batches", kind: "number" },
        { key: "expected", label: "Expected", kind: "number" }, { key: "present", label: "Present", kind: "number" }, { key: "attendance", label: "Attendance", kind: "percent" },
    ];
    const busiest = largest(rows, 12, (row) => Number(row.classes));
    return {
        columns,
        rows,
        truncated,
        summary: [
            { label: "Trainers", value: formatNumber(rows.length) },
            { label: "Classes held", value: formatNumber(held) },
            { label: "Cancelled", value: formatNumber(rows.reduce((n, row) => n + Number(row.cancelled), 0)) },
            { label: "Attendance", value: percent(share(rows.reduce((n, row) => n + Number(row.present), 0), rows.reduce((n, row) => n + Number(row.expected), 0))) },
        ],
        chart: rows.length ? { title: "Classes held by each trainer", seriesLabel: "Classes held", labels: busiest.map((row) => String(row.trainer)), values: busiest.map((row) => Number(row.classes)) } : null,
    };
};

export const sessionLog: Runner = async (query, actor, now) => {
    const { sessions, truncated } = await loadSessions(query, actor, now);
    const stateOf = (s: SessionFact) => (s.cancelled ? "Cancelled" : s.held ? "Held" : "Upcoming");
    const listed = query.status ? sessions.filter((s) => stateOf(s) === query.status) : sessions;
    const rows = listed.map((s): ReportRow => ({
        date: s.date, time: s.time, class: s.title, batch: s.batch, trainer: s.trainer, minutes: s.minutes, status: stateOf(s),
        expected: s.held && s.marked > 0 ? s.expected : null, present: s.held && s.marked > 0 ? s.present : null,
    }));
    const series = overPeriods(query, listed.filter((s) => s.held).map((s) => ({ date: s.date, value: 1 })));
    const columns: ReportColumn[] = [
        { key: "date", label: "Date", kind: "date" }, { key: "time", label: "Time" }, { key: "class", label: "Class" }, { key: "batch", label: "Batch" }, { key: "trainer", label: "Trainer" },
        { key: "minutes", label: "Minutes", kind: "number" }, { key: "status", label: "Status" }, { key: "expected", label: "Expected", kind: "number" }, { key: "present", label: "Present", kind: "number" },
    ];
    return {
        columns,
        rows,
        truncated,
        summary: [
            { label: "Classes", value: formatNumber(rows.length) },
            { label: "Held", value: formatNumber(rows.filter((row) => row.status === "Held").length) },
            { label: "Cancelled", value: formatNumber(rows.filter((row) => row.status === "Cancelled").length) },
            { label: "Upcoming", value: formatNumber(rows.filter((row) => row.status === "Upcoming").length) },
        ],
        chart: series.values.some((v) => v > 0) ? { title: `Classes held by ${series.unit}`, seriesLabel: "Classes held", labels: series.labels, values: series.values } : null,
    };
};

export const moduleProgress: Runner = async (query, actor) => {
    const learners: Prisma.EnrolmentWhereInput = { status: "ACTIVE", ...(query.courseId ? { courseId: query.courseId } : {}), user: { kind: "LEARNER", ...learnerScope(actor, query.branchId) } };
    const perCourse = await prisma.enrolment.groupBy({ by: ["courseId"], where: learners, _count: { _all: true } });
    const assigned = new Map(perCourse.map((group) => [group.courseId, group._count._all]));
    const links = await prisma.courseModule.findMany({ where: { courseId: { in: [...assigned.keys()] }, module: { status: "PUBLISHED" } }, select: { courseId: true, module: { select: { id: true, name: true } } } });
    const moduleIds = [...new Set(links.map((link) => link.module.id))];
    const [lessons, done] = await Promise.all([
        prisma.moduleContent.findMany({ where: { moduleId: { in: moduleIds } }, select: { id: true, moduleId: true } }),
        prisma.lessonProgress.groupBy({ by: ["contentId"], where: { enrolment: learners, content: { moduleId: { in: moduleIds } } }, _count: { _all: true } }),
    ]);
    const lessonModule = new Map(lessons.map((lesson) => [lesson.id, lesson.moduleId]));
    const lessonCount = new Map<string, number>();
    for (const lesson of lessons) lessonCount.set(lesson.moduleId, (lessonCount.get(lesson.moduleId) ?? 0) + 1);
    const completions = new Map<string, number>();
    for (const group of done) {
        const moduleId = lessonModule.get(group.contentId);
        if (moduleId) completions.set(moduleId, (completions.get(moduleId) ?? 0) + group._count._all);
    }
    const names = new Map<string, string>();
    const learnerCount = new Map<string, number>();
    for (const link of links) {
        names.set(link.module.id, link.module.name);
        learnerCount.set(link.module.id, (learnerCount.get(link.module.id) ?? 0) + (assigned.get(link.courseId) ?? 0));
    }
    const rows = moduleIds.map((id): ReportRow => {
        const count = lessonCount.get(id) ?? 0;
        const people = learnerCount.get(id) ?? 0;
        const completed = completions.get(id) ?? 0;
        return { module: names.get(id) ?? "", lessons: count, learners: people, lessonsCompleted: completed, progress: share(completed, people * count) };
    });
    const columns: ReportColumn[] = [
        { key: "module", label: "Module" }, { key: "lessons", label: "Lessons", kind: "number" }, { key: "learners", label: "Learners", kind: "number" },
        { key: "lessonsCompleted", label: "Lessons completed", kind: "number" }, { key: "progress", label: "Progress", kind: "percent" },
    ];
    const biggest = largest(rows, 12, (row) => Number(row.learners));
    const totalCompleted = rows.reduce((n, row) => n + Number(row.lessonsCompleted), 0);
    const possible = rows.reduce((n, row) => n + Number(row.lessons) * Number(row.learners), 0);
    return {
        columns,
        rows,
        summary: [
            { label: "Modules in use", value: formatNumber(rows.length) },
            { label: "Lessons", value: formatNumber(rows.reduce((n, row) => n + Number(row.lessons), 0)) },
            { label: "Lessons completed", value: formatNumber(totalCompleted) },
            { label: "Progress", value: percent(share(totalCompleted, possible)) },
        ],
        chart: rows.length ? { title: "Progress in the modules with most learners", seriesLabel: "Progress", labels: biggest.map((row) => String(row.module)), values: biggest.map((row) => Number(row.progress ?? 0)), unit: "%" } : null,
    };
};

const INACTIVE_AFTER_DAYS = 14;
const inactiveBands: Array<[string, (days: number) => boolean]> = [
    ["14\u201329 days", (d) => d < 30],
    ["30\u201359 days", (d) => d >= 30 && d < 60],
    ["60\u201389 days", (d) => d >= 60 && d < 90],
    ["90 days or more", (d) => d >= 90],
];

export const inactiveLearners: Runner = async (query, actor, now) => {
    const today = istToday(now);
    const active: Prisma.EnrolmentWhereInput = { status: "ACTIVE", ...(query.courseId ? { courseId: query.courseId } : {}) };
    const who: Prisma.UserWhereInput = { kind: "LEARNER", status: "ACTIVE", ...learnerScope(actor, query.branchId) };
    const [users, lessons] = await Promise.all([
        prisma.user.findMany({
            where: { ...who, enrolments: { some: active } },
            select: { lastLoginAt: true, learnerProfile: { select: { name: true, registrationNo: true, branch: { select: { name: true } } } }, enrolments: { where: active, select: { id: true, enrolledAt: true } } },
            orderBy: { createdAt: "asc" },
            take: SCAN_LIMIT + 1,
        }),
        prisma.lessonProgress.groupBy({ by: ["enrolmentId"], where: { enrolment: { ...active, user: who } }, _max: { completedAt: true } }),
    ]);
    const lastLesson = new Map(lessons.map((group) => [group.enrolmentId, group._max.completedAt]));
    const found: ReportRow[] = [];
    for (const user of users.slice(0, SCAN_LIMIT)) {
        let last: Date | null = user.lastLoginAt;
        for (const enrolment of user.enrolments) {
            const lesson = lastLesson.get(enrolment.id);
            if (lesson && (!last || lesson > last)) last = lesson;
        }
        const earliest = user.enrolments.map((enrolment) => enrolment.enrolledAt.getTime()).sort((a, b) => a - b)[0];
        const reference = last ?? (earliest === undefined ? now : new Date(earliest));
        const days = daysBetween(toIst(reference).date, today);
        if (days < INACTIVE_AFTER_DAYS) continue;
        found.push({ learner: user.learnerProfile?.name ?? null, registrationNo: user.learnerProfile?.registrationNo ?? null, branch: user.learnerProfile?.branch?.name ?? null, courses: user.enrolments.length, lastActivity: last ? toIst(last).date : "Never", inactiveDays: days });
    }
    const { rows, truncated } = cap(found);
    const columns: ReportColumn[] = [
        { key: "learner", label: "Learner" }, { key: "registrationNo", label: "Registration no." }, { key: "branch", label: "Branch" }, { key: "courses", label: "Active courses", kind: "number" },
        { key: "lastActivity", label: "Last activity", kind: "date" }, { key: "inactiveDays", label: "Days inactive", kind: "number" },
    ];
    return {
        columns,
        rows,
        truncated: truncated || users.length > SCAN_LIMIT,
        summary: [
            { label: "Learners checked", value: formatNumber(Math.min(users.length, SCAN_LIMIT)) },
            { label: "Inactive 14 days or more", value: formatNumber(found.length) },
            { label: "Never active", value: formatNumber(found.filter((row) => row.lastActivity === "Never").length) },
            { label: "Longest inactive", value: found.length ? `${Math.max(...found.map((row) => Number(row.inactiveDays)))} days` : "\u2014" },
        ],
        chart: found.length ? { title: "Inactive learners by time away", seriesLabel: "Learners", labels: inactiveBands.map(([label]) => label), values: inactiveBands.map(([, inBand]) => found.filter((row) => inBand(Number(row.inactiveDays))).length) } : null,
    };
};
