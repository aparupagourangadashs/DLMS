import { apiHandler, ok } from "@/server/http/handler";
import { listAvailableMembershipPlans, listMyMemberships } from "@/server/services/b5";

export const GET = apiHandler(async ({ user }) => ok({
  active: await listMyMemberships(user.id),
  plans: await listAvailableMembershipPlans(),
}), { auth: "learner" });
