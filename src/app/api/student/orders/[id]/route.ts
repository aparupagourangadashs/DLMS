import { apiHandler, ok } from "@/server/http/handler";
import { getMyOrder } from "@/server/services/b5";

type Params = { id: string };
export const GET = apiHandler<Params, "learner">(async ({ params, user }) => ok(await getMyOrder(user.id, params.id)), { auth: "learner" });
