import { apiHandler, created } from "@/server/http/handler";
import { rateLimit } from "@/server/http/rate-limit";
import { readJson } from "@/server/http/validate";
import { createSupportRequest, listMySupportRequests } from "@/server/services/support";

export const GET = apiHandler<Record<string, never>, "learner">(async ({ user }) => listMySupportRequests(user.id), { auth: "learner" });

export const POST = apiHandler<Record<string, never>, "learner">(
    async ({ request, user, ip }) => {
        rateLimit(`support:${user.id}`, 5, 60 * 60_000);
        return created(await createSupportRequest(user, await readJson(request), ip));
    },
    { auth: "learner", rateLimit: { key: "support-ip", limit: 20, windowMs: 60 * 60_000 } },
);
