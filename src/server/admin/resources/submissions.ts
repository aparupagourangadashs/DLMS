import type { Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";

const include = {
  learner: { select: { id: true, name: true, user: { select: { email: true } }, branchId: true } },
  assessment: { select: { id: true, name: true, kind: true, totalMarks: true, closesAt: true } },
  attempt: { select: { id: true } },
  evaluatedBy: { select: { staffProfile: { select: { displayName: true } } } },
} satisfies Prisma.SubmissionInclude;
type SubmissionRow = Prisma.SubmissionGetPayload<{ include: typeof include }>;

export function toSubmissionRow(row: SubmissionRow): Row {
  const percentage = row.marks === null ? null : row.total > 0 ? Math.round((row.marks / row.total) * 100) : 0;
  return {
    id: row.id,
    learner: row.learner.name,
    email: row.learner.user.email,
    assessment: row.assessment.name,
    evaluation: row.evaluationStatus === "EVALUATED" ? "Evaluated" : "Not evaluated",
    submittedOn: row.submittedAt.toISOString().slice(0, 10),
    timeliness: row.late ? "Late" : "On time",
    kind: row.assessment.kind === "ASSIGNMENT" ? "Assignment" : row.assessment.kind === "EXAM" ? "Exam" : "Custom link",
    marks: row.marks ?? null,
    total: row.total,
    percentage,
    batch: "",
    text: row.text ?? "",
    feedback: row.feedback ?? "",
  };
}

async function list(query: ListQuery, ctx: ResourceContext): Promise<ListResult> {
  const and: Prisma.SubmissionWhereInput[] = [];
  if (query.q) and.push({ OR: [{ learner: { name: { contains: query.q } } }, { learner: { user: { email: { contains: query.q } } } }] });
  if (query.tab === "Not evaluated") and.push({ evaluationStatus: "NOT_EVALUATED" });
  if (query.tab === "Evaluated") and.push({ evaluationStatus: "EVALUATED" });
  if (ctx.user.role === "INSTRUCTOR") {
    and.push({ OR: ctx.user.branchIds.length ? [{ learner: { branchId: { in: ctx.user.branchIds } } }, { learner: { branchId: null } }] : [] });
  }
  const where: Prisma.SubmissionWhereInput = and.length ? { AND: and } : {};
  const [rows, total] = await Promise.all([
    prisma.submission.findMany({ where, include, orderBy: query.sort?.key === "submittedOn" ? { submittedAt: query.sort.dir } : { submittedAt: "desc" }, skip: query.skip, take: query.take }),
    prisma.submission.count({ where }),
  ]);
  return { rows: rows.map(toSubmissionRow), total };
}

async function load(id: string) {
  const row = await prisma.submission.findUnique({ where: { id }, include });
  if (!row) throw new NotFound();
  return row;
}

const evaluateSchema = z.object({
  marks: z.union([z.string(), z.number(), z.null()]).transform((v) => v === null || v === "" ? null : Number(v)),
  feedback: z.string().trim().max(5000).optional().default(""),
});

async function evaluate(id: string, ctx: ResourceContext, input?: unknown) {
  const existing = await load(id);
  const data = parseWith(evaluateSchema, input);
  if (data.marks === null) throw new ValidationError({ marks: "Enter marks." });
  const total = existing.assessment.totalMarks || existing.total;
  if (!Number.isInteger(data.marks) || data.marks < 0 || data.marks > total) throw new ValidationError({ marks: `Marks must be from 0 to ${total}.` });
  if (ctx.user.role === "INSTRUCTOR" && existing.learner.branchId && ctx.user.branchIds.length > 0 && !ctx.user.branchIds.includes(existing.learner.branchId)) throw new Forbidden("You can only evaluate learners from your branches.");
  const updated = await prisma.submission.update({
    where: { id },
    data: { evaluationStatus: "EVALUATED", marks: data.marks, total, feedback: data.feedback, evaluatedById: ctx.user.id, evaluatedAt: new Date() },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "submission.evaluate", entity: "Submission", entityId: id, before: { marks: existing.marks, evaluationStatus: existing.evaluationStatus }, after: { marks: data.marks, feedback: data.feedback }, ip: ctx.ip });
  return toSubmissionRow(updated);
}

export const submissionResource: ResourceDef = {
  key: "learning/submissions",
  resource: "submissions",
  sortableKeys: ["submittedOn"],
  list,
  get: async (id) => toSubmissionRow(await load(id)),
  actions: { evaluate },
};
