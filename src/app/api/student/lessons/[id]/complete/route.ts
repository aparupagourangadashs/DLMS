import { apiHandler } from "@/server/http/handler";
import { completeLesson } from "@/server/services/learner-content";

export const POST = apiHandler<{ id: string }, "learner">(async ({ params, user }) => completeLesson(user.id, params.id), {
    auth: "learner",
    rateLimit: { key: "lesson-complete", limit: 120, windowMs: 60_000 },
});
