import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/server/db";

export type Option = { id: string; label: string };

/** Visible names; when two records share a name the email or slug is appended so every label identifies exactly one record. */
function uniqueLabels<T>(items: T[], name: (item: T) => string, suffix: (item: T) => string): string[] {
    const names = items.map(name);
    const counts = new Map<string, number>();
    for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
    return items.map((item, index) => ((counts.get(names[index]) ?? 0) > 1 ? `${names[index]} (${suffix(item)})` : names[index]));
}

/** Active staff for pickers (batch instructor and managers). Labels are computed over all staff so they stay stable when filtered by role. */
export async function staffOptions(roles?: Role[]): Promise<Array<Option & { role: Role }>> {
    const staff = await prisma.user.findMany({
        where: { kind: "STAFF", status: "ACTIVE" },
        select: { id: true, email: true, role: true, staffProfile: { select: { displayName: true } } },
        orderBy: { createdAt: "asc" },
    });
    const labels = uniqueLabels(staff, (s) => s.staffProfile?.displayName ?? s.email, (s) => s.email);
    return staff.map((s, index) => ({ id: s.id, label: labels[index], role: s.role })).filter((option) => !roles || roles.includes(option.role));
}

/** Courses that can still receive batches and enrolments. */
export async function courseOptions(): Promise<Option[]> {
    const courses = await prisma.course.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: { id: true, title: true, slug: true },
        orderBy: { title: "asc" },
    });
    const labels = uniqueLabels(courses, (c) => c.title, (c) => c.slug);
    return courses.map((course, index) => ({ id: course.id, label: labels[index] }));
}

export const labelMap = (options: Option[]) => new Map(options.map((option) => [option.id, option.label]));
export const idByLabel = (options: Option[], label: string) => options.find((option) => option.label === label)?.id;
