import { apiHandler, ok } from "@/server/http/handler";
import { submitAttempt } from "@/server/services/learner-assessments";

type Params = { id: string };
export const POST = apiHandler<Params, "learner">(async ({ params, user }) => ok(await submitAttempt(user.id, params.id)), { auth: "learner" });
