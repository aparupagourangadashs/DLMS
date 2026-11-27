import { apiHandler, ok } from "@/server/http/handler";
import { getLearnerExperience } from "@/server/services/b3b";

export const GET = apiHandler(async () => ok(await getLearnerExperience()), { auth: "learner" });
