import { findReport, lastDays, type ReportChart, type ReportColumn, type ReportMeta, type ReportRow } from "@/lib/admin/reports";
import type { CellValue, SummaryCard } from "@/lib/admin/types";
import { istToday } from "@/lib/ist";
import { prisma } from "@/server/db";
import { BusinessRule, NotFound, ValidationError } from "@/server/http/errors";
import "server-only";
import { branchStatistics, courseEnrollments, productEnrollments } from "./enrolments";
import { attendance, batchAttendance, batchProgress, inactiveLearners, learnerProgress, moduleProgress, sessionLog, trainerSummary } from "./learning";
import { leadSources, storageConsumption } from "./other";
import { assessmentAttempts, batchAssessment, issuedCertificates, membershipEnrollments, userTime, walletRecharges } from "./b8";
import { branchesFor, daysBetween, type Query, type ReportActor, type Runner } from "./shared";

export type { ReportActor } from "./shared";

const runners: Record<string, Runner> = {
    "sales-enrollment/product-enrollments": productEnrollments,
    "sales-enrollment/course-enrollments": courseEnrollments,
    "sales-enrollment/membership-enrollments": membershipEnrollments,
    "batch-progress/batch-progress": batchProgress,
    "batch-progress/learner-progress": learnerProgress,
    "batch-progress/attendance": attendance,
    "batch-progress/batch-attendance": batchAttendance,
    "batch-progress/module-progress": moduleProgress,
    "batch-progress/issued-certificates": issuedCertificates,
    "batch-progress/assessment-attempts": assessmentAttempts,
    "batch-progress/batch-assessment": batchAssessment,
    "batch-progress/inactive-learners": inactiveLearners,
    "marketing-analytics/lead-sources": leadSources,
    "trainer/trainer-summary": trainerSummary,
    "trainer/session-log": sessionLog,
    "more/branch-statistics": branchStatistics,
    "more/storage-consumption": storageConsumption,
    "more/wallet-recharges": walletRecharges,
    "more/user-time": userTime,
};

export type ReportInput = { from?: string; to?: string; branch?: string; course?: string; status?: string; q?: string; sort?: string; dir?: string; page?: number; pageSize?: number };

