import { assertCan } from "@/server/auth/assert";
import { apiHandler, ok } from "@/server/http/handler";
import { readReportInput, runReport } from "@/server/services/analytics";

type Params = { page: string; report: string };

// One report of an analytics page: its figures, chart and one page of rows. Branch-scoped staff see only their own branches.
export const GET = apiHandler<Params, "staff">(
    async ({ request, params, user }) => {
        assertCan(user, "reports", "read");
        const result = await runReport(params.page, params.report, readReportInput(new URL(request.url).searchParams), user);
        return ok(result.data, { page: result.page, pageSize: result.pageSize, total: result.total, summary: result.summary });
    },
    { auth: "staff" },
);
