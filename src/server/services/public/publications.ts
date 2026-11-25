import type { PublicBook, PublicMagazine } from "@/lib/website/types";
import { prisma } from "@/server/db";
import "server-only";

export async function listBooks(): Promise<PublicBook[]> {
    const rows = await prisma.book.findMany({
        where: { status: "PUBLISHED" },
        include: { links: { orderBy: { id: "asc" } } },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return rows.map((book) => ({
        id: book.id,
        title: book.title,
        language: book.language,
        image: { src: book.imageUrl || "/website/course-placeholder.svg", width: book.imageWidth, height: book.imageHeight },
        links: book.links.map((link) => ({ format: link.format, retailer: link.retailer, url: link.url })),
    }));
}

export async function listMagazines(): Promise<PublicMagazine[]> {
    const rows = await prisma.magazine.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ issueDate: "desc" }, { sortOrder: "asc" }] });
    return rows.map((issue) => ({
        id: issue.id,
        title: issue.title,
        issueLabel: issue.issueLabel,
        issueDate: issue.issueDate?.toISOString().slice(0, 10) ?? null,
        language: issue.language,
        cover: issue.coverUrl,
        url: issue.fileUrl,
    }));
}
