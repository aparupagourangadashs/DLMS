import type { ApiErrorBody, ListMeta } from "@/lib/api/types";
import type { Permission } from "@/server/auth/permissions";
import { requireLearner, requireStaff, requireUser, type SessionUser } from "@/server/auth/session";
import { NextResponse } from "next/server";
import { RateLimited, toAppError } from "./errors";
import { assertSameOrigin, clientIp } from "./origin";
import { rateLimit } from "./rate-limit";

export function ok<T>(data: T, meta?: ListMeta, init?: ResponseInit) {
  return NextResponse.json(meta ? { data, meta } : { data }, init);
}

export function created<T>(data: T) {
  return ok(data, undefined, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(error: unknown) {
  const appError = toAppError(error);
  if (appError.status >= 500) console.error("[api] unexpected error", error);
  const body: ApiErrorBody = {
    error: { code: appError.code, message: appError.message, ...(appError.fields ? { fields: appError.fields } : {}) },
  };
  const headers: Record<string, string> = {};
  if (appError instanceof RateLimited) headers["Retry-After"] = String(appError.retryAfterSeconds);
  return NextResponse.json(body, { status: appError.status, headers });
}

export type AuthMode = "none" | "staff" | "learner" | "user";

export type HandlerContext<P, A extends AuthMode> = {
  request: Request;
  params: P;
  ip: string;
  user: A extends "none" ? null : SessionUser;
};

export type HandlerOptions<A extends AuthMode> = {
  /** Who may call this route. Staff routes may also require a permission. */
  auth?: A;
  permission?: Permission;
  /** Per-IP limit for this route; use on public and auth endpoints. */
  rateLimit?: { key: string; limit: number; windowMs: number };
};

async function resolveUser(mode: AuthMode, permission?: Permission) {
  if (mode === "staff") return requireStaff(permission);
  if (mode === "learner") return requireLearner();
  if (mode === "user") return requireUser();
  return null;
}

/**
 * Wraps a route handler: same-origin check for mutations, rate limit, authentication/permission,
 * and the standard error body. Return a `Response` to control the reply, or any value to send `{ data }`.
 */
export function apiHandler<P = Record<string, never>, A extends AuthMode = "none">(
  fn: (ctx: HandlerContext<P, A>) => Promise<Response | unknown>,
  options: HandlerOptions<A> = {},
) {
  return async (request: Request, context?: { params: Promise<P> }): Promise<Response> => {
    try {
      assertSameOrigin(request);
      const ip = clientIp(request);
      if (options.rateLimit) rateLimit(`${options.rateLimit.key}:${ip}`, options.rateLimit.limit, options.rateLimit.windowMs);
      const user = await resolveUser(options.auth ?? "none", options.permission);
      const params = (context ? await context.params : {}) as P;
      const result = await fn({ request, params, ip, user } as HandlerContext<P, A>);
      return result instanceof Response ? result : ok(result);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
