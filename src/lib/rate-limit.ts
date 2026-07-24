interface RateLimitOptions {
  limit: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

// In-memory sliding-window rate limiter. State is kept per server
// instance, which is acceptable for the current single-container deploy.
// Replace with a shared store (e.g. Redis) if the app scales horizontally.
const requestTimestamps = new Map<string, number[]>()

const MAX_TRACKED_KEYS = 10_000

function pruneStaleKeys(now: number, windowMs: number): void {
  if (requestTimestamps.size < MAX_TRACKED_KEYS) {
    return
  }
  for (const [key, timestamps] of requestTimestamps) {
    const newest = timestamps[timestamps.length - 1]
    if (!newest || newest <= now - windowMs) {
      requestTimestamps.delete(key)
    }
  }
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs } = options
  const now = Date.now()
  const windowStart = now - windowMs

  pruneStaleKeys(now, windowMs)

  const recent = (requestTimestamps.get(key) || []).filter(ts => ts > windowStart)

  if (recent.length >= limit) {
    const oldest = recent[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    requestTimestamps.set(key, recent)
    return { allowed: false, retryAfterSeconds }
  }

  requestTimestamps.set(key, [...recent, now])
  return { allowed: true, retryAfterSeconds: 0 }
}
