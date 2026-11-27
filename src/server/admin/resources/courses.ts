import type { Prisma } from "@/generated/prisma/client";
import type { Row } from "@/lib/admin/types";
import type { ListResult, ResourceContext, ResourceDef } from "@/server/admin/registry";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { BusinessRule, Conflict, NotFound, ValidationError } from "@/server/http/errors";
import type { ListQuery } from "@/server/http/list-query";
import { parseWith } from "@/server/http/validate";
import { z } from "zod";
import { dateOnly, httpsUrl, imageRef, isoDay, optionalHttpsUrl, optionalInt, parseRepeat, slugify, statusFromLabel, statusLabels, yesNo } from "./helpers";
import { claimImage } from "@/server/services/assets";
import { uploadedId } from "@/server/services/assets";

const include = {
    category: { select: { title: true, slug: true } },
    faqs: { orderBy: { sortOrder: "asc" } },
    modules: { orderBy: { sortOrder: "asc" }, include: { module: { select: { name: true } } } },
} satisfies Prisma.CourseInclude;
type CourseRow = Prisma.CourseGetPayload<{ include: typeof include }>;

const text = (max: number) => z.string().trim().max(max);

const faqSchema = z.object({ question: z.string().trim().min(1, "Enter the question.").max(500), answer: z.string().trim().min(1, "Enter the answer.").max(5000) });
const moduleRefSchema = z.object({ module: z.string().trim().min(1, "Choose a module.") });

const courseSchema = z
    .object({
        title: z.string().trim().min(3, "Enter the course title.").max(300),
        slug: text(200).default("").refine((v) => v === "" || /^[a-z0-9][a-z0-9_-]{1,199}$/.test(v), "Use lowercase letters, numbers, dashes and underscores."),
        category: z.string().min(1, "Choose a category."),
        language: text(40).default("Not listed"),
        format: text(80).default("Self-paced"),
        instructorName: text(200).default("Not listed"),
        duration: text(80).default("Not listed"),
        summary: z.string().trim().min(10, "Write a short summary.").max(2000),
        description: text(20000).default(""),
        isFree: yesNo.default(false),
        price: optionalInt(0, 10_000_000).default(null),
        certificateOffered: yesNo.default(false),
        startDate: dateOnly.default(null),
        endDate: dateOnly.default(null),
        scheduleNote: text(5000).default(""),
        officialUrl: httpsUrl,
        enrollmentUrl: optionalHttpsUrl.default(""),
        eligibility: text(5000).default(""),
        materials: text(5000).default(""),
        audience: text(5000).default(""),
        assessmentPlan: text(5000).default(""),
        requirements: text(5000).default(""),
        imageUrl: z.string().default(""),
        imageWidth: optionalInt(1, 10_000).default(null),
        imageHeight: optionalInt(1, 10_000).default(null),
        status: z.string().default("Draft"),
        comingSoon: yesNo.default(false),
        sortOrder: optionalInt(0, 100_000).default(null),
        faqs: z.unknown().default(""),
        modules: z.unknown().default(""),
    })
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "End date must not be before the start date." });

type CourseInput = z.output<typeof courseSchema>;

export function toCourseRow(course: CourseRow): Row {
    const assetMatch = /^\/api\/assets\/([^/]+)\/file$/.exec(course.imageUrl);
    const image = assetMatch ? JSON.stringify({ id: assetMatch[1], name: "Course image", size: 0 }) : course.imageUrl;
    return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        category: course.category.title,
        language: course.language,
        format: course.format,
        instructorName: course.instructorName,
        duration: course.duration,
        summary: course.summary,
        description: course.description ?? "",
        isFree: course.isFree ? "Yes" : "No",
        price: course.priceMinor === null ? null : course.priceMinor / 100,
        certificateOffered: course.certificateOffered ? "Yes" : "No",
        startDate: isoDay(course.startDate),
        endDate: isoDay(course.endDate),
        scheduleNote: course.scheduleNote ?? "",
        officialUrl: course.officialUrl,
        enrollmentUrl: course.enrollmentUrl ?? "",
        eligibility: course.eligibility ?? "",
        materials: course.materials ?? "",
        audience: course.audience ?? "",
        assessmentPlan: course.assessmentPlan ?? "",
        requirements: course.requirements ?? "",
        imageUrl: image,
        imageWidth: course.imageWidth,
        imageHeight: course.imageHeight,
        status: statusLabels[course.status],
        comingSoon: course.comingSoon ? "Yes" : "No",
        sortOrder: course.sortOrder,
        faqs: JSON.stringify(course.faqs.map((f) => ({ question: f.question, answer: f.answer }))),
        modules: JSON.stringify(course.modules.map((m) => ({ module: m.module.name }))),
        updatedOn: course.updatedAt.toISOString().slice(0, 10),
    };
}

