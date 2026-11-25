const SECRET_KEY = /pass(word)?|token|secret|hash|otp/i;
const MAX_STRING = 500;

/** Drops secret-looking keys and truncates long strings so the audit log never stores credentials or blobs. */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value !== "object") return value;
  if (depth > 4) return "[nested]";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) continue;
    out[key] = redact(v, depth + 1);
  }
  return out;
}
