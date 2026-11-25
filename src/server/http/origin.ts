import { Forbidden } from "./errors";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function clientIp(request: Request) {
  // Only trustworthy behind a proxy that sets/overwrites this header.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Rejects cross-site state-changing browser requests (CSRF defence for cookie sessions). */
export function assertSameOrigin(request: Request) {
  if (!MUTATING.has(request.method)) return;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new Forbidden("Cross-site request blocked.");
    }
    if (originHost !== host) throw new Forbidden("Cross-site request blocked.");
    return;
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new Forbidden("Cross-site request blocked.");
}
