import { passwordSchema } from "@/server/auth/password";
import { apiHandler } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/validate";
import { changePassword } from "@/server/services/accounts";
import { z } from "zod";

const schema = z.object({ currentPassword: z.string().min(1, "Enter your current password.").max(128), newPassword: passwordSchema });

// Changing the password bumps the token version, so every session (including this one) must sign in again.
export const POST = apiHandler(
  async ({ request, user, ip }) => {
    const { currentPassword, newPassword } = await parseJsonBody(request, schema);
    await changePassword(user.id, currentPassword, newPassword, ip);
    return { message: "Password changed. Please sign in again." };
  },
  { auth: "user", rateLimit: { key: "change-password", limit: 10, windowMs: 60 * 60_000 } },
);
