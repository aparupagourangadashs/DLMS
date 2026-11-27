import type { FeedbackFormStatus, FeedbackQuestionType, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";

const include = {
  course: { select: { id: true, title: true } },
  questions: { orderBy: { sortOrder: "asc" } },
  _count: { select: { responses: true } },
} satisfies Prisma.FeedbackFormInclude;
type FeedbackRow = Prisma.FeedbackFormGetPayload<{ include: typeof include }>;

const questionTypes: Record<FeedbackQuestionType, string> = { RATING: "Rating", TEXT: "Text", CHOICE: "Choice" };
const questionTypeFromLabel = (value: string) => (Object.keys(questionTypes) as FeedbackQuestionType[]).find((key) => questionTypes[key] === value);

const questionSchema = z.object({
  prompt: z.string().trim().min(3).max(500),
  type: z.string(),
  required: z.union([z.boolean(), z.string()]).transform((v) => v === true || v === "Yes"),
  options: z.union([z.string(), z.array(z.string())]).optional().transform((v) => typeof v === "string" ? v.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : v ?? []),
});

const schema = z.object({
  name: z.string().trim().min(3).max(200),
  type: z.string().min(2).max(40),
  course: z.string().optional().default(""),
  session: z.string().optional().default(""),
  template: z.string().optional().default("Blank"),
  description: z.string().trim().max(5000).optional().default(""),
  questions: z.unknown().optional(),
  status: z.string().optional().default("Draft"),
});

function jsonOptions(value: Prisma.JsonValue | null) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function toFeedbackRow(row: FeedbackRow): Row {
  return {
    id: row.id,
    name: row.name,
    createdOn: row.createdAt.toISOString().slice(0, 10),
    type: row.type,
    conversions: row._count.responses,
    course: row.course?.title ?? "",
    session: row.sessionName ?? "",
    template: row.template,
    description: row.description ?? "",
    status: row.status,
    questions: JSON.stringify(row.questions.map((q) => ({ prompt: q.prompt, type: questionTypes[q.type], required: q.required ? "Yes" : "No", options: jsonOptions(q.options).join("\n") }))),
  };
}

async function list(query: ListQuery): Promise<ListResult> {
  const and: Prisma.FeedbackFormWhereInput[] = [];
  if (query.q) and.push({ name: { contains: query.q } });
  const where = and.length ? { AND: and } : {};
  const [rows, total] = await Promise.all([
    prisma.feedbackForm.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: query.skip, take: query.take }),
    prisma.feedbackForm.count({ where }),
  ]);
  return { rows: rows.map(toFeedbackRow), total };
}

async function load(id: string) {
  const row = await prisma.feedbackForm.findUnique({ where: { id }, include });
  if (!row) throw new NotFound();
  return row;
}

async function resolveQuestions(value: unknown) {
  let raw: unknown = value;
  if (typeof value === "string") {
    try { raw = JSON.parse(value); } catch { throw new ValidationError({ questions: "Could not read the questions." }); }
  }
  if (!Array.isArray(raw)) throw new ValidationError({ questions: "Add at least one question." });
  if (raw.length < 1 || raw.length > 100) throw new ValidationError({ questions: "Add between 1 and 100 questions." });
  const parsed = raw.map((item, index) => {
    const result = questionSchema.safeParse(item);
    if (!result.success) throw new ValidationError({ questions: `Question ${index + 1}: ${result.error.issues[0]?.message ?? "invalid"}` });
    return result.data;
  });
  return parsed.map((q, sortOrder) => {
    const type = questionTypeFromLabel(q.type);
    if (!type) throw new ValidationError({ questions: `Question ${sortOrder + 1} has an invalid answer type.` });
    if (type === "CHOICE" && q.options.length < 2) throw new ValidationError({ questions: `Choice question ${sortOrder + 1} needs at least two options.` });
    return { prompt: q.prompt, type, required: q.required, options: q.options, sortOrder };
  });
}

async function resolve(data: z.output<typeof schema>) {
  let courseId: string | null = null;
  if (data.type === "Course-linked") {
    if (!data.course) throw new ValidationError({ course: "Choose a course." });
    const course = await prisma.course.findFirst({ where: { title: data.course } });
    if (!course) throw new ValidationError({ course: "Choose an existing course." });
    courseId = course.id;
  }
  const status: FeedbackFormStatus = data.status === "Published" ? "PUBLISHED" : data.status === "Archived" ? "ARCHIVED" : "DRAFT";
  return { courseId, status };
}

async function create(input: unknown, ctx: ResourceContext) {
  const data = parseWith(schema, input);
  const r = await resolve(data);
  const questions = await resolveQuestions(data.questions);
  if (await prisma.feedbackForm.findFirst({ where: { name: data.name }, select: { id: true } })) throw new Conflict("Another feedback form has this name.");
  const created = await prisma.feedbackForm.create({
    data: {
      name: data.name, type: data.type, courseId: r.courseId,
      sessionName: data.type === "Session feedback" ? data.session : null,
      template: data.template, description: data.description, status: r.status,
      questions: { create: questions },
    },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "feedbackForm.create", entity: "FeedbackForm", entityId: created.id, after: { name: data.name, status: r.status }, ip: ctx.ip });
  return toFeedbackRow(await load(created.id));
}

async function update(id: string, input: unknown, ctx: ResourceContext) {
  const existing = await load(id);
  if (existing._count.responses > 0) throw new BusinessRule("Editing a form that already has responses is not allowed. Create a new version instead.");
  const data = parseWith(schema, input);
  const r = await resolve(data);
  const questions = await resolveQuestions(data.questions);
  await prisma.$transaction([
    prisma.feedbackQuestion.deleteMany({ where: { formId: id } }),
    prisma.feedbackForm.update({
      where: { id },
      data: {
        name: data.name, type: data.type, courseId: r.courseId,
        sessionName: data.type === "Session feedback" ? data.session : null,
        template: data.template, description: data.description, status: r.status,
        questions: { create: questions },
      },
    }),
  ]);
  await writeAudit({ actorId: ctx.user.id, action: "feedbackForm.update", entity: "FeedbackForm", entityId: id, before: { name: existing.name }, after: { name: data.name, status: r.status }, ip: ctx.ip });
  return toFeedbackRow(await load(id));
}

async function remove(id: string, ctx: ResourceContext) {
  const existing = await load(id);
  if (existing._count.responses > 0) throw new BusinessRule("Forms with responses cannot be deleted.");
  await prisma.feedbackForm.delete({ where: { id } });
  await writeAudit({ actorId: ctx.user.id, action: "feedbackForm.delete", entity: "FeedbackForm", entityId: id, before: { name: existing.name }, ip: ctx.ip });
}

async function options() {
  const courses = await prisma.course.findMany({ orderBy: { title: "asc" }, select: { title: true } });
  return { course: courses.map((c) => c.title) };
}

export const feedbackResource: ResourceDef = {
  key: "learning/feedback-forms",
  resource: "feedbackForms",
  sortableKeys: ["name", "createdOn"],
  list,
  get: async (id) => toFeedbackRow(await load(id)),
  options,
  create,
  update,
  remove,
};
