import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { readSiteSettings, saveSiteSettings } from "@/server/services/site-settings";

export const GET = apiHandler<Record<string, never>, "staff">(
    async ({ user }) => {
        assertCan(user, "siteContent", "read");
        return readSiteSettings();
    },
    { auth: "staff" },
);

export const PUT = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "siteContent", "write");
        return saveSiteSettings(await readJson(request), { id: user.id, ip });
    },
    { auth: "staff" },
);
