import { assertCan } from "@/server/auth/assert";
import { apiHandler } from "@/server/http/handler";
import { listStaffLookup } from "@/server/services/branches";

// Active staff for manager pickers; returns only id and display name.
export const GET = apiHandler<Record<string, never>, "staff">(
  async ({ user }) => {
    assertCan(user, "branches", "read");
    return listStaffLookup();
  },
  { auth: "staff" },
);
