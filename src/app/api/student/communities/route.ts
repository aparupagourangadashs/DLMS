import { apiHandler, ok } from "@/server/http/handler";
import { listMyCommunities } from "@/server/services/b7";

export const GET = apiHandler(async ({ user }) => ok(await listMyCommunities(user.id)), { auth: "learner" });
