import type { AnyRole } from "@/server/auth/permissions";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: AnyRole;
    kind: "STAFF" | "LEARNER";
    tokenVersion: number;
  }
  interface Session {
    user: { id: string; role: AnyRole; kind: "STAFF" | "LEARNER"; tokenVersion: number } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid: string;
    role: AnyRole;
    kind: "STAFF" | "LEARNER";
    tv: number;
  }
}
