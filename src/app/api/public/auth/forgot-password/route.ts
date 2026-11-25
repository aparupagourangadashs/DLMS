import { apiHandler } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/validate";
import { requestPasswordReset } from "@/server/services/accounts";
import { z } from "zod";

const schema = z.object({ email: z.email("Enter a valid email address.").max(254) });

export const POST = apiHandler(
  async ({ request }) => {
    const { email } = await parseJsonBody(request, schema);
    await requestPasswordReset(email);
    return { message: "If an account exists for that address, a reset link has been sent." };
  },
  { rateLimit: { key: "forgot-password", limit: 5, windowMs: 60 * 60_000 } },
);
