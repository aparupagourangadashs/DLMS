import { assertCan } from "@/server/auth/assert";
import { apiHandler, ok } from "@/server/http/handler";
import { parseListQuery } from "@/server/http/list-query";
import { AUDIT_SORT_KEYS, listAuditEvents } from "@/server/services/audit-log";

// The audit log is for Super Admins only (`audit:read`); an Administrator is refused.
export const GET = apiHandler<Record<string, never>, "staff">(
    async ({ request, user }) => {
        assertCan(user, "audit", "read");
        const query = parseListQuery(new URL(request.url).searchParams, { sortableKeys: AUDIT_SORT_KEYS });
        const { rows, total } = await listAuditEvents(query);
        return ok(rows, { page: query.page, pageSize: query.pageSize, total });
    },
    { auth: "staff" },
);
