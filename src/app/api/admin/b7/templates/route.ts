import { apiHandler, created, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { listTemplates, saveTemplate } from "@/server/services/b7-admin";

export const GET = apiHandler(async ({ request }) => ok(await listTemplates(new URL(request.url).searchParams.get("channel") ?? undefined)), { auth: "staff", permission: "templates:read" });
export const POST = apiHandler(async ({ request, ip }) => {
  const user = await requireStaff("templates:write");
  return created(await saveTemplate(user, ip, await readJson(request)));
}, { auth: "staff" });
