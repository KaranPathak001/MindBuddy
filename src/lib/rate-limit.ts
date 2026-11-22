/**
 * Rate Limiter Interface & Sliding Window In-Memory Implementation
 * Designed to be seamlessly swapped with Upstash / Redis or Memcached in production.
 */

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetMs: number;
  }>;
}

interface WindowEntry {
  timestamps: number[];
}

export class SlidingWindowRateLimiter implements RateLimiter {
  private store: Map<string, WindowEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 60000) {
    // Periodically prune stale entries to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        const validTimestamps = entry.timestamps.filter((ts) => now - ts < 3600000); // retain max 1hr
        if (validTimestamps.length === 0) {
          this.store.delete(key);
        } else {
          entry.timestamps = validTimestamps;
        }
      }
    }, cleanupIntervalMs);

    // Ensure the interval doesn't hold open Node process on shutdown
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  async check(key: string, limit: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetMs: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Filter out timestamps outside the sliding window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= limit) {
      const oldestInWindow = entry.timestamps[0];
      const resetMs = Math.max(0, oldestInWindow + windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    // Record this attempt
    entry.timestamps.push(now);
    const resetMs = windowMs;

    return {
      allowed: true,
      remaining: Math.max(0, limit - entry.timestamps.length),
      resetMs,
    };
  }
}

// Global singleton instance for memory persistence within server runtime
const globalLimiter = globalThis as unknown as { rateLimiterInstance?: RateLimiter };

export const rateLimiter: RateLimiter =
  globalLimiter.rateLimiterInstance ?? new SlidingWindowRateLimiter();

if (process.env.NODE_ENV !== "production") {
  globalLimiter.rateLimiterInstance = rateLimiter;
}
