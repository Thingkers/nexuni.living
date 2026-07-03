import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// In development (or when Upstash env vars aren't set), fall back to an
// in-memory store so the app still works locally without a Redis instance.
type Entry = { count: number; resetAt: number }
const memoryStore = new Map<string, Entry>()

function memoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

// The in-memory fallback is per-serverless-instance, so in production it
// effectively means "no rate limiting". Fail loudly (once at module load)
// instead of silently degrading when the Upstash env vars are missing.
if (!hasUpstash && process.env.NODE_ENV === 'production') {
  console.error(
    '[rateLimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set — ' +
    'falling back to per-instance in-memory rate limiting, which does NOT protect ' +
    'a serverless deployment. Set the Upstash env vars in production.',
  )
}

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Cache limiters by window duration so we don't recreate them on every request
const limiterCache = new Map<number, Ratelimit>()

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cached = limiterCache.get(windowMs)
  if (cached) return cached
  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    analytics: false,
  })
  limiterCache.set(windowMs, limiter)
  return limiter
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) return memoryRateLimit(key, limit, windowMs)

  const { success, remaining } = await getLimiter(limit, windowMs).limit(key)
  return { allowed: success, remaining }
}
