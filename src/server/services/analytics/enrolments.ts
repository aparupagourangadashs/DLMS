import type { Prisma } from "@/generated/prisma/client";
import type { ReportColumn, ReportRow } from "@/lib/admin/reports";
import { formatDate, formatNumber } from "@/lib/format";
import { toIst } from "@/lib/ist";
import { prisma } from "@/server/db";
import "server-only";
import { SCAN_LIMIT, branchesFor, dayEnd, dayStart, eachDay, largest, learnerScope, overPeriods, type Runner } from "./shared";

export const productEnrollments: Runner = async (query, actor) => {
    const range = { gte: dayStart(query.from), lt: dayEnd(query.to) };
    const learners = learnerScope(actor, query.branchId);
    // Learners are not tied to a course, so picking a course leaves them out.
    const [users, enrolments] = await Promise.all([
        query.courseId ? Promise.resolve([] as Array<{ createdAt: Date }>) : prisma.user.findMany({ where: { kind: "LEARNER", createdAt: range, ...learners }, select: { createdAt: true }, take: SCAN_LIMIT + 1 }),
        prisma.enrolment.findMany({
            where: { enrolledAt: range, status: { not: "CANCELLED" }, ...(query.courseId ? { courseId: query.courseId } : {}), user: { kind: "LEARNER", ...learners } },
            select: { enrolledAt: true, source: true },
            take: SCAN_LIMIT + 1,
        }),
    ]);
    const days = new Map(eachDay(query.from, query.to).map((date) => [date, { learners: 0, enrolments: 0, paid: 0 }]));
    for (const user of users.slice(0, SCAN_LIMIT)) {
        const day = days.get(toIst(user.createdAt).date);
        if (day) day.learners += 1;
    }
    for (const enrolment of enrolments.slice(0, SCAN_LIMIT)) {
        const day = days.get(toIst(enrolment.enrolledAt).date);
        if (!day) continue;
        day.enrolments += 1;
        if (enrolment.source === "ORDER" || enrolment.source === "MEMBERSHIP") day.paid += 1;
    }
    const rows = [...days].map(([date, day]): ReportRow => ({ date, newLearners: query.courseId ? null : day.learners, enrolments: day.enrolments, paid: day.paid }));
    const total = (key: "learners" | "enrolments" | "paid") => [...days.values()].reduce((n, day) => n + day[key], 0);
    const busiest = [...days].sort((a, b) => b[1].enrolments - a[1].enrolments)[0];
    const series = overPeriods(query, [...days].map(([date, day]) => ({ date, value: day.enrolments })));
    const columns: ReportColumn[] = [
        { key: "date", label: "Date", kind: "date" }, { key: "newLearners", label: "New learners", kind: "number" },
        { key: "enrolments", label: "New enrolments", kind: "number" }, { key: "paid", label: "Paid enrolments", kind: "number" },
    ];
    return {
        columns,
        rows,
        truncated: users.length > SCAN_LIMIT || enrolments.length > SCAN_LIMIT,
        summary: [
            { label: "New learners", value: query.courseId ? "\u2014" : formatNumber(total("learners")), hint: query.courseId ? "Not tied to a course" : undefined },
            { label: "New enrolments", value: formatNumber(total("enrolments")) },
            { label: "Paid enrolments", value: formatNumber(total("paid")), hint: "From orders and memberships" },
            { label: "Busiest day", value: busiest && busiest[1].enrolments > 0 ? formatDate(busiest[0]) : "\u2014" },
        ],
        chart: { title: `New enrolments by ${series.unit}`, seriesLabel: "New enrolments", labels: series.labels, values: series.values },
    };
};

