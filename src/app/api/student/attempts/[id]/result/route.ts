import { apiHandler, ok } from "@/server/http/handler";
import { getAttemptResult } from "@/server/services/learner-assessments";

type Params = { id: string };
export const GET = apiHandler<Params, "learner">(async ({ params, user }) => ok(await getAttemptResult(user.id, params.id)), { auth: "learner" });
