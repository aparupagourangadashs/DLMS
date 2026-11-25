import type { LearnerStatus, Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { normalizeEmail } from "@/server/auth/tokens";
import { prisma } from "@/server/db";
import { Conflict, Forbidden, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { sendPasswordSetupEmail } from "@/server/services/accounts";
import { courseOptions, idByLabel } from "@/server/services/lookups";
import { nextRegistrationNo } from "@/server/services/registration";
import { z } from "zod";

const include = {
    user: { include: { enrolments: { select: { status: true, course: { select: { title: true } }, batch: { select: { name: true } } }, orderBy: { enrolledAt: "desc" } } } },
    branch: true,
} satisfies Prisma.LearnerProfileInclude;
type ProfileRow = Prisma.LearnerProfileGetPayload<{ include: typeof include }>;

export const learnerStatusLabels: Record<LearnerStatus, string> = { REGISTERED: "Registered", ON_LEAVE: "On leave", ARCHIVED: "Archived" };
const statusFromLabel = (label: string) => (Object.keys(learnerStatusLabels) as LearnerStatus[]).find((key) => learnerStatusLabels[key] === label);

/** What the directory shows: the manual states, or Enrolled / Completed worked out from the learner's enrolments. */
export function displayStatus(profile: ProfileRow) {
    if (profile.status === "ARCHIVED") return "Archived";
    if (profile.status === "ON_LEAVE") return "On leave";
    const enrolments = profile.user.enrolments;
    if (enrolments.some((e) => e.status === "ACTIVE")) return "Enrolled";
    if (enrolments.some((e) => e.status === "COMPLETED")) return "Completed";
    return "Registered";
}

const hasActive: Prisma.LearnerProfileWhereInput = { user: { enrolments: { some: { status: "ACTIVE" } } } };
const hasCompleted: Prisma.LearnerProfileWhereInput = { user: { enrolments: { some: { status: "COMPLETED" } } } };
const tabWhere = (tab?: string): Prisma.LearnerProfileWhereInput | undefined => {
    switch (tab) {
        case "Archived": return { status: "ARCHIVED" };
        case "On leave": return { status: "ON_LEAVE" };
        case "Enrolled": return { AND: [{ status: "REGISTERED" }, hasActive] };
        case "Completed": return { AND: [{ status: "REGISTERED" }, { NOT: hasActive }, hasCompleted] };
        case "Registered": return { AND: [{ status: "REGISTERED" }, { NOT: hasActive }, { NOT: hasCompleted }] };
        default: return undefined;
    }
};
const TABS = ["Registered", "Enrolled", "Completed", "On leave", "Archived"] as const;

export function toLearnerRow(profile: ProfileRow): Row {
    const live = profile.user.enrolments.filter((e) => e.status === "ACTIVE");
    return {
        id: profile.userId,
        name: profile.name,
        city: profile.city ?? "",
        email: profile.user.email,
        phone: profile.user.phone ?? "",
        addedOn: profile.createdAt.toISOString().slice(0, 10),
        status: displayStatus(profile),
        standing: learnerStatusLabels[profile.status],
        regNo: profile.registrationNo ?? "",
        branch: profile.branch?.name ?? "",
        course: [...new Set(live.map((e) => e.course.title))].join(", "),
        batch: [...new Set(live.flatMap((e) => (e.batch ? [e.batch.name] : [])))].join(", "),
    };
}

const name = z.string().trim().min(2, "Enter the full name.").max(100);
const phone = z.string().trim().regex(/^(\+?[\d\s-]{6,20})?$/, "Enter a valid phone number.");
const city = z.string().trim().max(80);

const createSchema = z.object({
    name,
    email: z.email("Enter a valid email address.").max(254),
    phone: phone.default(""),
    city: city.default(""),
    branch: z.string().trim().default(""),
    standing: z.string().default("Registered"),
});
const updateSchema = z.object({
    name: name.optional(),
    phone: phone.optional(),
    city: city.optional(),
    branch: z.string().trim().optional(),
    standing: z.string().optional(),
});

// Branch-scoped staff only see and manage learners of their own branches.
const isScoped = (ctx: ResourceContext) => ctx.user.role !== "SUPER_ADMIN" && ctx.user.branchIds.length > 0;
const scope = (ctx: ResourceContext): Prisma.LearnerProfileWhereInput => (isScoped(ctx) ? { branchId: { in: ctx.user.branchIds } } : {});

async function baseWhere(query: ListQuery, ctx: ResourceContext): Promise<Prisma.LearnerProfileWhereInput> {
    const and: Prisma.LearnerProfileWhereInput[] = [{ user: { kind: "LEARNER" } }, scope(ctx)];
    if (query.q) {
        and.push({ OR: [{ name: { contains: query.q } }, { registrationNo: { contains: query.q } }, { user: { email: { contains: query.q } } }, { user: { phone: { contains: query.q } } }] });
    }
    if (query.filters.city) and.push({ city: query.filters.city });
    if (query.filters.branch) and.push({ branch: { name: query.filters.branch } });
    if (query.filters.course) {
        const courseId = idByLabel(await courseOptions(), query.filters.course);
        and.push({ user: { enrolments: { some: { courseId: courseId ?? "none" } } } });
    }
    if (query.filters.batch) and.push({ user: { enrolments: { some: { batch: { name: query.filters.batch } } } } });
    if (query.from) and.push({ createdAt: { gte: new Date(`${query.from}T00:00:00Z`) } });
    if (query.to) and.push({ createdAt: { lt: new Date(new Date(`${query.to}T00:00:00Z`).getTime() + 86_400_000) } });
    return { AND: and };
}

function orderBy(query: ListQuery): Prisma.LearnerProfileOrderByWithRelationInput {
    const dir = query.sort?.dir ?? "desc";
    if (query.sort?.key === "name") return { name: dir };
    if (query.sort?.key === "addedOn") return { createdAt: dir };
    return { createdAt: "desc" };
}

async function list(query: ListQuery, ctx: ResourceContext): Promise<ListResult> {
    const base = await baseWhere(query, ctx);
    const tab = tabWhere(query.tab);
    const where: Prisma.LearnerProfileWhereInput = tab ? { AND: [base, tab] } : base;
    const [rows, total, counts] = await Promise.all([
        prisma.learnerProfile.findMany({ where, include, orderBy: orderBy(query), skip: query.skip, take: query.take }),
        prisma.learnerProfile.count({ where }),
        Promise.all(TABS.map((name) => prisma.learnerProfile.count({ where: { AND: [base, tabWhere(name) ?? {}] } }))),
    ]);
    const tabCounts: Record<string, number> = Object.fromEntries(TABS.map((name, index) => [name, counts[index]]));
    return { rows: rows.map(toLearnerRow), total, tabCounts };
}

async function loadTarget(id: string, ctx: ResourceContext) {
    const profile = await prisma.learnerProfile.findFirst({ where: { userId: id, user: { kind: "LEARNER" }, ...scope(ctx) }, include });
    if (!profile) throw new NotFound();
    return profile;
}

async function resolveBranch(branchName: string | undefined, ctx: ResourceContext) {
    if (branchName === undefined) return undefined;
    if (branchName === "") return null;
    const branch = await prisma.branch.findUnique({ where: { name: branchName } });
    if (!branch) throw new ValidationError({ branch: "Choose an existing branch." });
    if (isScoped(ctx) && !ctx.user.branchIds.includes(branch.id)) throw new Forbidden("You can only manage learners of your own branch.");
    return branch.id;
}

function resolveStatus(label: string | undefined, allowArchived: boolean) {
    if (label === undefined) return undefined;
    const status = statusFromLabel(label);
    if (!status || (!allowArchived && status === "ARCHIVED")) throw new ValidationError({ standing: allowArchived ? "Choose Registered, On leave or Archived." : "Choose Registered or On leave." });
    return status;
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(createSchema, input);
    const status = resolveStatus(data.standing, false) ?? "REGISTERED";
    const email = normalizeEmail(data.email);
    const branchId = (await resolveBranch(data.branch, ctx)) ?? (isScoped(ctx) ? ctx.user.branchIds[0] : null);
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new Conflict("A user with this email already exists.", { email: "Already in use." });
    }
    const profile = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email,
                phone: data.phone || null,
                kind: "LEARNER",
                role: "LEARNER",
                emailVerifiedAt: new Date(),
                learnerProfile: { create: { name: data.name, city: data.city || null, branchId, status, registrationNo: await nextRegistrationNo(tx) } },
            },
            include: { learnerProfile: { include } },
        });
        return user.learnerProfile!;
    });
    await writeAudit({ actorId: ctx.user.id, action: "learner.create", entity: "User", entityId: profile.userId, after: { registrationNo: profile.registrationNo, status }, ip: ctx.ip });
    await sendPasswordSetupEmail(profile.userId, email, "invite");
    return toLearnerRow(profile);
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const data = parseWith(updateSchema, input);
    const target = await loadTarget(id, ctx);
    const branchId = await resolveBranch(data.branch, ctx);
    const status = resolveStatus(data.standing, true);

    const userData: Prisma.UserUpdateInput = {};
    if (data.phone !== undefined) userData.phone = data.phone || null;
    const archiving = status !== undefined && (status === "ARCHIVED") !== (target.status === "ARCHIVED");
    if (archiving) {
        userData.status = status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
        // Bumping tokenVersion signs the learner out everywhere.
        if (status === "ARCHIVED") userData.tokenVersion = { increment: 1 };
    }
    const updated = await prisma.learnerProfile.update({
        where: { userId: id },
        data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.city !== undefined ? { city: data.city || null } : {}),
            ...(branchId !== undefined ? { branch: branchId ? { connect: { id: branchId } } : { disconnect: true } } : {}),
            ...(status !== undefined ? { status } : {}),
            user: { update: userData },
        },
        include,
    });
    await writeAudit({
        actorId: ctx.user.id,
        action: archiving ? (status === "ARCHIVED" ? "learner.archive" : "learner.restore") : "learner.update",
        entity: "User",
        entityId: id,
        before: { name: target.name, status: target.status, branch: target.branch?.name ?? null },
        after: { name: updated.name, status: updated.status, branch: updated.branch?.name ?? null },
        ip: ctx.ip,
    });
    return toLearnerRow(updated);
}

