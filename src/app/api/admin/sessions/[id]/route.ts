import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { getSessionDetail, updateSession } from "@/server/services/sessions";

type Params = { id: string };
const actorOf = (user: { id: string; role: string; branchIds: string[] }, ip: string) => ({ id: user.id, ip, role: user.role, branchIds: user.branchIds });

export const GET = apiHandler<Params, "staff">(
    async ({ params, user, ip }) => {
        assertCan(user, "sessions", "read");
        return getSessionDetail(params.id, actorOf(user, ip));
    },
    { auth: "staff" },
);

export const PATCH = apiHandler<Params, "staff">(
    async ({ request, params, user, ip }) => {
        assertCan(user, "sessions", "write");
        return updateSession(params.id, await readJson(request), actorOf(user, ip));
    },
    { auth: "staff" },
);