async function uniqueSlug(base: string, excludeId?: string) {
    const root = slugify(base, 190) || "course";
    for (let n = 1; n < 500; n += 1) {
        const candidate = n === 1 ? root : `${root}-${n}`;
        const taken = await prisma.course.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
        if (!taken) return candidate;
    }
    throw new BusinessRule("Could not generate a unique URL name. Enter one manually.");
}

async function resolveCategory(title: string) {
    // Courses belong to a top-level collection; sub-categories only organize within it.
    const category = await prisma.category.findFirst({ where: { title, parentId: null, status: { not: "ARCHIVED" } } });
    if (!category) throw new ValidationError({ category: "Choose an existing category." });
    return category;
}

function resolveStatus(label: string) {
    const status = statusFromLabel(label);
    if (!status) throw new ValidationError({ status: "Choose Draft, Published or Archived." });
    return status;
}

async function data(input: CourseInput, ctx: ResourceContext, existing?: CourseRow): Promise<Prisma.CourseUncheckedCreateInput> {
    const category = await resolveCategory(input.category);
    const status = resolveStatus(input.status);
    const slug = input.slug ? input.slug : existing?.slug ?? (await uniqueSlug(input.title));
    if (input.slug && input.slug !== existing?.slug && (await prisma.course.findUnique({ where: { slug }, select: { id: true } }))) {
        throw new Conflict("Another course already uses this URL name.", { slug: "Already in use." });
    }
    if (input.isFree && input.price) throw new ValidationError({ price: "Leave the price empty for a free course." });
    let imageUrl = input.imageUrl;
    if (uploadedId(input.imageUrl)) {
        const assetId = await claimImage(input.imageUrl, { name: input.title, actorId: ctx.user.id, field: "imageUrl", maxBytes: 5 * 1024 * 1024 });
        imageUrl = assetId ? `/api/assets/${assetId}/file` : existing?.imageUrl ?? "";
    } else if (imageUrl) {
        const valid = imageRef.safeParse(imageUrl);
        if (!valid.success) throw new ValidationError({ imageUrl: "Use a site path or an https:// image URL, or choose an Asset Library image." });
    }
    return {
        slug,
        title: input.title,
        summary: input.summary,
        description: input.description || null,
        categoryId: category.id,
        language: input.language || "Not listed",
        format: input.format || "Self-paced",
        instructorName: input.instructorName || "Not listed",
        duration: input.duration || "Not listed",
        priceMinor: input.isFree || input.price === null ? null : input.price * 100,
        isFree: input.isFree,
        certificateOffered: input.certificateOffered,
        imageUrl,
        imageWidth: input.imageWidth ?? existing?.imageWidth ?? 1000,
        imageHeight: input.imageHeight ?? existing?.imageHeight ?? 563,
        officialUrl: input.officialUrl,
        enrollmentUrl: input.enrollmentUrl || null,
        startDate: input.startDate,
        endDate: input.endDate,
        scheduleNote: input.scheduleNote || null,
        eligibility: input.eligibility || null,
        materials: input.materials || null,
        audience: input.audience || null,
        assessmentPlan: input.assessmentPlan || null,
        requirements: input.requirements || null,
        status,
        comingSoon: input.comingSoon,
        sortOrder: input.sortOrder ?? existing?.sortOrder ?? 0,
        publishedAt: status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : null,
    };
}

