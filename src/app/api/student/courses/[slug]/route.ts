import { apiHandler } from "@/server/http/handler";
import { getCourseOutline } from "@/server/services/learner-content";

// The enrolled learner's modules and lessons for one course; anyone else gets 404.
export const GET = apiHandler<{ slug: string }, "learner">(async ({ params, user }) => getCourseOutline(user.id, params.slug), { auth: "learner" });
