import type { ContentType, EnrolmentStatus, Prisma } from "@/generated/prisma/client";
import { formatBytes } from "@/lib/admin/assets";
import { istToday } from "@/lib/ist";
import type { CourseOutline, CourseProgress, LessonDetail, LessonKind } from "@/lib/student/learning-types";
import { youtubeEmbedUrl, youtubeId } from "@/lib/video";
import { prisma } from "@/server/db";
import { NotFound } from "@/server/http/errors";
import { fileKind, findStoredAsset } from "./assets";

const kindOf: Record<ContentType, LessonKind> = { TEXT: "Text", VIDEO: "Video", LINK: "Link", FILE: "File" };

/** Enrolments that open a course's content: active or completed, and inside any access dates. */
export function accessWhere(userId: string, today: string): Prisma.EnrolmentWhereInput {
    const day = new Date(`${today}T00:00:00Z`);
    return {
        userId,
        status: { in: ["ACTIVE", "COMPLETED"] },
        AND: [{ OR: [{ accessStartsAt: null }, { accessStartsAt: { lte: day } }] }, { OR: [{ accessEndsAt: null }, { accessEndsAt: { gte: day } }] }],
    };
}

/** The lessons that count towards a course: those in its published modules. */
const countedLessons = (courseId: string): Prisma.ModuleContentWhereInput => ({ module: { status: "PUBLISHED", courses: { some: { courseId } } } });

/** Whole percent, and 100 only when every lesson is done. */
export const percentOf = (done: number, total: number) => (total === 0 ? 0 : Math.floor((100 * Math.min(done, total)) / total));

type EnrolmentState = { id: string; status: EnrolmentStatus; progressPercent: number };

function summarize(total: number, done: number, enrolment: EnrolmentState): CourseProgress {
    const completed = Math.min(done, total);
    return {
        progressPercent: percentOf(completed, total),
        completedLessons: completed,
        totalLessons: total,
        status: enrolment.status === "COMPLETED" || (total > 0 && completed === total) ? "Completed" : "Active",
    };
}

/** Keeps the stored percentage (used by batch averages) and the completed status in step with what the learner has done. */
async function persist(enrolment: EnrolmentState, progress: CourseProgress) {
    const becameComplete = progress.status === "Completed" && enrolment.status === "ACTIVE";
    if (progress.progressPercent === enrolment.progressPercent && !becameComplete) return;
    await prisma.enrolment.update({ where: { id: enrolment.id }, data: { progressPercent: progress.progressPercent, ...(becameComplete ? { status: "COMPLETED" } : {}) } });
}

/** The course's published modules and lessons in learning order, with what this learner has completed. Only enrolled learners may open it. */
export async function getCourseOutline(userId: string, slug: string, now = new Date()): Promise<CourseOutline> {
    const enrolment = await prisma.enrolment.findFirst({
        where: { ...accessWhere(userId, istToday(now)), course: { slug } },
        orderBy: [{ status: "asc" }, { enrolledAt: "desc" }],
        include: { course: { select: { slug: true, title: true } }, batch: { select: { name: true, modules: { orderBy: { sortOrder: "asc" }, select: { moduleId: true } } } } },
    });
    if (!enrolment) throw new NotFound();

    const batchModuleIds = enrolment.batch?.modules.map((entry) => entry.moduleId) ?? [];
    const [linkedModules, completed] = await Promise.all([
        batchModuleIds.length
            ? prisma.module.findMany({
                where: { id: { in: batchModuleIds }, status: "PUBLISHED" },
                select: { id: true, name: true, description: true, contents: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, type: true, minutes: true } } },
            })
            : prisma.courseModule.findMany({
                where: { courseId: enrolment.courseId, module: { status: "PUBLISHED" } },
                orderBy: { sortOrder: "asc" },
                include: { module: { select: { id: true, name: true, description: true, contents: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, type: true, minutes: true } } } } },
            }).then((rows) => rows.map((row) => row.module)),
        prisma.lessonProgress.findMany({ where: { enrolmentId: enrolment.id }, select: { contentId: true } }),
    ]);
    const moduleById = new Map(linkedModules.map((module) => [module.id, module]));
    const orderedModules = batchModuleIds.length
        ? batchModuleIds.map((id) => moduleById.get(id)).filter((module): module is (typeof linkedModules)[number] => Boolean(module))
        : linkedModules;
    const done = new Set(completed.map((c) => c.contentId));
    const modules = orderedModules
        .map((module) => ({
            id: module.id,
            name: module.name,
            description: module.description ?? "",
            lessons: module.contents.map((l) => ({ id: l.id, title: l.title, type: kindOf[l.type], minutes: l.minutes, completed: done.has(l.id) })),
        }))
        .filter((module) => module.lessons.length > 0);
    const lessons = modules.flatMap((m) => m.lessons);
    const progress = summarize(lessons.length, lessons.filter((l) => l.completed).length, enrolment);
    await persist(enrolment, progress);
    return {
        ...progress,
        slug: enrolment.course.slug,
        title: enrolment.course.title,
        batch: enrolment.batch?.name ?? "",
        modules,
        resumeLessonId: (lessons.find((l) => !l.completed) ?? lessons.at(-1))?.id ?? null,
    };
}

