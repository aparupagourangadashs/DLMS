import { apiHandler, ok } from "@/server/http/handler";
import { listReferralTransactions } from "@/server/services/b5";

export const GET = apiHandler(async ({ user }) => ok(await listReferralTransactions(user.id)), { auth: "learner" });
