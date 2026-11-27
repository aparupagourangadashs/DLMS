import crypto from "node:crypto";
import type { CertificateAutomation, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { getStorage, newStorageKey } from "@/server/storage";
import { z } from "zod";

const include = {
  templateAsset: { select: { id: true, name: true } },
  _count: { select: { certificates: true } },
  certificates: { select: { id: true, status: true } },
} satisfies Prisma.CertificateTemplateInclude;
type CertificateTemplateRow = Prisma.CertificateTemplateGetPayload<{ include: typeof include }>;

const templateStatus = (value: string) => value === "Active" ? "ACTIVE" : value === "Archived" ? "ARCHIVED" : "DRAFT";
const templateStatusLabel = (value: string) => value === "ACTIVE" ? "Active" : value === "ARCHIVED" ? "Archived" : "Draft";

const schema = z.object({
  name: z.string().trim().min(3).max(200),
  serialPrefix: z.string().trim().regex(/^[A-Z0-9_-]{2,20}$/i, "Use 2–20 letters, numbers, hyphens or underscores."),
  description: z.string().trim().max(5000).optional().default(""),
  status: z.string().default("Draft"),
  expiry: z.string().optional().default("Lifetime"),
  expiryDays: z.union([z.string(), z.number(), z.null()]).optional(),
  expiryDate: z.string().optional().default(""),
  design: z.string().optional().default("Builder"),
  layout: z.string().optional().default("Landscape"),
  heading: z.string().trim().max(200).optional().default("Certificate of completion"),
  body: z.string().trim().max(10000).optional().default("Awarded to {{learner}} for completing {{course}}."),
  signatory: z.string().trim().max(200).optional().default(""),
  automation: z.string().optional().default("Manual"),
  course: z.string().optional().default(""),
  exam: z.string().optional().default(""),
  threshold: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? 100 : Number(v)),
  notify: z.string().optional().default("Disabled"),
});

export function toCertificateTemplateRow(row: CertificateTemplateRow): Row {
  const active = row.certificates.filter((c) => c.status === "ACTIVE").length;
  const validity = row.expiryRule === "AFTER_DAYS" ? `${row.expiryDays ?? 0} days` : row.expiryRule === "FIXED_DATE" ? row.expiryDate?.toISOString().slice(0, 10) ?? "Not set" : "Lifetime";
  return {
    id: row.id,
    name: row.name,
    rule: row.automation === "MANUAL" ? "Manual issuance" : row.automation === "COURSE_COMPLETION" ? "Course completion" : "Exam passed",
    course: "",
    issued: active,
    validity,
    status: templateStatusLabel(row.status),
    serialPrefix: row.serialPrefix,
    description: row.description ?? "",
    expiry: row.expiryRule === "AFTER_DAYS" ? "After days" : row.expiryRule === "FIXED_DATE" ? "Fixed date" : "Lifetime",
    expiryDays: row.expiryDays ?? "",
    expiryDate: row.expiryDate?.toISOString().slice(0, 10) ?? "",
    design: row.designSource === "LOCAL_TEMPLATE" ? "Local template" : "Builder",
    layout: row.layout === "PORTRAIT" ? "Portrait" : "Landscape",
    heading: row.heading ?? "",
    body: row.body ?? "",
    signatory: row.signatory ?? "",
    automation: row.automation === "COURSE_COMPLETION" ? "Course completion" : row.automation === "EXAM_PASSED" ? "Exam passed" : "Manual",
    courseId: row.courseId ?? "",
    exam: row.examAssessmentId ?? "",
    threshold: row.threshold,
    notify: "Disabled",
  };
}

async function list(query: ListQuery): Promise<ListResult> {
  const where: Prisma.CertificateTemplateWhereInput = query.q ? { name: { contains: query.q } } : {};
  const [rows, total] = await Promise.all([
    prisma.certificateTemplate.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: query.skip, take: query.take }),
    prisma.certificateTemplate.count({ where }),
  ]);
  return { rows: rows.map(toCertificateTemplateRow), total };
}

async function load(id: string) {
  const row = await prisma.certificateTemplate.findUnique({ where: { id }, include });
  if (!row) throw new NotFound();
  return row;
}