const MAX_DAYS = 366;
const PAGE_SIZE = 25;
const realDate = (value: string) => {
    const date = new Date(`${value}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/** The report filters, as they arrive in a query string. */
export function readReportInput(search: URLSearchParams): ReportInput {
    const text = (name: string) => search.get(name)?.trim().slice(0, 200) || undefined;
    return {
        from: text("from"), to: text("to"), branch: text("branch"), course: text("course"), status: text("status"), q: text("q"), sort: text("sort"), dir: text("dir"),
        page: Number(search.get("page")) || undefined, pageSize: Number(search.get("pageSize")) || undefined,
    };
}

/** Checks the filters against what the report supports and fills in the period. */
function normalize(meta: ReportMeta, input: ReportInput, now: Date): Query {
    const { from: defaultFrom, to: defaultTo } = lastDays(istToday(now), 30);
    const from = input.from || defaultFrom;
    const to = input.to || defaultTo;
    const fields: Record<string, string> = {};
    if (meta.filters.range) {
        if (!realDate(from)) fields.from = "Use a valid start date.";
        if (!realDate(to)) fields.to = "Use a valid end date.";
        if (!fields.from && !fields.to) {
            if (to < from) fields.to = "The end date cannot be before the start date.";
            else if (daysBetween(from, to) + 1 > MAX_DAYS) fields.to = `Choose a period of at most ${MAX_DAYS} days.`;
        }
    }
    if (meta.filters.status && input.status && !meta.filters.status.includes(input.status)) fields.status = "Choose one of the listed statuses.";
    if (Object.keys(fields).length > 0) throw new ValidationError(fields);
    return {
        from,
        to,
        branchId: meta.filters.branch ? input.branch || undefined : undefined,
        courseId: meta.filters.course ? input.course || undefined : undefined,
        status: meta.filters.status ? input.status || undefined : undefined,
    };
}

const compare = (a: ReportRow[string], b: ReportRow[string]) => {
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
};

/** Runs the report, then narrows it by the search words and puts the rows in order. */
async function execute(page: string, key: string, input: ReportInput, actor: ReportActor, now: Date) {
    const meta = findReport(page, key);
    if (!meta) throw new NotFound();
    if (meta.waitsFor) throw new BusinessRule(`${meta.title} is not available yet. It needs ${meta.waitsFor}.`);
    const runner = runners[`${page}/${key}`];
    if (!runner) throw new NotFound();
    const query = normalize(meta, input, now);
    const raw = await runner(query, actor, now);

    const words = (input.q ?? "").trim().toLowerCase().slice(0, 100);
    const matching = words ? raw.rows.filter((row) => Object.values(row).some((value) => value !== null && String(value).toLowerCase().includes(words))) : raw.rows;
    const chosen = raw.columns.some((column) => column.key === input.sort);
    const sort = chosen ? { key: String(input.sort), dir: input.dir === "desc" ? ("desc" as const) : ("asc" as const) } : meta.defaultSort;
    const rows = [...matching].sort((a, b) => (sort.dir === "asc" ? 1 : -1) * compare(a[sort.key], b[sort.key]));
    return { meta, query, columns: raw.columns, rows, summary: raw.summary, chart: raw.chart, truncated: raw.truncated ?? false, sort };
}

export type ReportResult = {
    data: { columns: ReportColumn[]; rows: ReportRow[]; chart: ReportChart | null; truncated: boolean; sort: { key: string; dir: "asc" | "desc" } };
    summary: SummaryCard[];
    total: number;
    page: number;
    pageSize: number;
};

export async function runReport(page: string, key: string, input: ReportInput, actor: ReportActor, now = new Date()): Promise<ReportResult> {
    const result = await execute(page, key, input, actor, now);
    const pageSize = Math.min(Math.max(1, Math.floor(input.pageSize ?? PAGE_SIZE) || PAGE_SIZE), 100);
    const pages = Math.max(1, Math.ceil(result.rows.length / pageSize));
    const current = Math.min(Math.max(1, Math.floor(input.page ?? 1) || 1), pages);
    return {
        data: { columns: result.columns, rows: result.rows.slice((current - 1) * pageSize, current * pageSize), chart: result.chart, truncated: result.truncated, sort: result.sort },
        summary: result.summary,
        total: result.rows.length,
        page: current,
        pageSize,
    };
}

const heading = (column: ReportColumn) => (column.kind === "percent" ? `${column.label} (%)` : column.kind === "size" ? `${column.label} (MB)` : column.label);

/** Every row the filters and the search match, for the CSV file. */
export async function exportReport(page: string, key: string, input: ReportInput, actor: ReportActor, now = new Date()) {
    const result = await execute(page, key, input, actor, now);
    const stem = result.meta.filters.range ? `${key}_${result.query.from}_${result.query.to}` : key;
    return { filename: `${stem}.csv`, headers: result.columns.map(heading), rows: result.rows.map((row) => result.columns.map((column): CellValue => row[column.key] ?? null)), count: result.rows.length, query: result.query };
}

/** The branches and courses the filters offer. Staff tied to branches are offered only their own. */
export async function reportFilterOptions(actor: ReportActor) {
    const allowed = branchesFor(actor);
    const [branches, courses] = await Promise.all([
        prisma.branch.findMany({ where: { status: "ACTIVE", ...(allowed === null ? {} : { id: { in: allowed } }) }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        prisma.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    ]);
    return { branches: branches.map((branch) => ({ value: branch.id, label: branch.name })), courses: courses.map((course) => ({ value: course.id, label: course.title })) };
}
