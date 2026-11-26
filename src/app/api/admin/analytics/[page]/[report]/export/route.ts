import { toCsv } from "@/server/admin/csv";
import { writeAudit } from "@/server/audit";
import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { exportReport, readReportInput } from "@/server/services/analytics";

type Params = { page: string; report: string };

// Every row the filters and the search match, not just the visible page. Exports are audited.
export const GET = apiHandler<Params, "staff">(
    async ({ request, params, user, ip }) => {
        assertCan(user, "reports", "export");
        const file = await exportReport(params.page, params.report, readReportInput(new URL(request.url).searchParams), user);
        await writeAudit({ actorId: user.id, action: "export", entity: `analytics/${params.page}/${params.report}`, after: { rows: file.count, from: file.query.from, to: file.query.to }, ip });
        return new Response(toCsv(file.headers, file.rows), {
            headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file.filename}"`, "Cache-Control": "no-store" },
        });
    },
    { auth: "staff" },
);
