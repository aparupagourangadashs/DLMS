import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { auditFilterOptions } from "@/server/services/audit-log";

export const GET = apiHandler<Record<string, never>, "staff">(
    async ({ user }) => {
        assertCan(user, "audit", "read");
        return auditFilterOptions();
    },
    { auth: "staff" },
);
