import type { PublicPerson, PublicTestimonial, PublicVideo } from "@/lib/website/types";
import { prisma } from "@/server/db";
import "server-only";

export async function listTestimonials(): Promise<PublicTestimonial[]> {
    const rows = await prisma.testimonial.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return rows.map((row) => ({ id: row.id, name: row.name, image: row.imageUrl, excerpt: row.quote, sourceUrl: row.sourceUrl }));
}

export async function listVideos(): Promise<PublicVideo[]> {
    const rows = await prisma.video.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    return rows.map((row) => ({ id: row.id, youtubeId: row.youtubeId, speaker: row.speaker, title: row.title, image: row.thumbnailUrl }));
}

export async function listPeople(group: "ADVISORY" | "TEAM"): Promise<PublicPerson[]> {
    const rows = await prisma.person.findMany({ where: { group, status: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return rows.map((row) => ({ id: row.id, name: row.name, roleTitle: row.roleTitle, bio: row.bio, image: row.imageUrl }));
}