async function resolve(data: z.output<typeof schema>) {
  const expiryRule = data.expiry === "After days" ? "AFTER_DAYS" : data.expiry === "Fixed date" ? "FIXED_DATE" : "LIFETIME";
  const expiryDays = data.expiryDays === undefined || data.expiryDays === null || data.expiryDays === "" ? null : Number(data.expiryDays);
  if (expiryRule === "AFTER_DAYS" && (!Number.isInteger(expiryDays) || !expiryDays || expiryDays < 1)) throw new ValidationError({ expiryDays: "Enter at least 1 day." });
  const expiryDate = expiryRule === "FIXED_DATE" && data.expiryDate ? new Date(`${data.expiryDate}T00:00:00Z`) : null;
  if (expiryRule === "FIXED_DATE" && (!expiryDate || Number.isNaN(expiryDate.getTime()))) throw new ValidationError({ expiryDate: "Choose an expiry date." });
  const automation: CertificateAutomation = data.automation === "Course completion" ? "COURSE_COMPLETION" : data.automation === "Exam passed" ? "EXAM_PASSED" : "MANUAL";
  if (!Number.isInteger(data.threshold) || data.threshold < 1 || data.threshold > 100) throw new ValidationError({ threshold: "Enter a threshold from 1 to 100." });
  let courseId: string | null = null;
  if (automation === "COURSE_COMPLETION") {
    if (!data.course) throw new ValidationError({ course: "Choose a course." });
    const course = await prisma.course.findFirst({ where: { title: data.course } });
    if (!course) throw new ValidationError({ course: "Choose an existing course." });
    courseId = course.id;
  }
  return { expiryRule, expiryDays, expiryDate, automation, courseId };
}

async function create(input: unknown, ctx: ResourceContext) {
  const data = parseWith(schema, input);
  const r = await resolve(data);
  if (await prisma.certificateTemplate.findFirst({ where: { serialPrefix: data.serialPrefix }, select: { id: true } })) throw new Conflict("A certificate template already uses this serial prefix.");
  const created = await prisma.certificateTemplate.create({
    data: {
      name: data.name, serialPrefix: data.serialPrefix.toUpperCase(), description: data.description,
      status: templateStatus(data.status), expiryRule: r.expiryRule, expiryDays: r.expiryDays,
      expiryDate: r.expiryDate, designSource: data.design === "Local template" ? "LOCAL_TEMPLATE" : "BUILDER",
      layout: data.layout === "Portrait" ? "PORTRAIT" : "LANDSCAPE",
      heading: data.heading, body: data.body, signatory: data.signatory,
      automation: r.automation, courseId: r.courseId, examAssessmentId: r.automation === "EXAM_PASSED" ? data.exam : null,
      threshold: data.threshold,
    },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "certificateTemplate.create", entity: "CertificateTemplate", entityId: created.id, after: { name: data.name, status: created.status }, ip: ctx.ip });
  return toCertificateTemplateRow(await load(created.id));
}

async function update(id: string, input: unknown, ctx: ResourceContext) {
  const existing = await load(id);
  const data = parseWith(schema, input);
  const r = await resolve(data);
  if (existing._count.certificates > 0 && (existing.serialPrefix !== data.serialPrefix.toUpperCase())) throw new BusinessRule("The serial prefix cannot change after certificates are issued.");
  const updated = await prisma.certificateTemplate.update({
    where: { id },
    data: {
      name: data.name, serialPrefix: data.serialPrefix.toUpperCase(), description: data.description,
      status: templateStatus(data.status), expiryRule: r.expiryRule, expiryDays: r.expiryDays,
      expiryDate: r.expiryDate, designSource: data.design === "Local template" ? "LOCAL_TEMPLATE" : "BUILDER",
      layout: data.layout === "Portrait" ? "PORTRAIT" : "LANDSCAPE",
      heading: data.heading, body: data.body, signatory: data.signatory,
      automation: r.automation, courseId: r.courseId, examAssessmentId: r.automation === "EXAM_PASSED" ? data.exam : null,
      threshold: data.threshold,
    },
    include,
  });
  await writeAudit({ actorId: ctx.user.id, action: "certificateTemplate.update", entity: "CertificateTemplate", entityId: id, before: { name: existing.name, status: existing.status }, after: { name: data.name, status: updated.status }, ip: ctx.ip });
  return toCertificateTemplateRow(await load(updated.id));
}

async function remove(id: string, ctx: ResourceContext) {
  const existing = await load(id);
  if (existing._count.certificates > 0) throw new BusinessRule("Templates with issued certificates cannot be deleted.");
  await prisma.certificateTemplate.delete({ where: { id } });
  await writeAudit({ actorId: ctx.user.id, action: "certificateTemplate.delete", entity: "CertificateTemplate", entityId: id, before: { name: existing.name }, ip: ctx.ip });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
}

