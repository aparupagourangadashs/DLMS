import { z } from "zod";
import { prisma } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { SessionUser } from "@/server/auth/session";
import { Prisma, type CustomFieldEntity, type CustomFieldPlacement } from "@/generated/prisma/client";

export type LearnerExperience = {
  items: Array<{ label: string; slug: string; href?: string; visible: boolean }>;
  classRecords: boolean;
  overview: boolean;
  password: boolean;
  preferences: boolean;
  profile: boolean;
};

export const defaultLearnerExperience: LearnerExperience = {
  items: [
    { label: "Home", slug: "", visible: true },
    { label: "My Learning", slug: "my-learning", visible: true },
    { label: "Calendar", slug: "calendar", visible: true },
    { label: "Exams", slug: "exams", visible: true },
    { label: "Certificates", slug: "certificates", visible: true },
    { label: "Communities", slug: "communities", visible: true },
  ],
  classRecords: true,
  overview: true,
  password: true,
  preferences: true,
  profile: true,
};

export async function getLearnerExperience(): Promise<LearnerExperience> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "learnerExperience" } });
  const value = row?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultLearnerExperience;
  const parsed = learnerExperienceSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultLearnerExperience;
}

export const learnerExperienceSchema = z.object({
  items: z.array(z.object({
    label: z.string().trim().min(1).max(40),
    slug: z.string().trim().max(100).default(""),
    href: z.string().trim().max(500).optional(),
    visible: z.boolean(),
  })).max(30),
  classRecords: z.boolean(),
  overview: z.boolean(),
  password: z.boolean(),
  preferences: z.boolean(),
  profile: z.boolean(),
}).superRefine((value, ctx) => {
  for (const item of value.items) {
    if (item.href && !/^https:\/\/[^\s]+$/.test(item.href)) ctx.addIssue({ code: "custom", message: "Custom links must use HTTPS.", path: ["items"] });
  }
});

export async function saveLearnerExperience(user: SessionUser, ip: string, input: unknown) {
  const parsed = learnerExperienceSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  await prisma.siteSetting.upsert({
    where: { key: "learnerExperience" },
    update: { value: parsed.data as object, updatedById: user.id },
    create: { key: "learnerExperience", value: parsed.data as object, updatedById: user.id },
  });
  await writeAudit({ actorId: user.id, action: "learnerExperience.update", entity: "LearnerExperience", entityId: "learnerExperience", after: { itemCount: parsed.data.items.length }, ip });
  return parsed.data;
}

export async function listSegments() {
  const rows = await prisma.segment.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    rules: row.rules,
    memberCount: row._count.members,
  }));
}

const segmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(["STATIC", "DYNAMIC"]),
  learnerIds: z.array(z.string()).optional().default([]),
  rules: z.object({
    status: z.enum(["ALL", "REGISTERED", "ON_LEAVE", "ARCHIVED"]).default("ALL"),
    branchId: z.string().optional().default(""),
    courseId: z.string().optional().default(""),
  }).optional(),
});

