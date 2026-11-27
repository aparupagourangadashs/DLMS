import { apiHandler, created, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { listCustomFields, saveCustomField } from "@/server/services/b3b";

export const GET = apiHandler(async ({ request }) => {
  const entity = new URL(request.url).searchParams.get("entity") ?? undefined;
  return ok(await listCustomFields(entity ?? undefined));
}, { auth: "staff" });
export const POST = apiHandler(async ({ request, ip }) => {
  const user = await requireStaff("learners:write");
  return created(await saveCustomField(user, ip, await readJson(request)));
}, { auth: "staff" });
