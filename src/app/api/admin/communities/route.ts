import { apiHandler, created, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { createCommunity, listCommunitiesForStaff } from "@/server/services/b7";

export const GET = apiHandler(async () => ok(await listCommunitiesForStaff()), { auth: "staff" });
export const POST = apiHandler(async ({ request, ip }) => {
  const user = await requireStaff("communities:write");
  return created(await createCommunity(user, ip, await readJson(request)));
}, { auth: "staff" });
