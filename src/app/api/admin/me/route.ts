import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { getMyProfile, updateMyProfile } from "@/server/services/profile";

export const GET = apiHandler<Record<string, never>, "staff">(async ({ user }) => getMyProfile(user.id), { auth: "staff" });

export const PATCH = apiHandler<Record<string, never>, "staff">(
  async ({ request, user, ip }) => updateMyProfile(user.id, await readJson(request), ip),
  { auth: "staff" },
);
