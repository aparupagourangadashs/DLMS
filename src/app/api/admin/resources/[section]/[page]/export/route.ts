import { getListConfig } from "@/lib/admin/list-configs";
import type { Row } from "@/lib/admin/types";
import { toCsv } from "@/server/admin/csv";
import { getResource } from "@/server/admin/resources";
import { writeAudit } from "@/server/audit";
import { assertCan } from "@/server/auth/assert";
import { NotFound } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { parseListQuery } from "@/server/http/list-query";

type Params = { section: string; page: string };

const MAX_EXPORT_ROWS = 10_000;
const BATCH = 500;

// Exports every row matching the filters (not just the visible page) and is audited.
export const GET = apiHandler<Params, "staff">(
  async ({ request, params, user, ip }) => {
    const key = `${params.section}/${params.page}`;
    const def = getResource(key);
    const config = getListConfig(key);
    if (!config?.exportable) throw new NotFound();
    assertCan(user, def.resource, "export");

    const search = new URL(request.url).searchParams;
    const rows: Row[] = [];
    for (let page = 1; rows.length < MAX_EXPORT_ROWS; page += 1) {
      search.set("page", String(page));
      search.set("pageSize", String(BATCH));
      const query = parseListQuery(search, { sortableKeys: def.sortableKeys, maxPageSize: BATCH });
      const result = await def.list(query, { user, ip });
      rows.push(...result.rows);
      if (rows.length >= result.total || result.rows.length === 0) break;
    }

    const columns = config.columns;
    const body = toCsv(columns.map((c) => c.label), rows.slice(0, MAX_EXPORT_ROWS).map((row) => columns.map((c) => row[c.key] ?? null)));
    await writeAudit({ actorId: user.id, action: "export", entity: key, after: { rows: Math.min(rows.length, MAX_EXPORT_ROWS) }, ip });
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${params.page}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { auth: "staff" },
);
