import { apiHandler, ok } from "@/server/http/handler";
import { listMyCertificates } from "@/server/services/learner-certificates";

export const GET = apiHandler(async ({ user }) => ok(await listMyCertificates(user.id)), { auth: "learner" });
