import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { updateBranch } from "@/server/services/branches";

export const PATCH = apiHandler<{ id: string }, "staff">(
  async ({ request, params, user, ip }) => {
    assertCan(user, "branches", "write");
    return updateBranch(params.id, await readJson(request), { id: user.id, ip });
  },
  { auth: "staff" },
);
