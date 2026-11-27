import { apiHandler, ok } from "@/server/http/handler";
import { getMyReferrals } from "@/server/services/b5";

export const GET = apiHandler(async ({ user }) => ok(await getMyReferrals(user.id)), { auth: "learner" });
