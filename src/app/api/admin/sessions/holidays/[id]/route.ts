import { assertCan } from "@/server/auth/assert";
import { apiHandler, noContent } from "@/server/http/handler";
import { removeHoliday } from "@/server/services/sessions";

export const DELETE = apiHandler<{ id: string }, "staff">(
    async ({ params, user, ip }) => {
        assertCan(user, "sessions", "write");
        await removeHoliday(params.id, { id: user.id, ip, role: user.role, branchIds: user.branchIds });
        return noContent();
    },
    { auth: "staff" },
);
