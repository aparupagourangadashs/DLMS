import { apiHandler } from "@/server/http/handler";
import { listMyAnnouncements } from "@/server/services/learner-learning";

export const GET = apiHandler<Record<string, never>, "learner">(async ({ user }) => listMyAnnouncements(user.id), { auth: "learner" });
