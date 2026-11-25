import type { EnrolmentSource } from "@/generated/prisma/client";
import { parseEnrolmentCsv } from "@/lib/admin/csv-import";
import type { EnrolBatchOption, EnrolRowResult } from "@/lib/admin/enrolment-types";
import { writeAudit } from "@/server/audit";
import { normalizeEmail } from "@/server/auth/tokens";
import { prisma } from "@/server/db";
import { AppError, BusinessRule, ValidationError } from "@/server/http/errors";
import { sendPasswordSetupEmail } from "@/server/services/accounts";
import { courseOptions, labelMap } from "@/server/services/lookups";
import { nextRegistrationNo } from "@/server/services/registration";
import { z } from "zod";

/** Who is enrolling. Branch-scoped staff may only reach learners of their own branches. */
export type EnrolActor = { id: string; ip?: string; role: string; branchIds: string[] };
const isScoped = (actor: EnrolActor) => actor.role !== "SUPER_ADMIN" && actor.branchIds.length > 0;

/** "asha.rao@example.org" becomes "Asha Rao", for bulk lists that carry no names. */
export function nameFromEmail(email: string) {
    const words = email.split("@")[0].replace(/\d+/g, " ").split(/[._+\-\s]+/).filter(Boolean);
    const name = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return name.length >= 2 ? name : "New Learner";
}

export type EnrolOutcome = { status: "ready" | "enrolled" | "skipped"; message: string; newAccount: boolean; learnerId?: string };

type EnrolInput = {
    email: string;
    name?: string;
    phone?: string;
    batchId: string;
    source: EnrolmentSource;
    commit: boolean;
    accessStartsAt?: Date | null;
    accessEndsAt?: Date | null;
};

const emailSchema = z.email("Enter a valid email address.").max(254);

/** Adds one learner to one batch, creating the account first when the address is new. With `commit: false` it only reports what would happen. */
export async function enrolByEmail(input: EnrolInput, actor: EnrolActor): Promise<EnrolOutcome> {
    const parsed = emailSchema.safeParse(input.email.trim());
    if (!parsed.success) throw new ValidationError({ email: "Enter a valid email address." });
    const email = normalizeEmail(parsed.data);

    const batch = await prisma.batch.findUnique({ where: { id: input.batchId }, include: { course: { select: { id: true, title: true, status: true } } } });
    if (!batch) throw new ValidationError({ batch: "Choose an existing batch." });
    if (batch.status !== "ACTIVE") throw new BusinessRule("This batch is not taking enrolments. Reopen it first.");
    if (batch.course.status === "ARCHIVED") throw new BusinessRule("The course of this batch is archived.");
    if (isScoped(actor) && batch.branchId && !actor.branchIds.includes(batch.branchId)) throw new BusinessRule("This batch belongs to another branch.");

    const existing = await prisma.user.findUnique({ where: { email }, include: { learnerProfile: { select: { status: true, branchId: true } } } });
    if (existing) {
        if (existing.kind !== "LEARNER" || !existing.learnerProfile) throw new BusinessRule("This email belongs to a staff account, not a learner.");
        if (existing.status !== "ACTIVE" || existing.learnerProfile.status === "ARCHIVED") throw new BusinessRule("This learner is archived. Restore them first.");
        if (isScoped(actor) && existing.learnerProfile.branchId && !actor.branchIds.includes(existing.learnerProfile.branchId)) throw new BusinessRule("This learner belongs to another branch.");

        const active = await prisma.enrolment.findFirst({ where: { userId: existing.id, courseId: batch.courseId, status: "ACTIVE" }, include: { batch: { select: { name: true } } } });
        if (active) {
            const where = active.batch?.name ?? "this course";
            return { status: "skipped", message: active.batchId === batch.id ? `Already enrolled in ${batch.name}.` : `Already enrolled in ${where}.`, newAccount: false, learnerId: existing.id };
        }
        if (!input.commit) return { status: "ready", message: `Will be enrolled in ${batch.name}.`, newAccount: false, learnerId: existing.id };
        const enrolment = await prisma.enrolment.create({
            data: { userId: existing.id, courseId: batch.courseId, batchId: batch.id, source: input.source, accessStartsAt: input.accessStartsAt ?? null, accessEndsAt: input.accessEndsAt ?? null, createdById: actor.id },
        });
        await writeAudit({ actorId: actor.id, action: "enrolment.create", entity: "Enrolment", entityId: enrolment.id, after: { learner: existing.id, batch: batch.name, source: input.source }, ip: actor.ip });
        return { status: "enrolled", message: `Enrolled in ${batch.name}.`, newAccount: false, learnerId: existing.id };
    }

    const name = (input.name ?? "").trim();
    if (name.length < 2) throw new ValidationError({ name: "Name is required for a new learner." });
    if (!input.commit) return { status: "ready", message: `A new account will be created and enrolled in ${batch.name}.`, newAccount: true };

    const phone = (input.phone ?? "").trim();
    if (!/^(\+?[\d\s-]{6,20})?$/.test(phone)) throw new ValidationError({ phone: "Enter a valid phone number." });
    const branchId = isScoped(actor) ? (batch.branchId ?? actor.branchIds[0]) : batch.branchId;
    const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email,
                phone: phone || null,
                kind: "LEARNER",
                role: "LEARNER",
                emailVerifiedAt: new Date(),
                learnerProfile: { create: { name, branchId, registrationNo: await nextRegistrationNo(tx) } },
            },
            include: { learnerProfile: { select: { registrationNo: true } } },
        });
        const enrolment = await tx.enrolment.create({
            data: { userId: user.id, courseId: batch.courseId, batchId: batch.id, source: input.source, accessStartsAt: input.accessStartsAt ?? null, accessEndsAt: input.accessEndsAt ?? null, createdById: actor.id },
        });
        return { user, enrolment };
    });
    await writeAudit({ actorId: actor.id, action: "learner.create", entity: "User", entityId: created.user.id, after: { registrationNo: created.user.learnerProfile?.registrationNo, via: "enrolment" }, ip: actor.ip });
    await writeAudit({ actorId: actor.id, action: "enrolment.create", entity: "Enrolment", entityId: created.enrolment.id, after: { learner: created.user.id, batch: batch.name, source: input.source }, ip: actor.ip });
    await sendPasswordSetupEmail(created.user.id, email, "invite");
    return { status: "enrolled", message: `Account created and enrolled in ${batch.name}.`, newAccount: true, learnerId: created.user.id };
}

