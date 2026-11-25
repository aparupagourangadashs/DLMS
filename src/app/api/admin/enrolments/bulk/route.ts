import type { EnrolRowResult } from "@/lib/admin/enrolment-types";
import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { parseWith, readJson } from "@/server/http/validate";
import { enrolRows, parseEmailList, parseEnrolmentFile } from "@/server/services/enrolments";
import { z } from "zod";

const schema = z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("emails"), emails: z.string().max(100_000), batchId: z.string().min(1, "Choose a batch."), commit: z.boolean().default(false) }),
    z.object({ mode: z.literal("csv"), csv: z.string().max(900_000), commit: z.boolean().default(false) }),
]);

const summarize = (results: EnrolRowResult[]) => ({
    total: results.length,
    ready: results.filter((r) => r.status === "ready").length,
    enrolled: results.filter((r) => r.status === "enrolled").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    newAccounts: results.filter((r) => r.newAccount && (r.status === "ready" || r.status === "enrolled")).length,
});

// Many learners at once. With commit=false nothing is written and every row is only checked.
export const POST = apiHandler<Record<string, never>, "staff">(
    async ({ request, user, ip }) => {
        assertCan(user, "enrolments", "write");
        const input = parseWith(schema, await readJson(request));
        const rows = input.mode === "emails" ? parseEmailList(input.emails) : parseEnrolmentFile(input.csv);
        const results = await enrolRows(
            rows,
            { commit: input.commit, source: "BULK", fixedBatchId: input.mode === "emails" ? input.batchId : undefined, deriveNames: input.mode === "emails" },
            { id: user.id, ip, role: user.role, branchIds: user.branchIds },
        );
        return { results, summary: summarize(results) };
    },
    { auth: "staff" },
);