export const courseEnrollments: Runner = async (query, actor) => {
    const range = { gte: dayStart(query.from), lt: dayEnd(query.to) };
    const who: Prisma.EnrolmentWhereInput = { ...(query.courseId ? { courseId: query.courseId } : {}), user: { kind: "LEARNER", ...learnerScope(actor, query.branchId) } };
    const [totals, fresh] = await Promise.all([
        prisma.enrolment.groupBy({ by: ["courseId", "status"], where: who, _count: { _all: true } }),
        prisma.enrolment.groupBy({ by: ["courseId"], where: { ...who, enrolledAt: range, status: { not: "CANCELLED" } }, _count: { _all: true } }),
    ]);
    const tally = new Map<string, { active: number; completed: number; fresh: number }>();
    const entry = (id: string) => tally.get(id) ?? { active: 0, completed: 0, fresh: 0 };
    for (const group of totals) {
        const current = entry(group.courseId);
        if (group.status === "ACTIVE") current.active += group._count._all;
        if (group.status === "COMPLETED") current.completed += group._count._all;
        tally.set(group.courseId, current);
    }
    for (const group of fresh) tally.set(group.courseId, { ...entry(group.courseId), fresh: group._count._all });
    const courses = await prisma.course.findMany({ where: { id: { in: [...tally.keys()] } }, select: { id: true, title: true, category: { select: { title: true } } } });
    const rows = courses
        .map((course): ReportRow => {
            const t = entry(course.id);
            return { course: course.title, category: course.category.title, newEnrolments: t.fresh, active: t.active, completed: t.completed, total: t.active + t.completed };
        })
        .filter((row) => Number(row.total) > 0 || Number(row.newEnrolments) > 0);
    const sum = (key: string) => rows.reduce((n, row) => n + Number(row[key]), 0);
    const columns: ReportColumn[] = [
        { key: "course", label: "Course" }, { key: "category", label: "Category" }, { key: "newEnrolments", label: "New in the period", kind: "number" },
        { key: "active", label: "Active", kind: "number" }, { key: "completed", label: "Completed", kind: "number" }, { key: "total", label: "Total", kind: "number" },
    ];
    const biggest = largest(rows, 12, (row) => Number(row.total));
    return {
        columns,
        rows,
        summary: [
            { label: "Courses with learners", value: formatNumber(rows.length) },
            { label: "New in the period", value: formatNumber(sum("newEnrolments")) },
            { label: "Active", value: formatNumber(sum("active")) },
            { label: "Completed", value: formatNumber(sum("completed")) },
        ],
        chart: rows.length ? { title: "Enrolments in the largest courses", seriesLabel: "Active and completed", labels: biggest.map((row) => String(row.course)), values: biggest.map((row) => Number(row.total)) } : null,
    };
};

export const branchStatistics: Runner = async (query, actor) => {
    const allowed = branchesFor(actor, query.branchId);
    const range = { gte: dayStart(query.from), lt: dayEnd(query.to) };
    const branches = await prisma.branch.findMany({ where: { status: "ACTIVE", ...(allowed === null ? {} : { id: { in: allowed } }) }, orderBy: { name: "asc" }, select: { id: true, name: true, city: true } });
    const ids = branches.map((branch) => branch.id);
    const [registered, batches, enrolments] = await Promise.all([
        prisma.learnerProfile.groupBy({ by: ["branchId"], where: { branchId: { in: ids }, createdAt: range }, _count: { _all: true } }),
        prisma.batch.groupBy({ by: ["branchId"], where: { branchId: { in: ids }, status: "ACTIVE" }, _count: { _all: true } }),
        Promise.all(branches.map((branch) => prisma.enrolment.count({ where: { enrolledAt: range, status: { not: "CANCELLED" }, user: { learnerProfile: { branchId: branch.id } } } }))),
    ]);
    const registrations = new Map(registered.map((group) => [group.branchId, group._count._all]));
    const active = new Map(batches.map((group) => [group.branchId, group._count._all]));
    const rows = branches.map((branch, index): ReportRow => ({ branch: branch.name, city: branch.city ?? null, registrations: registrations.get(branch.id) ?? 0, enrolments: enrolments[index], activeBatches: active.get(branch.id) ?? 0 }));
    const sum = (key: string) => rows.reduce((n, row) => n + Number(row[key]), 0);
    const columns: ReportColumn[] = [
        { key: "branch", label: "Branch" }, { key: "city", label: "City" }, { key: "registrations", label: "Registrations", kind: "number" },
        { key: "enrolments", label: "New enrolments", kind: "number" }, { key: "activeBatches", label: "Active batches", kind: "number" },
    ];
    return {
        columns,
        rows,
        summary: [
            { label: "Branches", value: formatNumber(rows.length) },
            { label: "Registrations", value: formatNumber(sum("registrations")) },
            { label: "New enrolments", value: formatNumber(sum("enrolments")) },
            { label: "Active batches", value: formatNumber(sum("activeBatches")) },
        ],
        chart: rows.length ? { title: "New enrolments by branch", seriesLabel: "New enrolments", labels: rows.map((row) => String(row.branch)), values: rows.map((row) => Number(row.enrolments)) } : null,
    };
};