/** A lesson the learner may open: in a published module of a course they are currently enrolled in. */
async function accessibleLesson(userId: string, lessonId: string, now: Date) {
    const today = istToday(now);
    const lesson = await prisma.moduleContent.findFirst({
        where: { id: lessonId, module: { status: "PUBLISHED", courses: { some: { course: { enrolments: { some: accessWhere(userId, today) } } } } } },
        include: { module: { select: { name: true } }, asset: { select: { name: true, fileName: true, type: true, sizeBytes: true, status: true } } },
    });
    if (!lesson) throw new NotFound();
    const enrolment = await prisma.enrolment.findFirst({
        where: { ...accessWhere(userId, today), course: { modules: { some: { moduleId: lesson.moduleId } } } },
        orderBy: [{ status: "asc" }, { enrolledAt: "desc" }],
        include: { batch: { select: { modules: { select: { moduleId: true } } } } },
    });
    if (!enrolment) throw new NotFound();
    const batchModuleIds = enrolment.batch?.modules.map((entry) => entry.moduleId) ?? [];
    if (batchModuleIds.length && !batchModuleIds.includes(lesson.moduleId)) throw new NotFound();
    return { lesson, enrolment };
}

export async function getLesson(userId: string, lessonId: string, now = new Date()): Promise<LessonDetail> {
    const { lesson, enrolment } = await accessibleLesson(userId, lessonId, now);
    const done = await prisma.lessonProgress.findUnique({ where: { enrolmentId_contentId: { enrolmentId: enrolment.id, contentId: lesson.id } }, select: { completedAt: true } });
    const id = lesson.type === "VIDEO" ? youtubeId(lesson.url ?? "") : null;
    const asset = lesson.type === "FILE" && lesson.asset?.status === "READY" && lesson.asset.sizeBytes !== null ? lesson.asset : null;
    return {
        id: lesson.id,
        title: lesson.title,
        type: kindOf[lesson.type],
        minutes: lesson.minutes,
        moduleName: lesson.module.name,
        body: lesson.type === "TEXT" ? lesson.body ?? "" : "",
        url: lesson.type === "VIDEO" ? (id ? youtubeEmbedUrl(id) : "") : lesson.type === "LINK" ? lesson.url ?? "" : "",
        file: asset ? { name: asset.fileName ?? asset.name, kind: fileKind(asset.type), size: formatBytes(asset.sizeBytes!), url: `/api/student/lessons/${lesson.id}/file` } : null,
        completed: done !== null,
    };
}

/** The stored file of a file lesson, for a learner who may open that lesson. */
export async function openLessonFile(userId: string, lessonId: string, now = new Date()) {
    const { lesson } = await accessibleLesson(userId, lessonId, now);
    const asset = lesson.type === "FILE" && lesson.assetId ? await findStoredAsset(lesson.assetId) : null;
    if (!asset) throw new NotFound();
    return asset;
}

/** Marks a lesson complete (again is harmless) and reports the course progress. Opening a lesson never completes it. */
export async function completeLesson(userId: string, lessonId: string, now = new Date()): Promise<CourseProgress & { lessonId: string }> {
    const { lesson, enrolment } = await accessibleLesson(userId, lessonId, now);
    await prisma.lessonProgress.upsert({
        where: { enrolmentId_contentId: { enrolmentId: enrolment.id, contentId: lesson.id } },
        create: { enrolmentId: enrolment.id, contentId: lesson.id },
        update: {},
    });
    const batchModuleIds = (enrolment as typeof enrolment & { batch?: { modules: Array<{ moduleId: string }> } }).batch?.modules.map((entry) => entry.moduleId) ?? [];
    const lessonWhere: Prisma.ModuleContentWhereInput = batchModuleIds.length
        ? { moduleId: { in: batchModuleIds }, module: { status: "PUBLISHED" } }
        : countedLessons(enrolment.courseId);
    const [total, done] = await Promise.all([
        prisma.moduleContent.count({ where: lessonWhere }),
        prisma.lessonProgress.count({ where: { enrolmentId: enrolment.id, content: lessonWhere } }),
    ]);
    const progress = summarize(total, done, enrolment);
    await persist(enrolment, progress);
    return { ...progress, lessonId: lesson.id };
}
