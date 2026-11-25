import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { getLearnerProfile, updateLearnerProfile } from "@/server/services/learner-profile";

export const GET = apiHandler<Record<string, never>, "learner">(async ({ user }) => getLearnerProfile(user.id), { auth: "learner" });

export const PATCH = apiHandler<Record<string, never>, "learner">(
    async ({ request, user, ip }) => updateLearnerProfile(user.id, await readJson(request), ip),
    { auth: "learner" },
);
