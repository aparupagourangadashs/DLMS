import { passwordSchema } from "@/server/auth/password";
import { apiHandler } from "@/server/http/handler";
import { parseJsonBody } from "@/server/http/validate";
import { registerLearner } from "@/server/services/accounts";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.email("Enter a valid email address.").max(254),
  password: passwordSchema,
});

export const POST = apiHandler(
  async ({ request, ip }) => {
    const input = await parseJsonBody(request, schema);
    await registerLearner(input, ip);
    // Same reply whether or not the address was already registered.
    return Response.json({ data: { message: "Check your email to verify your address, then sign in." } }, { status: 202 });
  },
  { rateLimit: { key: "register", limit: 10, windowMs: 60 * 60_000 } },
);
