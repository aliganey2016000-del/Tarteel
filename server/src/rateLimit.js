const now = () => Date.now()

/**
 * Small fixed-window limiter for the single-process API.
 *
 * The bucket store is deliberately bounded so an attacker cannot exhaust
 * process memory by presenting a large number of distinct client keys.
 * For multi-instance deployments, use a shared edge/proxy limiter as the
 * authoritative global control; this limiter remains a local safety net.
 */
export const createRateLimiter = ({
  windowMs,
  max,
  keyGenerator = request => request.ip || 'unknown',
  maxKeys = 10_000
}) => {
  if (!Number.isInteger(windowMs) || windowMs <= 0) throw new Error('windowMs must be a positive integer')
  if (!Number.isInteger(max) || max <= 0) throw new Error('max must be a positive integer')
  if (!Number.isInteger(maxKeys) || maxKeys <= 0) throw new Error('maxKeys must be a positive integer')

  const buckets = new Map()
  let lastCleanup = 0

  const cleanup = timestamp => {
    if (timestamp - lastCleanup < Math.min(windowMs, 60_000)) return
    lastCleanup = timestamp
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= timestamp) buckets.delete(key)
    }
  }

  const evictIfFull = () => {
    while (buckets.size >= maxKeys) {
      const oldest = buckets.keys().next().value
      if (oldest === undefined) break
      buckets.delete(oldest)
    }
  }

  return (req, res, next) => {
    const timestamp = now()
    cleanup(timestamp)
    let key
    try {
      key = String(keyGenerator(req) || 'unknown').slice(0, 256)
    } catch {
      key = 'unknown'
    }

    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= timestamp) {
      if (!bucket) evictIfFull()
      bucket = { count: 0, resetAt: timestamp + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1
    const remaining = Math.max(0, max - bucket.count)
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000))
    res.set('X-RateLimit-Limit', String(max))
    res.set('X-RateLimit-Remaining', String(remaining))
    res.set('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))

    if (bucket.count > max) {
      res.set('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Too many requests. Please try again later.', retryAfter })
    }

    next()
  }
}
