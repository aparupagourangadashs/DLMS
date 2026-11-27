import { apiHandler, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { saveAttemptAnswers } from "@/server/services/learner-assessments";

type Params = { id: string };
export const PUT = apiHandler<Params, "learner">(async ({ request, params, user }) => ok(await saveAttemptAnswers(user.id, params.id, await readJson(request))), { auth: "learner" });
