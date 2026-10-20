/**
 * Small fixed-window rate limiter held in memory.
 * On serverless hosting each instance keeps its own counters, so this is a best-effort brake against
 * bursts from one visitor. The hard limit is the Vercel Firewall rate-limit rule on /api/requests.
 */
type Bucket = {count: number; reset: number}
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): {ok: boolean; retryAfter: number} {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k)
  const b = buckets.get(key)
  if (!b || b.reset <= now) {
    buckets.set(key, {count: 1, reset: now + windowMs})
    return {ok: true, retryAfter: 0}
  }
  b.count++
  return b.count <= limit ? {ok: true, retryAfter: 0} : {ok: false, retryAfter: Math.ceil((b.reset - now) / 1000)}
}
