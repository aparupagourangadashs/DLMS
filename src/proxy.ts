import { authConfig } from "@/auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Coarse guard only: services and route handlers still enforce permission and ownership.
export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const user = request.auth?.user;
  const isApi = pathname.startsWith("/api/");
  const staffArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in to continue." } }, { status: 401 });
    }
    const login = new URL("/login", request.nextUrl);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const allowed = staffArea ? user.kind === "STAFF" : user.kind === "LEARNER";
  if (allowed) return NextResponse.next();
  if (isApi) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "You do not have permission to do this." } }, { status: 403 });
  }
  return NextResponse.redirect(new URL(staffArea ? "/student" : "/admin", request.nextUrl));
});

export const config = {
  matcher: ["/admin/:path*", "/student/:path*", "/api/admin/:path*", "/api/student/:path*"],
};
