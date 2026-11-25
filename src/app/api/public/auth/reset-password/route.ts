import { passwordSchema } from "@/server/auth/password";
import { apiHandler } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/validate";
import { resetPassword } from "@/server/services/accounts";
import { z } from "zod";

const schema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

export const POST = apiHandler(
  async ({ request, ip }) => {
    const { token, password } = await parseJsonBody(request, schema);
    await resetPassword(token, password, ip);
    return { message: "Password updated. You can now sign in." };
  },
  { rateLimit: { key: "reset-password", limit: 10, windowMs: 60 * 60_000 } },
);
