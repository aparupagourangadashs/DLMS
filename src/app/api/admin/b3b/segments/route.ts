import { apiHandler, created, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { listSegments, saveSegment } from "@/server/services/b3b";

export const GET = apiHandler(async () => ok(await listSegments()), { auth: "staff" });
export const POST = apiHandler(async ({ request, ip }) => {
  const user = await requireStaff("learners:write");
  return created(await saveSegment(user, ip, await readJson(request)));
}, { auth: "staff" });
