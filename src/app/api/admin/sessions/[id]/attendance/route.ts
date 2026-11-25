import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { markAttendance } from "@/server/services/sessions";

export const PUT = apiHandler<{ id: string }, "staff">(
    async ({ request, params, user, ip }) => {
        assertCan(user, "sessions", "write");
        return markAttendance(params.id, await readJson(request), { id: user.id, ip, role: user.role, branchIds: user.branchIds });
    },
    { auth: "staff" },
);