const orderBy = (query: ListQuery): Prisma.CourseOrderByWithRelationInput[] => {
    const dir = query.sort?.dir ?? "asc";
    if (query.sort?.key === "title") return [{ title: dir }];
    if (query.sort?.key === "updatedOn") return [{ updatedAt: dir }];
    if (query.sort?.key === "sortOrder") return [{ sortOrder: dir }];
    return [{ sortOrder: "asc" }, { title: "asc" }];
};

function where(query: ListQuery): Prisma.CourseWhereInput[] {
    const and: Prisma.CourseWhereInput[] = [];
    if (query.q) and.push({ OR: [{ title: { contains: query.q } }, { slug: { contains: query.q } }, { instructorName: { contains: query.q } }] });
    if (query.filters.category) and.push({ category: { title: query.filters.category } });
    if (query.filters.language) and.push({ language: query.filters.language });
    return and;
}

const tabStatus = (tab?: string) => (tab ? statusFromLabel(tab) : undefined);

async function list(query: ListQuery): Promise<ListResult> {
    const base = where(query);
    const status = tabStatus(query.tab);
    const filter: Prisma.CourseWhereInput = { AND: [...base, ...(status ? [{ status }] : [])] };
    const [rows, total, grouped] = await Promise.all([
        prisma.course.findMany({ where: filter, include, orderBy: orderBy(query), skip: query.skip, take: query.take }),
        prisma.course.count({ where: filter }),
        prisma.course.groupBy({ by: ["status"], where: { AND: base }, _count: { _all: true } }),
    ]);
    const tabCounts: Record<string, number> = { Published: 0, Draft: 0, Archived: 0 };
    for (const row of grouped) tabCounts[statusLabels[row.status]] = row._count._all;
    return { rows: rows.map(toCourseRow), total, tabCounts };
}

async function load(id: string) {
    const course = await prisma.course.findUnique({ where: { id }, include });
    if (!course) throw new NotFound();
    return course;
}

async function saveFaqs(courseId: string, faqs: z.output<typeof faqSchema>[]) {
    await prisma.courseFaq.deleteMany({ where: { courseId } });
    if (faqs.length) await prisma.courseFaq.createMany({ data: faqs.map((faq, index) => ({ courseId, question: faq.question, answer: faq.answer, sortOrder: index })) });
}

/** Module names from the form, in learning order, as library ids. Checked before anything is written. */
async function resolveModules(refs: z.output<typeof moduleRefSchema>[]) {
    const names = refs.map((ref) => ref.module);
    if (new Set(names).size !== names.length) throw new ValidationError({ modules: "Each module can be added only once." });
    const found = names.length ? await prisma.module.findMany({ where: { name: { in: names } }, select: { id: true, name: true } }) : [];
    const byName = new Map(found.map((m) => [m.name, m.id]));
    const missing = names.find((name) => !byName.has(name));
    if (missing) throw new ValidationError({ modules: `"${missing}" is not in the Module Library.` });
    return names.map((name) => byName.get(name)!);
}

async function saveModules(courseId: string, moduleIds: string[]) {
    await prisma.courseModule.deleteMany({ where: { courseId } });
    if (moduleIds.length) await prisma.courseModule.createMany({ data: moduleIds.map((moduleId, index) => ({ courseId, moduleId, sortOrder: index })) });
}

async function create(input: unknown, ctx: ResourceContext): Promise<Row> {
    const parsed = parseWith(courseSchema, input);
    const faqs = parseRepeat(parsed.faqs, faqSchema, 30, "faqs");
    const moduleIds = await resolveModules(parseRepeat(parsed.modules, moduleRefSchema, 50, "modules"));
    const course = await prisma.course.create({ data: await data(parsed, ctx) });
    await saveFaqs(course.id, faqs);
    await saveModules(course.id, moduleIds);
    await writeAudit({ actorId: ctx.user.id, action: "course.create", entity: "Course", entityId: course.id, after: { title: course.title, status: course.status }, ip: ctx.ip });
    return toCourseRow(await load(course.id));
}

