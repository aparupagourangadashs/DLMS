import { defaultSiteSettings, siteSettingKeys, type SiteSettingKey, type SiteSettings } from "@/lib/website/site-defaults";
import type { PublicLegalDocument } from "@/lib/website/types";
import { prisma } from "@/server/db";
import { cache } from "react";
import "server-only";

/** Stored settings override the defaults key by key, so a missing or partial row never breaks the site. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...siteSettingKeys] } } });
    const merged: Record<string, unknown> = { ...defaultSiteSettings };
    for (const row of rows) {
        const fallback = defaultSiteSettings[row.key as SiteSettingKey];
        const value = row.value;
        if (Array.isArray(fallback)) merged[row.key] = Array.isArray(value) ? value : fallback;
        else if (value && typeof value === "object" && !Array.isArray(value)) merged[row.key] = { ...fallback, ...value };
    }
    return merged as SiteSettings;
});

export async function getLegalDocument(type: "TERMS" | "PRIVACY"): Promise<PublicLegalDocument | null> {
    const doc = await prisma.legalDocument.findFirst({ where: { type, status: "PUBLISHED" }, orderBy: { version: "desc" } });
    if (!doc) return null;
    return { title: doc.title, body: doc.body, version: doc.version, publishedAt: doc.publishedAt?.toISOString().slice(0, 10) ?? null };
}
