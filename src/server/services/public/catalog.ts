import type { Prisma } from "@/generated/prisma/client";
import type { PublicCollection, PublicCourse, PublicCourseDetail } from "@/lib/website/types";
import { prisma } from "@/server/db";
import { cache } from "react";
import "server-only";

export const COURSE_PLACEHOLDER = "/website/course-placeholder.svg";

const withCategory = { category: true } satisfies Prisma.CourseInclude;
type CourseRow = Prisma.CourseGetPayload<{ include: typeof withCategory }>;

// Visitors only ever see published courses in published top-level categories.
const visibleCourse: Prisma.CourseWhereInput = { status: "PUBLISHED", category: { status: "PUBLISHED", parentId: null } };

function toCourse(course: CourseRow): PublicCourse {
    return {
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        collection: course.category.slug,
        language: course.language,
        mode: course.format,
        duration: course.duration,
        instructor: course.instructorName,
        color: course.category.color,
        officialUrl: course.officialUrl,
        image: { src: course.imageUrl || COURSE_PLACEHOLDER, width: course.imageWidth, height: course.imageHeight },
    };
}

const isoDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

function priceLabel(course: CourseRow) {
    if (course.isFree) return "Free";
    if (course.priceMinor === null) return null;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: course.currency, maximumFractionDigits: 0 }).format(course.priceMinor / 100);
}

export const listCollections = cache(async (): Promise<PublicCollection[]> => {
    const rows = await prisma.category.findMany({ where: { parentId: null, status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
    return rows.map((row) => ({ slug: row.slug, title: row.title, short: row.shortLabel ?? "", description: row.description, color: row.color }));
});

export const listCourses = cache(async (collection?: string): Promise<PublicCourse[]> => {
    const rows = await prisma.course.findMany({
        where: { ...visibleCourse, ...(collection ? { category: { slug: collection, status: "PUBLISHED", parentId: null } } : {}) },
        include: withCategory,
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return rows.map(toCourse);
});

export async function getCourseDetail(slug: string): Promise<PublicCourseDetail | null> {
    const course = await prisma.course.findFirst({
        where: { slug, ...visibleCourse },
        include: { ...withCategory, faqs: { orderBy: { sortOrder: "asc" } } },
    });
    if (!course) return null;
    return {
        ...toCourse(course),
        description: course.description,
        priceLabel: priceLabel(course),
        certificateOffered: course.certificateOffered,
        comingSoon: course.comingSoon,
        enrollmentUrl: course.enrollmentUrl,
        startDate: isoDate(course.startDate),
        endDate: isoDate(course.endDate),
        scheduleNote: course.scheduleNote,
        eligibility: course.eligibility,
        materials: course.materials,
        audience: course.audience,
        assessmentPlan: course.assessmentPlan,
        requirements: course.requirements,
        faqs: course.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
    };
}
