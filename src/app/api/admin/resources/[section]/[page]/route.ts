import { getResource } from "@/server/admin/resources";
import { assertCan } from "@/server/auth/assert";
import { NotFound } from "@/server/http/errors";
import { apiHandler, created, ok } from "@/server/http/handler";
import { parseListQuery } from "@/server/http/list-query";
import { readJson } from "@/server/http/validate";

type Params = { section: string; page: string };

export const GET = apiHandler<Params, "staff">(
  async ({ request, params, user, ip }) => {
    const def = getResource(`${params.section}/${params.page}`);
    assertCan(user, def.resource, "read");
    const query = parseListQuery(new URL(request.url).searchParams, { sortableKeys: def.sortableKeys });
    const { rows, total, tabCounts, summary } = await def.list(query, { user, ip });
    return ok(rows, { page: query.page, pageSize: query.pageSize, total, ...(tabCounts ? { tabCounts } : {}), ...(summary ? { summary } : {}) });
  },
  { auth: "staff" },
);

export const POST = apiHandler<Params, "staff">(
  async ({ request, params, user, ip }) => {
    const def = getResource(`${params.section}/${params.page}`);
    if (!def.create) throw new NotFound();
    assertCan(user, def.resource, "write");
    return created(await def.create(await readJson(request), { user, ip }));
  },
  { auth: "staff" },
);
