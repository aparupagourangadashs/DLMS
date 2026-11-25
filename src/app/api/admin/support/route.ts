import { assertCan } from "@/server/auth/assert";
import { apiHandler, ok } from "@/server/http/handler";
import { parseListQuery } from "@/server/http/list-query";
import { listSupportRequests } from "@/server/services/support";

export const GET = apiHandler<Record<string, never>, "staff">(
    async ({ request, user }) => {
        assertCan(user, "supportRequests", "read");
        const query = parseListQuery(new URL(request.url).searchParams);
        const { rows, total, tabCounts } = await listSupportRequests(query);
        return ok(rows, { page: query.page, pageSize: query.pageSize, total, tabCounts });
    },
    { auth: "staff" },
);
