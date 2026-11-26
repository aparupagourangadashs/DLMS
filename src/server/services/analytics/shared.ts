import type { Prisma } from "@/generated/prisma/client";
import type { ReportChart, ReportColumn, ReportRow } from "@/lib/admin/reports";
import type { SummaryCard } from "@/lib/admin/types";
import { addDays, istDayRange } from "@/lib/ist";
import { prisma } from "@/server/db";
import "server-only";

/** Rows a report returns at most; a longer one is cut and says so. */
export const MAX_ROWS = 10_000;
/** Rows read to count something per day, before they are added up. */
export const SCAN_LIMIT = 200_000;

export type ReportActor = { role: string; branchIds: string[] };
export type Query = { from: string; to: string; branchId?: string; courseId?: string; status?: string };
export type Raw = { columns: ReportColumn[]; rows: ReportRow[]; summary: SummaryCard[]; chart: ReportChart | null; truncated?: boolean };
export type Runner = (query: Query, actor: ReportActor, now: Date) => Promise<Raw>;

const isScoped = (actor: ReportActor) => actor.role !== "SUPER_ADMIN" && actor.branchIds.length > 0;

/** The branches a request may cover: null is every branch, an empty list is none. */
export function branchesFor(actor: ReportActor, requested?: string): string[] | null {
    if (isScoped(actor)) return requested ? (actor.branchIds.includes(requested) ? [requested] : []) : actor.branchIds;
    return requested ? [requested] : null;
}

/** Staff tied to branches see their own branches' batches and the batches that belong to no branch, unless they pick a branch. */
export function batchScope(actor: ReportActor, requested?: string): Prisma.BatchWhereInput {
    const branches = branchesFor(actor, requested);
    if (branches === null) return {};
    return requested || !isScoped(actor) ? { branchId: { in: branches } } : { OR: [{ branchId: { in: branches } }, { branchId: null }] };
}

export function learnerScope(actor: ReportActor, requested?: string): Prisma.UserWhereInput {
    const branches = branchesFor(actor, requested);
    return branches === null ? {} : { learnerProfile: { branchId: { in: branches } } };
}

export const share = (part: number, whole: number) => (whole > 0 ? Math.round((100 * part) / whole) : null);
export const dayStart = (date: string) => istDayRange(date).start;
export const dayEnd = (date: string) => istDayRange(date).end;
export const daysBetween = (from: string, to: string) => Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);

/** A chart's periods: a day each for a short range, a week each for a long one. */
export function periodsOf(from: string, to: string) {
    const days = daysBetween(from, to) + 1;
    const step = days <= 62 ? 1 : 7;
    const count = Math.ceil(days / step);
    return {
        step,
        labels: Array.from({ length: count }, (_, i) => addDays(from, i * step).slice(5)),
        indexOf(date: string) {
            const index = Math.floor(daysBetween(from, date) / step);
            return index >= 0 && index < count ? index : -1;
        },
    };
}

/** Every IST day from `from` to `to`. */
export const eachDay = (from: string, to: string) => Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i));

/** A value for each chart period: the sum of the items in it, or `value` as a share of `of` when `ratio` is set. */
export function overPeriods(query: Pick<Query, "from" | "to">, items: Array<{ date: string; value: number; of?: number }>, ratio = false) {
    const periods = periodsOf(query.from, query.to);
    const sums = periods.labels.map(() => 0);
    const wholes = periods.labels.map(() => 0);
    for (const item of items) {
        const index = periods.indexOf(item.date);
        if (index < 0) continue;
        sums[index] += item.value;
        wholes[index] += item.of ?? 0;
    }
    return { labels: periods.labels, values: sums.map((sum, i) => (ratio ? share(sum, wholes[i]) ?? 0 : sum)), unit: periods.step === 1 ? "day" : "week" };
}

/** The first `count` entries when ranked by `value`, largest first. */
export const largest = <T>(items: T[], count: number, value: (item: T) => number) => [...items].sort((a, b) => value(b) - value(a)).slice(0, count);

/** Lessons in the published modules of each course. */
export async function lessonTotals(courseIds: string[]): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    if (courseIds.length === 0) return totals;
    const links = await prisma.courseModule.findMany({ where: { courseId: { in: courseIds }, module: { status: "PUBLISHED" } }, select: { courseId: true, moduleId: true } });
    const perModule = await prisma.moduleContent.groupBy({ by: ["moduleId"], where: { moduleId: { in: [...new Set(links.map((link) => link.moduleId))] } }, _count: { _all: true } });
    const lessons = new Map(perModule.map((group) => [group.moduleId, group._count._all]));
    for (const link of links) totals.set(link.courseId, (totals.get(link.courseId) ?? 0) + (lessons.get(link.moduleId) ?? 0));
    return totals;
}