export type RowInput = { line: number; email: string; name: string; batch: string };

/** Runs a list of rows one by one; a bad row never stops the others, and nothing is written unless `commit` is true. */
export async function enrolRows(rows: RowInput[], options: { commit: boolean; source: EnrolmentSource; fixedBatchId?: string; deriveNames: boolean }, actor: EnrolActor): Promise<EnrolRowResult[]> {
    const batches = await prisma.batch.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } });
    const byName = new Map(batches.map((b) => [b.name.toLowerCase(), b]));
    const fixed = options.fixedBatchId ? await prisma.batch.findUnique({ where: { id: options.fixedBatchId }, select: { id: true, name: true } }) : null;
    const seen = new Set<string>();
    const results: EnrolRowResult[] = [];

    for (const row of rows) {
        const base = { line: row.line, email: row.email, name: row.name, batch: fixed?.name ?? row.batch, newAccount: false };
        try {
            if (seen.has(row.email)) {
                results.push({ ...base, status: "error", message: "Duplicate in this list." });
                continue;
            }
            seen.add(row.email);
            const batch = fixed ?? byName.get(row.batch.toLowerCase());
            if (!batch) {
                results.push({ ...base, status: "error", message: row.batch ? "Unknown or inactive batch." : "Batch is missing." });
                continue;
            }
            const name = row.name || (options.deriveNames ? nameFromEmail(row.email) : "");
            const outcome = await enrolByEmail({ email: row.email, name, batchId: batch.id, source: options.source, commit: options.commit }, actor);
            results.push({ ...base, name: outcome.newAccount ? name : row.name, batch: batch.name, status: outcome.status, message: outcome.message, newAccount: outcome.newAccount });
        } catch (error) {
            const message = error instanceof ValidationError ? Object.values(error.fields ?? {})[0] ?? error.message : error instanceof AppError ? error.message : "Could not process this row.";
            if (!(error instanceof AppError)) console.error("[enrolments] unexpected error", error);
            results.push({ ...base, status: "error", message: message.replace(/^Name is required for a new learner\.$/, "Name needed for a new learner.") });
        }
    }
    return results;
}

const MAX_EMAILS = 500;

export function parseEmailList(text: string): RowInput[] {
    const parts = text.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) throw new ValidationError({ emails: "Add at least one email address." });
    if (parts.length > MAX_EMAILS) throw new ValidationError({ emails: `Add at most ${MAX_EMAILS} addresses at a time.` });
    return parts.map((email, index) => ({ line: index + 1, email, name: "", batch: "" }));
}

export function parseEnrolmentFile(text: string): RowInput[] {
    try {
        return parseEnrolmentCsv(text, MAX_EMAILS).map((row) => ({ ...row, email: normalizeEmail(row.email) }));
    } catch (error) {
        throw new ValidationError({ csv: error instanceof Error ? error.message : "Could not read this file." });
    }
}

/** Batches that can take enrolments, for the pickers on the New Enrolment screen. */
export async function listEnrolBatches(actor: Pick<EnrolActor, "role" | "branchIds">): Promise<EnrolBatchOption[]> {
    const scoped = actor.role !== "SUPER_ADMIN" && actor.branchIds.length > 0;
    const [batches, courses] = await Promise.all([
        prisma.batch.findMany({
            where: { status: "ACTIVE", ...(scoped ? { OR: [{ branchId: { in: actor.branchIds } }, { branchId: null }] } : {}) },
            select: { id: true, name: true, courseId: true },
            orderBy: [{ startDate: "desc" }, { name: "asc" }],
        }),
        courseOptions(),
    ]);
    const label = labelMap(courses);
    return batches.map((b) => ({ id: b.id, name: b.name, course: label.get(b.courseId) ?? "" }));
}
