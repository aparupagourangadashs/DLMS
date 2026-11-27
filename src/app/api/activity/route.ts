import { apiHandler, created } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireUser } from "@/server/auth/session";
import { recordActivity } from "@/server/services/activity";

export const POST = apiHandler(async ({ request }) => {
  const user = await requireUser();
  return created(await recordActivity(user, await readJson(request)));
});
