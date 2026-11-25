import { getResource } from "@/server/admin/resources";
import { assertCan } from "@/server/auth/assert";
import { NotFound } from "@/server/http/errors";
import { apiHandler, noContent, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";

type Params = { section: string; page: string; id: string };

export const GET = apiHandler<Params, "staff">(
  async ({ params, user, ip }) => {
    const def = getResource(`${params.section}/${params.page}`);
    if (!def.get) throw new NotFound();
    assertCan(user, def.resource, "read");
    return ok(await def.get(params.id, { user, ip }));
  },
  { auth: "staff" },
);

export const PATCH = apiHandler<Params, "staff">(
  async ({ request, params, user, ip }) => {
    const def = getResource(`${params.section}/${params.page}`);
    if (!def.update) throw new NotFound();
    assertCan(user, def.resource, "write");
    return ok(await def.update(params.id, await readJson(request), { user, ip }));
  },
  { auth: "staff" },
);

export const DELETE = apiHandler<Params, "staff">(
  async ({ params, user, ip }) => {
    const def = getResource(`${params.section}/${params.page}`);
    if (!def.remove) throw new NotFound();
    assertCan(user, def.resource, "delete");
    await def.remove(params.id, { user, ip });
    return noContent();
  },
  { auth: "staff" },
);
