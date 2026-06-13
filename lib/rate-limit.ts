const store = new Map<string, number[]>();
let sweepCounter = 0;

function sweep(windowMs: number) {
  if (++sweepCounter < 500) return;
  sweepCounter = 0;
  const cutoff = Date.now() - windowMs;
  for (const [key, ts] of store) {
    const fresh = ts.filter(t => t > cutoff);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}

/**
 * Sliding-window rate limiter. Returns true when the request is allowed.
 * key        — unique identifier (userId or IP)
 * maxRequests — max hits allowed within the window
 * windowMs   — window length in milliseconds
 */
export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  sweep(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter(t => t > cutoff);
  if (timestamps.length >= maxRequests) return false;
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

/** Pre-configured tiers used across API routes. */
export const limits = {
  standard: (key: string) => rateLimit(key, 60, 60_000),       // 60 req/min
  ai:       (key: string) => rateLimit(key, 20, 60_000),        // 20 req/min
  upload:   (key: string) => rateLimit(key, 10, 60_000),        // 10 req/min
  auth:     (key: string) => rateLimit(key, 10, 15 * 60_000),   // 10 req/15 min
} as const;
