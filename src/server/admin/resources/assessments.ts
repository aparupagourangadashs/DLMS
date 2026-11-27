import type { AssessmentKind, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { statusFromLabel, statusLabels } from "./helpers";

const include = {
  courses: { include: { course: { select: { id: true, title: true } } } },
  bank: { select: { id: true, code: true, name: true } },
  attempts: { select: { id: true } },
  registrations: { select: { id: true } },
  submissions: { select: { id: true } },
  _count: { select: { attempts: true, registrations: true } },
} satisfies Prisma.AssessmentInclude;
type AssessmentRow = Prisma.AssessmentGetPayload<{ include: typeof include }>;

const kindLabels: Record<AssessmentKind, string> = { ASSIGNMENT: "Assignment", CUSTOM_LINK: "Custom link", EXAM: "Exam" };
const kindFromLabel = (value: string) => (Object.keys(kindLabels) as AssessmentKind[]).find((k) => kindLabels[k] === value);

const schema = z.object({
  name: z.string().trim().min(3).max(200),
  kind: z.string(),
  courses: z.array(z.string()).min(1, "Choose at least one course."),
  bank: z.string().optional().default(""),
  link: z.string().trim().optional().default(""),
  price: z.union([z.string(), z.number(), z.null()]).optional().transform((v) => v === null || v === "" || v === undefined ? null : Math.round(Number(v) * 100)),
  maxAttempts: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => Number.isInteger(v) && v >= 1 && v <= 100),
  durationMinutes: z.union([z.string(), z.number(), z.null()]).optional().transform((v) => v === null || v === "" || v === undefined ? null : Number(v)),
  totalMarks: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => Number.isInteger(v) && v >= 0),
  passPercent: z.union([z.string(), z.number()]).transform((v) => Number(v)).refine((v) => Number.isInteger(v) && v >= 0 && v <= 100),
  opensAt: z.string().optional().default(""),
  closesAt: z.string().optional().default(""),
  instructions: z.string().trim().max(10000).optional().default(""),
  status: z.string().default("Draft"),
});

const datetime = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function toAssessmentRow(row: AssessmentRow): Row {
  return {
    id: row.id,
    name: row.name,
    kind: kindLabels[row.kind],
    courses: row.courses.map((r) => r.course.title),
    price: row.priceMinor === null ? 0 : row.priceMinor / 100,
    attempts: row._count.attempts,
    unique: 0,
    registered: row._count.registrations,
    bank: row.bank ? `${row.bank.code} · ${row.bank.name}` : "",
    link: row.linkUrl ?? "",
    maxAttempts: row.maxAttempts,
    durationMinutes: row.durationMinutes ?? "",
    totalMarks: row.totalMarks,
    passPercent: row.passPercent,
    opensAt: row.opensAt ? row.opensAt.toISOString().slice(0, 16) : "",
    closesAt: row.closesAt ? row.closesAt.toISOString().slice(0, 16) : "",
    instructions: row.instructions ?? "",
    status: statusLabels[row.status],
  };
}

async function list(query: ListQuery): Promise<ListResult> {
  const and: Prisma.AssessmentWhereInput[] = [];
  if (query.q) and.push({ name: { contains: query.q } });
  if (query.tab) {
    const kind = kindFromLabel(query.tab);
    if (kind) and.push({ kind });
  }
  const where: Prisma.AssessmentWhereInput = and.length ? { AND: and } : {};
  const dir = query.sort?.dir ?? "desc";
  const [rows, total] = await Promise.all([
    prisma.assessment.findMany({ where, include, orderBy: query.sort?.key === "name" ? { name: dir } : { createdAt: dir }, skip: query.skip, take: query.take }),
    prisma.assessment.count({ where }),
  ]);
  const unique = await prisma.attempt.groupBy({ by: ["assessmentId"], where: { assessmentId: { in: rows.map((r) => r.id) } }, _count: { learnerId: true } });
  const result = rows.map(toAssessmentRow);
  for (const row of result) {
    const count = unique.find((u) => u.assessmentId === row.id);
    row.unique = count?._count.learnerId ?? 0;
  }
  return { rows: result, total };
}

async function load(id: string) {
  const row = await prisma.assessment.findUnique({ where: { id }, include });
  if (!row) throw new NotFound();
  return row;
}

