import { apiHandler, ok } from "@/server/http/handler";
import { startExam } from "@/server/services/learner-assessments";

type Params = { id: string };
export const POST = apiHandler<Params, "learner">(async ({ params, user }) => ok(await startExam(user.id, params.id)), { auth: "learner" });
