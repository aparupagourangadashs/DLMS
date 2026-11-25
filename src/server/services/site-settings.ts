import { siteSettingKeys, type SiteSettings } from "@/lib/website/site-defaults";
import { httpsUrl, optionalHttpsUrl } from "@/server/admin/resources/helpers";
import { writeAudit } from "@/server/audit";
import { prisma } from "@/server/db";
import { parseWith } from "@/server/http/validate";
import { getSiteSettings } from "@/server/services/public/site";
import { z } from "zod";

export const socialIcons = ["instagram", "facebook", "linkedin", "x", "whatsapp", "youtube", "telegram"] as const;
export const figureColors = ["teal", "gold", "blue", "rose"] as const;

const settingsSchema = z.object({
    contact: z.object({
        email: z.email("Enter a valid email address.").max(254),
        phone: z.string().trim().min(5, "Enter the phone number.").max(30),
        phoneDial: z.string().trim().regex(/^\+\d{6,15}$/, "Use the international form, for example +919528006565."),
        address: z.string().trim().max(300).default(""),
        mapUrl: optionalHttpsUrl.default(""),
        officialContactUrl: httpsUrl,
    }),
    social: z.array(z.object({ icon: z.enum(socialIcons), label: z.string().trim().min(1).max(40), href: httpsUrl })).max(12),
    links: z.object({
        donate: httpsUrl, officialSite: httpsUrl, officialBooks: httpsUrl, app: httpsUrl,
        whatsappCommunity: httpsUrl, telegramCommunity: httpsUrl, videoPlaylist: httpsUrl, testimonialsSource: httpsUrl,
    }),
    hero: z.object({
        reportedLearners: z.string().trim().min(1, "Enter the figure.").max(20),
        stats: z.array(z.object({
            value: z.coerce.number().int("Use a whole number.").min(0).max(1_000_000_000),
            suffix: z.string().trim().max(3),
            label: z.string().trim().min(1).max(40),
            detail: z.string().trim().max(80),
        })).max(6),
    }),
    communityFigures: z.array(z.object({ value: z.string().trim().min(1).max(20), label: z.string().trim().min(1).max(40), color: z.enum(figureColors) })).max(8),
});

export const readSiteSettings = getSiteSettings;

export async function saveSiteSettings(input: unknown, actor: { id: string; ip: string }): Promise<SiteSettings> {
    const next = parseWith(settingsSchema, input) as SiteSettings;
    const before = await getSiteSettings();
    await prisma.$transaction(
        siteSettingKeys.map((key) =>
            prisma.siteSetting.upsert({
                where: { key },
                update: { value: next[key] as object, updatedById: actor.id },
                create: { key, value: next[key] as object, updatedById: actor.id },
            }),
        ),
    );
    const changed = siteSettingKeys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(next[key]));
    await writeAudit({ actorId: actor.id, action: "settings.website", entity: "SiteSetting", after: { changed }, ip: actor.ip });
    return next;
}
