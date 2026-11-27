import { apiHandler, noContent, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { deleteTemplate, saveTemplate } from "@/server/services/b7-admin";

type Params = { id: string };
export const PATCH = apiHandler<Params, "staff">(async ({ request, params, ip }) => {
  const user = await requireStaff("templates:write");
  return ok(await saveTemplate(user, ip, await readJson(request), params.id));
}, { auth: "staff" });
export const DELETE = apiHandler<Params, "staff">(async ({ params, ip }) => {
  const user = await requireStaff("templates:delete");
  await deleteTemplate(user, ip, params.id);
  return noContent();
}, { auth: "staff" });