export async function saveSegment(user: SessionUser, ip: string, input: unknown, id?: string) {
  const parsed = segmentSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  const taken = await prisma.segment.findFirst({ where: { name: parsed.data.name, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
  if (taken) throw new Conflict("Another segment has this name.");

  let memberIds = [...parsed.data.learnerIds];
  if (parsed.data.type === "DYNAMIC") {
    const learnerWhere: Prisma.LearnerProfileWhereInput = {};
    if (parsed.data.rules?.status && parsed.data.rules.status !== "ALL") learnerWhere.status = parsed.data.rules.status as "REGISTERED" | "ON_LEAVE" | "ARCHIVED";
    if (parsed.data.rules?.branchId) learnerWhere.branchId = parsed.data.rules.branchId;
    const profiles = await prisma.learnerProfile.findMany({ where: learnerWhere, select: { userId: true } });
    memberIds = profiles.map((row) => row.userId);
    if (parsed.data.rules?.courseId) {
      const enrolments = await prisma.enrolment.findMany({ where: { courseId: parsed.data.rules.courseId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { userId: true } });
      const enrolled = new Set(enrolments.map((row) => row.userId));
      memberIds = memberIds.filter((userId) => enrolled.has(userId));
    }
  }

  const rules: Prisma.JsonObject | typeof Prisma.JsonNull = parsed.data.type === "DYNAMIC" ? (parsed.data.rules as Prisma.JsonObject) : Prisma.JsonNull;
  let segment;
  if (id) {
    segment = await prisma.segment.update({ where: { id }, data: { name: parsed.data.name, type: parsed.data.type, rules } });
    await prisma.segmentMember.deleteMany({ where: { segmentId: id } });
  } else {
    segment = await prisma.segment.create({ data: { name: parsed.data.name, type: parsed.data.type, rules, createdById: user.id } });
  }
  if (memberIds.length) {
    await prisma.segmentMember.createMany({ data: memberIds.map((userId) => ({ segmentId: segment.id, userId })), skipDuplicates: true });
  }
  await writeAudit({ actorId: user.id, action: id ? "segment.update" : "segment.create", entity: "Segment", entityId: segment.id, after: { name: segment.name, type: segment.type, memberCount: memberIds.length }, ip });
  return segment;
}

export async function deleteSegment(user: SessionUser, ip: string, id: string) {
  const segment = await prisma.segment.findUnique({ where: { id } });
  if (!segment) throw new NotFound();
  await prisma.segment.delete({ where: { id } });
  await writeAudit({ actorId: user.id, action: "segment.delete", entity: "Segment", entityId: id, before: { name: segment.name }, ip });
}

export async function listCustomFields(entity?: string) {
  const map: Record<string, string> = {
    Learner: "LEARNER", Instructor: "INSTRUCTOR", Course: "COURSE", Batch: "BATCH",
    Certificate: "CERTIFICATE", Question: "QUESTION", Announcement: "ANNOUNCEMENT", Enquiry: "ENQUIRY",
  };
  const where = entity ? { entity: map[entity] as never } : {};
  const rows = await prisma.customField.findMany({ where, orderBy: [{ entity: "asc" }, { placement: "asc" }, { sortOrder: "asc" }] });
  return rows.map((row) => ({
    id: row.id,
    entity: row.entity,
    placement: row.placement,
    name: row.label,
    type: row.type,
    required: row.required,
    options: Array.isArray(row.options) ? row.options.filter((v): v is string => typeof v === "string") : [],
  }));
}

const customFieldSchema = z.object({
  entity: z.enum(["Learner", "Instructor", "Course", "Batch", "Certificate", "Question", "Announcement", "Enquiry"]),
  placement: z.enum(["Signup", "Offline admission"]),
  name: z.string().trim().min(1).max(100),
  type: z.enum(["Text", "Number", "Date", "Dropdown", "Phone", "Email", "Checkbox"]),
  required: z.boolean(),
  options: z.array(z.string()).optional().default([]),
  sortOrder: z.number().int().min(0).optional(),
});

export async function saveCustomField(user: SessionUser, ip: string, input: unknown, id?: string) {
  const parsed = customFieldSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "_", issue.message])));
  if (parsed.data.type === "Dropdown" && parsed.data.options.length < 2) throw new ValidationError({ options: "Add at least two dropdown choices." });
  const entityMap = { Learner: "LEARNER", Instructor: "INSTRUCTOR", Course: "COURSE", Batch: "BATCH", Certificate: "CERTIFICATE", Question: "QUESTION", Announcement: "ANNOUNCEMENT", Enquiry: "ENQUIRY" } as const;
  const placement: CustomFieldPlacement = parsed.data.placement === "Signup" ? "SIGNUP" : "OFFLINE_ADMISSION";
  const entity: CustomFieldEntity = entityMap[parsed.data.entity];
  const taken = await prisma.customField.findFirst({ where: { entity, placement, label: parsed.data.name, ...(id ? { id: { not: id } } : {}) } });
  if (taken) throw new Conflict("A field with this label already exists in this scope.");
  const count = await prisma.customField.count({ where: { entity, placement } });
  const data = { entity, placement, label: parsed.data.name, type: parsed.data.type, required: parsed.data.required, options: parsed.data.options.length ? parsed.data.options : undefined, sortOrder: parsed.data.sortOrder ?? (id ? undefined : count) };
  const row = id ? await prisma.customField.update({ where: { id }, data }) : await prisma.customField.create({ data });
  await writeAudit({ actorId: user.id, action: id ? "customField.update" : "customField.create", entity: "CustomField", entityId: row.id, after: { label: row.label, entity, placement }, ip });
  return row;
}

export async function deleteCustomField(user: SessionUser, ip: string, id: string) {
  const row = await prisma.customField.findUnique({ where: { id } });
  if (!row) throw new NotFound();
  await prisma.customField.delete({ where: { id } });
  await writeAudit({ actorId: user.id, action: "customField.delete", entity: "CustomField", entityId: id, before: { label: row.label }, ip });
}
