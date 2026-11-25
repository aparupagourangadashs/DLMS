/** Only same-site paths in the user's own area (or the public website) are allowed as post-login targets. */
export function safeNext(next: string | undefined, kind: "STAFF" | "LEARNER") {
  const area = kind === "STAFF" ? "/admin" : "/student";
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\r\n]/.test(next)) return area;
  const path = next.split(/[?#]/)[0];
  const allowed = [area, "/website"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return allowed ? next : area;
}
