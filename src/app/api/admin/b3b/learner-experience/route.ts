import { apiHandler, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { getLearnerExperience, saveLearnerExperience } from "@/server/services/b3b";

export const GET = apiHandler(async () => ok(await getLearnerExperience()), { auth: "staff" });
export const PUT = apiHandler(async ({ request, ip }) => {
  const user = await requireStaff("settings:write");
  return ok(await saveLearnerExperience(user, ip, await readJson(request)));
}, { auth: "staff" });
