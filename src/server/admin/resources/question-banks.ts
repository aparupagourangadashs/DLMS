import type { Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { statusFromLabel, statusLabels } from "./helpers";

const include = { _count: { select: { questions: true } } } satisfies Prisma.QuestionBankInclude;
type QuestionBankRow = Prisma.QuestionBankGetPayload<{ include: typeof include }>;

const difficultyLabels = ["Easy", "Medium", "Hard"] as const;

const schema = z.object({
  name: z.string().trim().min(3, "Enter a name.").max(200),
  difficulty: z.enum(difficultyLabels),
  exam: z.string().trim().min(2, "Enter the exam name.").max(200),
  subject: z.string().trim().min(2, "Enter the subject.").max(200),
  topic: z.string().trim().min(2, "Enter the topic.").max(200),
  description: z.string().trim().min(3, "Enter a short description.").max(5000),
  status: z.string().default("Draft"),
});

export function toQuestionBankRow(bank: QuestionBankRow): Row {
  return {
    id: bank.id,
    code: bank.code,
    name: bank.name,
    difficulty: bank.difficulty,
    exam: bank.exam,
    subject: bank.subject,
    topic: bank.topic,
    description: bank.description,
    questions: bank._count.questions,
    status: statusLabels[bank.status],
  };
}

function listWhere(query: ListQuery): Prisma.QuestionBankWhereInput {
  const and: Prisma.QuestionBankWhereInput[] = [];
  if (query.q) {
    and.push({ OR: [
      { code: { contains: query.q } },
      { name: { contains: query.q } },
      { exam: { contains: query.q } },
      { subject: { contains: query.q } },
      { topic: { contains: query.q } },
    ] });
  }
  if (query.filters.difficulty) and.push({ difficulty: query.filters.difficulty });
  return { AND: and };
}

async function list(query: ListQuery): Promise<ListResult> {
  const where = listWhere(query);
  const dir = query.sort?.dir ?? "asc";
  const [rows, total, grouped] = await Promise.all([
    prisma.questionBank.findMany({
      where,
      include,
      orderBy: query.sort?.key === "name" ? { name: dir } : { code: dir },
      skip: query.skip,
      take: query.take,
    }),
    prisma.questionBank.count({ where }),
    prisma.questionBank.groupBy({ by: ["status"], where, _count: { _all: true } }),
  ]);
  const tabCounts = { Draft: 0, Published: 0, Archived: 0 };
  for (const row of grouped) tabCounts[statusLabels[row.status] as keyof typeof tabCounts] = row._count._all;
  return { rows: rows.map(toQuestionBankRow), total, tabCounts };
}

async function load(id: string) {
  const bank = await prisma.questionBank.findUnique({ where: { id }, include });
  if (!bank) throw new NotFound();
  return bank;
}

async function nextCode() {
  const existing = await prisma.questionBank.findMany({
    select: { code: true },
    orderBy: { code: "desc" },
    take: 100,
  });
  let highest = 1039;
  for (const item of existing) {
    const match = /^QB-(\d{4,})$/.exec(item.code);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `QB-${String(highest + 1).padStart(4, "0")}`;
}

async function resolveStatus(label: string) {
  const status = statusFromLabel(label);
  if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
  return status;
}

async function assertNameFree(name: string, excludeId?: string) {
  const taken = await prisma.questionBank.findFirst({
    where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (taken) throw new Conflict("Another question bank has this name.", { name: "Already in use." });
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
  const data = parseWith(schema, input);
  await assertNameFree(data.name);
  const status = await resolveStatus(data.status);
  const created = await prisma.questionBank.create({
    data: {
      code: await nextCode(),
      name: data.name,
      difficulty: data.difficulty,
      exam: data.exam,
      subject: data.subject,
      topic: data.topic,
      description: data.description,
      status,
    },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "questionBank.create", entity: "QuestionBank", entityId: created.id, after: { code: created.code, name: created.name, status }, ip: ctx.ip });
  return toQuestionBankRow(created);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
  const existing = await load(id);
  const data = parseWith(schema, input);
  await assertNameFree(data.name, id);
  const status = await resolveStatus(data.status);
  const updated = await prisma.questionBank.update({
    where: { id },
    data: {
      name: data.name,
      difficulty: data.difficulty,
      exam: data.exam,
      subject: data.subject,
      topic: data.topic,
      description: data.description,
      status,
    },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "questionBank.update", entity: "QuestionBank", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: data.name, status }, ip: ctx.ip });
  return toQuestionBankRow(updated);
}

async function remove(id: string, ctx: ResourceContext) {
  const existing = await load(id);
  if (existing.status !== "DRAFT") throw new BusinessRule("Only draft question banks can be deleted. Archive it instead.");
  if (existing._count.questions > 0) throw new BusinessRule("Remove or move the bank's questions before deleting the bank.");
  await prisma.questionBank.delete({ where: { id } });
  await writeAudit({ actorId: ctx.user.id, action: "questionBank.delete", entity: "QuestionBank", entityId: id, before: { code: existing.code, name: existing.name }, ip: ctx.ip });
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
  const source = await load(id);
  const copy = await prisma.questionBank.create({
    data: {
      code: await nextCode(),
      name: `${source.name} (copy)`.slice(0, 200),
      difficulty: source.difficulty,
      exam: source.exam,
      subject: source.subject,
      topic: source.topic,
      description: source.description,
      status: "DRAFT",
    },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "questionBank.create", entity: "QuestionBank", entityId: copy.id, after: { duplicatedFrom: id, code: copy.code }, ip: ctx.ip });
  return toQuestionBankRow(copy);
}

export const questionBankResource: ResourceDef = {
  key: "learning/question-bank",
  resource: "questionBanks",
  sortableKeys: ["name", "code"],
  list,
  get: async (id) => toQuestionBankRow(await load(id)),
  create,
  update,
  remove,
  actions: { duplicate },
};
