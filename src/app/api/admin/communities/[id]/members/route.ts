import { apiHandler, noContent, ok } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { requireStaff } from "@/server/auth/session";
import { z } from "zod";
import { addCommunityMember, removeCommunityMember } from "@/server/services/b7";

type Params = { id: string };
export const POST = apiHandler<Params, "staff">(async ({ request, params, ip }) => {
  const user = await requireStaff("communities:write");
  const data = await readJson(request);
  const parsed = z.object({ learnerId: z.string().min(1) }).safeParse(data);
  if (!parsed.success) throw new Error("Invalid learner.");
  return ok(await addCommunityMember(user, ip, params.id, parsed.data.learnerId));
}, { auth: "staff" });
export const DELETE = apiHandler<Params, "staff">(async ({ request, params, ip }) => {
  const user = await requireStaff("communities:write");
  const data = z.object({ userId: z.string().min(1) }).safeParse(await readJson(request));
  if (!data.success) throw new Error("Invalid member.");
  await removeCommunityMember(user, ip, params.id, data.data.userId);
  return noContent();
}, { auth: "staff" });
