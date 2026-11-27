import { apiHandler, noContent, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { deleteSegment, saveSegment } from "@/server/services/b3b";

type Params = { id: string };
export const PATCH = apiHandler<Params, "staff">(async ({ request, params, ip }) => {
  const user = await requireStaff("learners:write");
  return ok(await saveSegment(user, ip, await readJson(request), params.id));
}, { auth: "staff" });
export const DELETE = apiHandler<Params, "staff">(async ({ params, ip }) => {
  const user = await requireStaff("learners:write");
  await deleteSegment(user, ip, params.id);
  return noContent();
}, { auth: "staff" });
