import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { cancelSession } from "@/server/services/sessions";

export const POST = apiHandler<{ id: string }, "staff">(
    async ({ request, params, user, ip }) => {
        assertCan(user, "sessions", "write");
        return cancelSession(params.id, await readJson(request), { id: user.id, ip, role: user.role, branchIds: user.branchIds });
    },
    { auth: "staff" },
);
