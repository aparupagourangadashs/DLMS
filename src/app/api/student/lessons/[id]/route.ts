import { apiHandler } from "@/server/http/handler";
import { getLesson } from "@/server/services/learner-content";

// One lesson's content. Only learners enrolled in a course that includes it can read it.
export const GET = apiHandler<{ id: string }, "learner">(async ({ params, user }) => getLesson(user.id, params.id), { auth: "learner" });
