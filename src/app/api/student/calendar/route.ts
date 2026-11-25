import { ValidationError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { listMySessions } from "@/server/services/learner-learning";

// The learner's own sessions between two IST dates (inclusive). Join links appear only in the join window.
export const GET = apiHandler<Record<string, never>, "learner">(
    async ({ request, user }) => {
        const params = new URL(request.url).searchParams;
        const from = params.get("from");
        const to = params.get("to");
        if (!from || !to) throw new ValidationError({ from: "Give a from and to date." });
        return listMySessions(user.id, { from, to });
    },
    { auth: "learner" },
);