async function issue(id: string, ctx: ResourceContext, input?: unknown) {
  const data = parseWith(z.object({ learner: z.string().trim().min(1), learnerId: z.string().trim().optional().default("") }), input ?? {});
  const template = await load(id);
  if (template.status !== "ACTIVE") throw new BusinessRule("Activate the certificate template before issuing.");
  const learner = data.learnerId ? await prisma.learnerProfile.findUnique({ where: { id: data.learnerId } }) : await prisma.learnerProfile.findFirst({ where: { OR: [{ name: data.learner }, { registrationNo: data.learner }, { user: { email: data.learner } }] } });
  if (!learner) throw new ValidationError({ learner: "Choose an existing learner." });

  const certificate = await prisma.$transaction(async (tx) => {
    const count = await tx.certificate.count({ where: { templateId: id } });
    const serial = `${template.serialPrefix}-${String(count + 1).padStart(5, "0")}`;
    const verificationCode = crypto.randomBytes(18).toString("hex").toUpperCase();
    const expiresAt = template.expiryRule === "AFTER_DAYS" && template.expiryDays ? new Date(Date.now() + template.expiryDays * 86_400_000) : template.expiryRule === "FIXED_DATE" ? template.expiryDate : null;
    const learnerName = learner.name;
    const heading = template.heading ?? "Certificate of completion";
    const body = (template.body ?? "{{learner}}").replaceAll("{{learner}}", learnerName).replaceAll("{{course}}", template.courseId ? (await tx.course.findUnique({ where: { id: template.courseId }, select: { title: true } }))?.title ?? "" : "").replaceAll("{{date}}", new Date().toISOString().slice(0, 10)).replaceAll("{{serial}}", serial);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850"><rect width="1200" height="850" fill="#f8f7f2"/><rect x="40" y="40" width="1120" height="770" rx="24" fill="#fff" stroke="#4A5D8F" stroke-width="8"/><g text-anchor="middle" font-family="Georgia,serif" fill="#1a1a3e"><text x="600" y="170" font-size="46">${escapeXml(heading)}</text><text x="600" y="330" font-size="38">${escapeXml(learnerName)}</text><text x="600" y="430" font-size="26">${escapeXml(body)}</text><text x="600" y="650" font-size="20">Serial: ${escapeXml(serial)}</text><text x="600" y="700" font-size="18">Verification: ${escapeXml(verificationCode)}</text></g></svg>`;
    const bytes = Buffer.from(svg);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    let asset = await tx.asset.findFirst({ where: { sha256, storageKey: { not: null } } });
    if (!asset) {
      const storageKey = newStorageKey();
      await getStorage().put(storageKey, bytes);
      asset = await tx.asset.create({ data: { type: "TEXT_HTML", name: `${serial}.svg`, status: "READY", fileName: `${serial}.svg`, storageKey, mimeType: "image/svg+xml", sizeBytes: bytes.length, sha256, uploadedById: ctx.user.id } });
    }
    const certificate = await tx.certificate.create({ data: { templateId: id, learnerId: learner.id, serial, expiresAt, status: "ACTIVE", fileAssetId: asset.id, verificationCode } });
    await tx.inAppNotification.create({ data: { userId: learner.userId, kind: "certificate.issued", title: "Certificate issued", body: template.name, href: "/student/certificates" } });
    return certificate;
  });
  await writeAudit({ actorId: ctx.user.id, action: "certificate.issue", entity: "Certificate", entityId: certificate.id, after: { serial: certificate.serial, learnerId: learner.id }, ip: ctx.ip });
  return { id: certificate.id, name: template.name, serial: certificate.serial, verificationCode: certificate.verificationCode, status: "Issued" };
}

async function revoke(id: string, ctx: ResourceContext, input?: unknown) {
  const certificate = await prisma.certificate.findUnique({ where: { id } });
  if (!certificate) throw new NotFound();
  const data = parseWith(z.object({ reason: z.string().trim().min(3).max(500) }), input ?? {});
  if (certificate.status === "REVOKED") throw new BusinessRule("This certificate is already revoked.");
  const updated = await prisma.certificate.update({ where: { id }, data: { status: "REVOKED", revokedAt: new Date(), revokedReason: data.reason } });
  await writeAudit({ actorId: ctx.user.id, action: "certificate.revoke", entity: "Certificate", entityId: id, before: { status: certificate.status }, after: { status: "REVOKED", reason: data.reason }, ip: ctx.ip });
  return { id: updated.id, name: "Certificate", serial: updated.serial, verificationCode: updated.verificationCode, status: "Revoked" };
}

async function options() {
  const [courses, learners] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { title: true } }),
    prisma.learnerProfile.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, take: 1000, select: { name: true, registrationNo: true } }),
  ]);
  return { course: courses.map((c) => c.title), learner: learners.map((l) => l.registrationNo ? `${l.name} (${l.registrationNo})` : l.name) };
}

export const certificateResource: ResourceDef = {
  key: "learning/certificates",
  resource: "certificates",
  sortableKeys: ["name"],
  list,
  get: async (id) => toCertificateTemplateRow(await load(id)),
  options,
  create,
  update,
  remove,
  actions: { issue, revoke },
};
