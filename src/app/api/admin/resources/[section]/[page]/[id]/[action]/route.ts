import { getResource } from "@/server/admin/resources";
import { assertCan } from "@/server/auth/assert";
import { NotFound } from "@/server/http/errors";
import { apiHandler, ok } from "@/server/http/handler";

type Params = { section: string; page: string; id: string; action: string };

// Row actions such as archive, restore and duplicate.
export const POST = apiHandler<Params, "staff">(
  async ({ params, user, ip }) => {
    const def = getResource(`${params.section}/${params.page}`);
    const run = Object.hasOwn(def.actions ?? {}, params.action) ? def.actions?.[params.action] : undefined;
    if (!run) throw new NotFound();
    assertCan(user, def.resource, params.action === "delete" ? "delete" : "write");
    return ok(await run(params.id, { user, ip }));
  },
  { auth: "staff" },
);