async function update(id: string, input: unknown, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const parsed = parseWith(courseSchema, input);
    const faqs = parseRepeat(parsed.faqs, faqSchema, 30, "faqs");
    const moduleIds = await resolveModules(parseRepeat(parsed.modules, moduleRefSchema, 50, "modules"));
    await prisma.course.update({ where: { id }, data: await data(parsed, ctx, existing) });
    await saveFaqs(id, faqs);
    await saveModules(id, moduleIds);
    const after = await load(id);
    const action = existing.status !== after.status && after.status === "PUBLISHED" ? "course.publish" : existing.status !== after.status && existing.status === "PUBLISHED" ? "course.unpublish" : "course.update";
    await writeAudit({ actorId: ctx.user.id, action, entity: "Course", entityId: id, before: { title: existing.title, status: existing.status }, after: { title: after.title, status: after.status }, ip: ctx.ip });
    return toCourseRow(after);
}

async function archive(id: string, ctx: ResourceContext): Promise<Row> {
    const existing = await load(id);
    const updated = await prisma.course.update({ where: { id }, data: { status: "ARCHIVED" }, include });
    await writeAudit({ actorId: ctx.user.id, action: existing.status === "PUBLISHED" ? "course.unpublish" : "course.archive", entity: "Course", entityId: id, ip: ctx.ip });
    return toCourseRow(updated);
}

async function duplicate(id: string, ctx: ResourceContext): Promise<Row> {
    const source = await load(id);
    const slug = await uniqueSlug(`${source.slug}-copy`);
    const copy = await prisma.course.create({
        data: {
            slug, title: `${source.title} (copy)`, summary: source.summary, description: source.description, categoryId: source.categoryId,
            language: source.language, format: source.format, instructorName: source.instructorName, duration: source.duration,
            priceMinor: source.priceMinor, currency: source.currency, isFree: source.isFree, certificateOffered: source.certificateOffered,
            imageUrl: source.imageUrl, imageWidth: source.imageWidth, imageHeight: source.imageHeight, officialUrl: source.officialUrl,
            enrollmentUrl: source.enrollmentUrl, startDate: source.startDate, endDate: source.endDate, scheduleNote: source.scheduleNote,
            eligibility: source.eligibility, materials: source.materials, audience: source.audience, assessmentPlan: source.assessmentPlan,
            requirements: source.requirements, status: "DRAFT", comingSoon: source.comingSoon, sortOrder: source.sortOrder,
        },
    });
    await saveFaqs(copy.id, source.faqs.map((f) => ({ question: f.question, answer: f.answer })));
    await saveModules(copy.id, source.modules.map((m) => m.moduleId));
    await writeAudit({ actorId: ctx.user.id, action: "course.create", entity: "Course", entityId: copy.id, after: { duplicatedFrom: id }, ip: ctx.ip });
    return toCourseRow(await load(copy.id));
}

async function remove(id: string, ctx: ResourceContext) {
    const existing = await load(id);
    if (existing.status === "PUBLISHED") throw new BusinessRule("Archive a published course instead of deleting it.");
    await prisma.course.delete({ where: { id } });
    await writeAudit({ actorId: ctx.user.id, action: "course.delete", entity: "Course", entityId: id, before: { title: existing.title }, ip: ctx.ip });
}

export const courseResource: ResourceDef = {
    key: "products/courses",
    resource: "courses",
    sortableKeys: ["title", "updatedOn", "sortOrder"],
    list,
    get: async (id) => toCourseRow(await load(id)),
    options: async () => {
        const [categories, languages, modules] = await Promise.all([
            prisma.category.findMany({ where: { parentId: null, status: { not: "ARCHIVED" } }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { title: true } }),
            prisma.course.findMany({ distinct: ["language"], select: { language: true }, orderBy: { language: "asc" } }),
            prisma.module.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { name: true } }),
        ]);
        return { category: categories.map((c) => c.title), language: languages.map((l) => l.language), "modules.module": modules.map((m) => m.name) };
    },
    create,
    update,
    remove,
    actions: { archive, duplicate },
};
