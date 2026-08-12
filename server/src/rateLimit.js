const now = () => Date.now()

export const createRateLimiter = ({ windowMs, max, keyGenerator = request => request.ip || 'unknown' }) => {
  if (!Number.isInteger(windowMs) || windowMs <= 0) throw new Error('windowMs must be a positive integer')
  if (!Number.isInteger(max) || max <= 0) throw new Error('max must be a positive integer')

  const buckets = new Map()
  let lastCleanup = 0

  const cleanup = timestamp => {
    if (timestamp - lastCleanup < Math.min(windowMs, 60_000)) return
    lastCleanup = timestamp
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= timestamp) buckets.delete(key)
    }
  }

  return (req, res, next) => {
    const timestamp = now()
    cleanup(timestamp)
    const key = String(keyGenerator(req) || 'unknown')
    let bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= timestamp) {
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