async function resolve(input: z.output<typeof schema>) {
  const kind = kindFromLabel(input.kind);
  if (!kind) throw new ValidationError({ kind: "Choose Assignment, Custom link or Exam." });
  const status = statusFromLabel(input.status);
  if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
  if (kind === "CUSTOM_LINK" && (!/^https:\/\/[^\s]+$/.test(input.link))) throw new ValidationError({ link: "Enter a full https:// link." });
  if (kind === "EXAM" && (!input.bank || input.durationMinutes === null || input.durationMinutes < 1)) throw new ValidationError({ bank: "Choose a bank and duration for exams.", durationMinutes: "Enter an exam duration." });
  if (input.price !== null && input.price !== undefined && (!Number.isInteger(input.price) || input.price < 0)) throw new ValidationError({ price: "Enter a non-negative price." });
  const opensAt = datetime(input.opensAt);
  const closesAt = datetime(input.closesAt);
  if (input.opensAt && !opensAt) throw new ValidationError({ opensAt: "Choose a valid date." });
  if (input.closesAt && !closesAt) throw new ValidationError({ closesAt: "Choose a valid date." });
  if (opensAt && closesAt && closesAt < opensAt) throw new ValidationError({ closesAt: "Closing time must follow opening time." });

  const courses = await prisma.course.findMany({ where: { id: { in: input.courses } }, select: { id: true } });
  if (courses.length !== input.courses.length) throw new ValidationError({ courses: "Choose existing courses." });
  let bankId: string | null = null;
  if (input.bank) {
    const bank = await prisma.questionBank.findFirst({ where: { OR: [{ id: input.bank }, { code: input.bank }, { name: input.bank }], status: "PUBLISHED" }, select: { id: true } });
    if (!bank) throw new ValidationError({ bank: "Choose a published question bank." });
    bankId = bank.id;
  }
  return { kind, status, courses, bankId, opensAt, closesAt };
}

async function create(input: unknown, ctx: ResourceContext) {
  const data = parseWith(schema, input);
  const r = await resolve(data);
  if (await prisma.assessment.findFirst({ where: { name: data.name }, select: { id: true } })) throw new Conflict("Another assessment has this name.");
  const created = await prisma.assessment.create({
    data: {
      name: data.name, kind: r.kind, status: r.status, priceMinor: data.price,
      maxAttempts: data.maxAttempts, durationMinutes: r.kind === "EXAM" ? data.durationMinutes : null,
      opensAt: r.opensAt, closesAt: r.closesAt, totalMarks: data.totalMarks,
      passPercent: data.passPercent, bankId: r.bankId,
      linkUrl: r.kind === "CUSTOM_LINK" ? data.link : null, instructions: data.instructions,
      courses: { create: r.courses.map((c) => ({ courseId: c.id })) },
    },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "assessment.create", entity: "Assessment", entityId: created.id, after: { name: data.name, kind: r.kind, status: r.status }, ip: ctx.ip });
  return toAssessmentRow(created);
}

async function update(id: string, input: unknown, ctx: ResourceContext) {
  const existing = await load(id);
  if (existing.attempts && existing.attempts.length > 0) throw new BusinessRule("Changing marks or question configuration after attempts exist is blocked.");
  const data = parseWith(schema, input);
  const r = await resolve(data);
  await prisma.$transaction([
    prisma.assessmentCourse.deleteMany({ where: { assessmentId: id } }),
    prisma.assessment.update({
      where: { id },
      data: {
        name: data.name, kind: r.kind, status: r.status, priceMinor: data.price,
        maxAttempts: data.maxAttempts, durationMinutes: r.kind === "EXAM" ? data.durationMinutes : null,
        opensAt: r.opensAt, closesAt: r.closesAt, totalMarks: data.totalMarks,
        passPercent: data.passPercent, bankId: r.bankId,
        linkUrl: r.kind === "CUSTOM_LINK" ? data.link : null, instructions: data.instructions,
        courses: { create: r.courses.map((c) => ({ courseId: c.id })) },
      },
    }),
  ]);
  await writeAudit({ actorId: ctx.user.id, action: "assessment.update", entity: "Assessment", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: data.name, status: r.status }, ip: ctx.ip });
  return toAssessmentRow(await load(id));
}

async function remove(id: string, ctx: ResourceContext) {
  const existing = await load(id);
  if (existing.attempts.length > 0 || existing.registrations.length > 0 || existing.submissions.length > 0) throw new BusinessRule("Assessments with attempts or registrations cannot be deleted. Archive it instead.");
  await prisma.assessment.delete({ where: { id } });
  await writeAudit({ actorId: ctx.user.id, action: "assessment.delete", entity: "Assessment", entityId: id, before: { name: existing.name }, ip: ctx.ip });
}

async function options(): Promise<Record<string, string[]>> {
  const [courses, banks] = await Promise.all([
    prisma.course.findMany({ where: { status: "PUBLISHED" }, orderBy: { title: "asc" }, select: { title: true } }),
    prisma.questionBank.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, select: { code: true, name: true } }),
  ]);
  return { courses: courses.map((c) => c.title), bank: banks.map((b) => `${b.code} · ${b.name}`) };
}

export const assessmentResource: ResourceDef = {
  key: "learning/assessments",
  resource: "assessments",
  sortableKeys: ["name", "price", "attempts"],
  list,
  get: async (id) => toAssessmentRow(await load(id)),
  options,
  create,
  update,
  remove,
};
