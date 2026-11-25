import { assertCan } from "@/server/auth/assert";
import { apiHandler, created } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { replyToSupportRequest } from "@/server/services/support";

export const POST = apiHandler<{ id: string }, "staff">(
    async ({ request, params, user, ip }) => {
        assertCan(user, "supportRequests", "write");
        return created(await replyToSupportRequest(params.id, await readJson(request), { id: user.id, ip }));
    },
    { auth: "staff" },
);
