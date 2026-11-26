import type { Prisma } from "@/generated/prisma/client";
import { blogExcerpt, readingMinutes, type PublicBlog, type PublicBlogCard } from "@/lib/blogs";
import { toIst } from "@/lib/ist";
import { prisma } from "@/server/db";
import { NotFound, RateLimited } from "@/server/http/errors";
import { rateLimit } from "@/server/http/rate-limit";
import "server-only";

const include = {
    author: { select: { staffProfile: { select: { displayName: true } } } },
    cover: { select: { status: true } },
} satisfies Prisma.BlogInclude;
type BlogRow = Prisma.BlogGetPayload<{ include: typeof include }>;

const VIEW_WINDOW_MS = 60 * 60_000;

function toCard(row: BlogRow): PublicBlogCard {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: blogExcerpt(row.summary, row.body),
        coverUrl: row.cover?.status === "READY" ? `/api/assets/${row.coverAssetId}/file` : null,
        author: row.author?.staffProfile?.displayName ?? null,
        publishedOn: toIst(row.publishedAt ?? row.createdAt).date,
        minutes: readingMinutes(row.body),
    };
}

/** Published articles, newest first, one page at a time. A page past the end gives the last page. */
export async function listBlogs(page = 1, pageSize = 9) {
    const where: Prisma.BlogWhereInput = { status: "PUBLISHED" };
    const total = await prisma.blog.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
    const rows = await prisma.blog.findMany({ where, include, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], skip: (current - 1) * pageSize, take: pageSize });
    return { items: rows.map(toCard), total, page: current, pages };
}

/** A published article by its web address; drafts and hidden articles are not found. */
export async function getBlog(slug: string): Promise<PublicBlog | null> {
    const row = await prisma.blog.findFirst({ where: { slug, status: "PUBLISHED" }, include });
    return row ? { ...toCard(row), summary: row.summary ?? "", body: row.body } : null;
}

/** Whether the website has anything to show on its blog page, so the menu can leave the link out until it does. */
export async function hasPublishedBlogs() {
    return (await prisma.blog.findFirst({ where: { status: "PUBLISHED" }, select: { id: true } })) !== null;
}

/** Counts one view of a published article. A visitor's repeat views of the same article within the hour are not counted. */
export async function recordBlogView(slug: string, visitor: string): Promise<{ counted: boolean }> {
    const blog = await prisma.blog.findFirst({ where: { slug, status: "PUBLISHED" }, select: { id: true } });
    if (!blog) throw new NotFound();
    try {
        rateLimit(`blog-view:${visitor}:${blog.id}`, 1, VIEW_WINDOW_MS);
    } catch (error) {
        if (error instanceof RateLimited) return { counted: false };
        throw error;
    }
    // A raw update leaves `updatedAt` alone: it should change only when an editor saves.
    await prisma.$executeRaw`UPDATE \`Blog\` SET \`views\` = \`views\` + 1 WHERE \`id\` = ${blog.id} AND \`status\` = 'PUBLISHED'`;
    return { counted: true };
}
