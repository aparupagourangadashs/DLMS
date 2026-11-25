import { RateLimited } from "./errors";

type Bucket = { count: number; resetAt: number };

// In-memory fixed window: fine for one dev/server process; replace with a shared store before multi-instance launch.
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new RateLimited(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
}

export function resetRateLimits() {
  buckets.clear();
}
