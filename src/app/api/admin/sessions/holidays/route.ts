import { assertCan } from "@/server/auth/assert";
import { apiHandler, created } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { markHoliday } from "@/server/services/sessions";

export const POST = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "sessions", "write");
        return created(await markHoliday(await readJson(request), { id: user.id, ip, role: user.role, branchIds: user.branchIds }));
    },
    { auth: "staff" },
);
