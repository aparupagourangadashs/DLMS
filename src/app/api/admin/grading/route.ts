import { apiHandler, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { getGradeBands, saveGradeBands } from "@/server/services/grading";

export const GET = apiHandler(async () => ok(await getGradeBands()), { auth: "staff" });

export const PUT = apiHandler(async ({ request, ip }) => ok(await saveGradeBands(await requireStaff("settings:write"), ip, await readJson(request))), { auth: "staff" });
