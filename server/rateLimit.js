const buckets = new Map();

/**
 * Simple in-memory sliding-window rate limiter.
 * Returns true if the request should be allowed.
 */
export function rateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let entry = buckets.get(key);

  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 };
    buckets.set(key, entry);
  }

  entry.count += 1;
  return entry.count <= max;
}

// Periodically prune stale buckets
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.start > 120_000) buckets.delete(key);
  }
}, 120_000).unref?.();
