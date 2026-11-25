import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { getLearnerPreferences, saveLearnerPreferences } from "@/server/services/learner-profile";

export const GET = apiHandler<Record<string, never>, "learner">(async ({ user }) => getLearnerPreferences(user.id), { auth: "learner" });

export const PUT = apiHandler<Record<string, never>, "learner">(
    async ({ request, user, ip }) => saveLearnerPreferences(user.id, await readJson(request), ip),
    { auth: "learner" },
);
