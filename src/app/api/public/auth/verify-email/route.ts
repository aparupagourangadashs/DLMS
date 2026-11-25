import { apiHandler } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/validate";
import { verifyEmail } from "@/server/services/accounts";
import { z } from "zod";

const schema = z.object({ token: z.string().min(20).max(200) });

export const POST = apiHandler(
  async ({ request }) => {
    const { token } = await parseJsonBody(request, schema);
    await verifyEmail(token);
    return { message: "Email verified. You can now sign in." };
  },
  { rateLimit: { key: "verify-email", limit: 20, windowMs: 60 * 60_000 } },
);
