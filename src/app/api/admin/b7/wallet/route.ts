import { apiHandler, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { adjustWallet, getWallet } from "@/server/services/b7-admin";

export const GET = apiHandler(async () => ok(await getWallet()), { auth: "staff", permission: "wallet:read" });
export const POST = apiHandler(async ({ request, ip }) => {
  const user = await requireStaff("wallet:write");
  return ok(await adjustWallet(user, ip, await readJson(request)));
}, { auth: "staff" });
