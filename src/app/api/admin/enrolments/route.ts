import { assertCan } from "@/server/auth/assert";
import { apiHandler, created, ok } from "@/server/http/handler";
import { parseWith, readJson } from "@/server/http/validate";
import { enrolByEmail } from "@/server/services/enrolments";
import { z } from "zod";

const schema = z.object({
    email: z.string().trim().min(1, "Enter the learner's email."),
    name: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(20).optional(),
    batchId: z.string().min(1, "Choose a batch."),
});

// Single enrolment; an unknown email needs a name and creates the account too.
export const POST = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "enrolments", "write");
        const input = parseWith(schema, await readJson(request));
        const outcome = await enrolByEmail({ ...input, source: "ADMIN", commit: true }, { id: user.id, ip, role: user.role, branchIds: user.branchIds });
        return outcome.status === "enrolled" ? created(outcome) : ok(outcome);
    },
    { auth: "staff" },
);
