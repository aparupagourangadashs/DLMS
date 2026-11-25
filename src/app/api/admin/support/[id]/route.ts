import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { getSupportThread, updateSupportRequest } from "@/server/services/support";

export const GET = apiHandler<{ id: string }, "staff">(
    async ({ params, user }) => {
        assertCan(user, "supportRequests", "read");
        return getSupportThread(params.id);
    },
    { auth: "staff" },
);

export const PATCH = apiHandler<{ id: string }, "staff">(
    async ({ request, params, user, ip }) => {
        assertCan(user, "supportRequests", "write");
        return updateSupportRequest(params.id, await readJson(request), { id: user.id, ip });
    },
    { auth: "staff" },
);
