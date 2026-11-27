import { apiHandler, ok } from "@/server/http/handler";
import { requireLearner } from "@/server/auth/session";
import { listMyExams } from "@/server/services/learner-assessments";

export const GET = apiHandler(async ({ request, user }) => {
  await requireLearner();
  const tab = new URL(request.url).searchParams.get("tab") === "past" ? "past" : "upcoming";
  return ok(await listMyExams(user.id, tab));
}, { auth: "learner" });
