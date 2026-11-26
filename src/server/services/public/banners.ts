import type { BannerPlacement } from "@/generated/prisma/client";
import type { PublicBanner } from "@/lib/banners";
import { istToday } from "@/lib/ist";
import { prisma } from "@/server/db";
import "server-only";

/** The banners for a page that are showing today (an IST day): published, inside their window, with their image ready. */
export async function listBanners(placement: BannerPlacement, now = new Date(), limit = 8): Promise<PublicBanner[]> {
    const today = new Date(`${istToday(now)}T00:00:00Z`);
    const rows = await prisma.banner.findMany({
        where: {
            placement,
            status: "PUBLISHED",
            image: { status: "READY" },
            AND: [{ OR: [{ startsOn: null }, { startsOn: { lte: today } }] }, { OR: [{ endsOn: null }, { endsOn: { gte: today } }] }],
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: limit,
    });
    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        imageUrl: `/api/assets/${row.imageAssetId}/file`,
        href: row.linkUrl,
        external: Boolean(row.linkUrl?.startsWith("https://")),
    }));
}
