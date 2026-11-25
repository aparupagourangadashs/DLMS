import { assertCan } from "@/server/auth/assert";
import { ValidationError } from "@/server/http/errors";
import { apiHandler, created, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { createSessions, listSessions } from "@/server/services/sessions";

const actorOf = (user: { id: string; role: string; branchIds: string[] }, ip: string) => ({ id: user.id, ip, role: user.role, branchIds: user.branchIds });

// Sessions and holidays between two IST dates (inclusive), for the calendar views.
export const GET = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "sessions", "read");
        const params = new URL(request.url).searchParams;
        const from = params.get("from");
        const to = params.get("to");
        if (!from || !to) throw new ValidationError({ from: "Give a from and to date." });
        return ok(await listSessions({ from, to, batchId: params.get("batch") ?? undefined }, actorOf(user, ip)));
    },
    { auth: "staff" },
);

export const POST = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "sessions", "write");
        return created(await createSessions(await readJson(request), actorOf(user, ip)));
    },
    { auth: "staff" },
);