async function setArchived(id: string, archived: boolean, ctx: ResourceContext): Promise<Row> {
    const target = await loadTarget(id, ctx);
    const updated = await prisma.learnerProfile.update({
        where: { userId: id },
        data: {
            status: archived ? "ARCHIVED" : "REGISTERED",
            user: { update: archived ? { status: "ARCHIVED", tokenVersion: { increment: 1 } } : { status: "ACTIVE" } },
        },
        include,
    });
    await writeAudit({ actorId: ctx.user.id, action: archived ? "learner.archive" : "learner.restore", entity: "User", entityId: id, before: { status: target.status }, ip: ctx.ip });
    return toLearnerRow(updated);
}

/** Sends the learner a link to choose a new password. The password itself is never shown to staff. */
async function resetPassword(id: string, ctx: ResourceContext): Promise<Row> {
    const target = await loadTarget(id, ctx);
    if (target.user.status !== "ACTIVE") throw new ValidationError({ _: "Restore the learner before sending a password reset." });
    await sendPasswordSetupEmail(target.userId, target.user.email, "reset");
    await writeAudit({ actorId: ctx.user.id, action: "learner.password_reset", entity: "User", entityId: id, ip: ctx.ip });
    return toLearnerRow(target);
}

export const learnerResource: ResourceDef = {
    key: "users/learners",
    resource: "learners",
    sortableKeys: ["name", "addedOn"],
    list,
    get: async (id, ctx) => toLearnerRow(await loadTarget(id, ctx)),
    options: async () => {
        const [cities, branches, courses, enrolled, batchRows] = await Promise.all([
            prisma.learnerProfile.findMany({ where: { city: { not: null } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
            prisma.branch.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { name: true } }),
            courseOptions(),
            prisma.enrolment.findMany({ distinct: ["courseId"], select: { courseId: true } }),
            prisma.batch.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { name: true } }),
        ]);
        const withEnrolments = new Set(enrolled.map((e) => e.courseId));
        return {
            city: cities.flatMap((c) => (c.city ? [c.city] : [])),
            branch: branches.map((b) => b.name),
            course: courses.filter((c) => withEnrolments.has(c.id)).map((c) => c.label),
            batch: batchRows.map((b) => b.name),
        };
    },
    create,
    update,
    actions: {
        archive: (id, ctx) => setArchived(id, true, ctx),
        restore: (id, ctx) => setArchived(id, false, ctx),
        "reset-password": resetPassword,
    },
};
