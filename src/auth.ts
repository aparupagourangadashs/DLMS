import { authConfig } from "@/auth.config";
import { normalizeEmail } from "@/server/auth/tokens";
import { RateLimited } from "@/server/http/errors";
import { rateLimit } from "@/server/http/rate-limit";
import { AuthFailure, authenticate } from "@/server/services/accounts";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

const credentialsSchema = z.object({ email: z.string().min(3).max(254), password: z.string().min(1).max(128) });

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const ip = requestIp(request);
        const email = normalizeEmail(parsed.data.email);
        try {
          rateLimit(`login-ip:${ip}`, 30, 15 * 60_000);
          rateLimit(`login-email:${email}`, 10, 15 * 60_000);
        } catch (error) {
          if (error instanceof RateLimited) throw new TooManyAttempts();
          throw error;
        }
        try {
          return await authenticate(email, parsed.data.password, ip);
        } catch (error) {
          if (error instanceof AuthFailure) {
            if (error.code === "not_verified") throw new EmailNotVerified();
            return null;
          }
          throw error;
        }
      },
    }),
  ],
});
