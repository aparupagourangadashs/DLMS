import { assertCan } from "@/server/auth/assert";
import { apiHandler, created } from "@/server/http/handler";
import { readJson } from "@/server/http/validate";
import { createBranch, listBranches } from "@/server/services/branches";

export const GET = apiHandler<Record<string, never>, "staff">(
  async ({ user }) => {
    assertCan(user, "branches", "read");
    return listBranches();
  },
  { auth: "staff" },
);

export const POST = apiHandler<Record<string, never>, "staff">(
  async ({ request, user, ip }) => {
    assertCan(user, "branches", "write");
    return created(await createBranch(await readJson(request), { id: user.id, ip }));
  },
  { auth: "staff" },
);
