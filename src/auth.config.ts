import type { NextAuthConfig } from "next-auth";

// Shared by the proxy and the full auth setup; must not import the database.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
        token.kind = user.kind;
        token.tv = user.tokenVersion;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.role = token.role;
      session.user.kind = token.kind;
      session.user.tokenVersion = token.tv;
      return session;
    },
  },
} satisfies NextAuthConfig;
