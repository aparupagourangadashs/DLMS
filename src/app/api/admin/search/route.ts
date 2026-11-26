import { apiHandler } from "@/server/http/handler";
import { rateLimit } from "@/server/http/rate-limit";
import { searchRecords } from "@/server/services/search";

// Records from the screens the signed-in staff member may open; the palette adds the page names itself.
export const GET = apiHandler<Record<string, never>, "staff">(
    async ({ request, user }) => {
        rateLimit(`admin-search:${user.id}`, 120, 60_000);
        const groups = await searchRecords(new URL(request.url).searchParams.get("q") ?? "", user);
        return { groups };
    },
    { auth: "staff" },
);
