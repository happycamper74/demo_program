import type { RateLimitCheckResult } from './types.js';

interface RateLimitBucket {
  count: number;
  windowStartedAt: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(key: string, limit: number, windowMs: number): RateLimitCheckResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStartedAt >= windowMs) {
      return {
        allowed: true,
        currentCount: 0,
        limit,
      };
    }

    return {
      allowed: bucket.count < limit,
      currentCount: bucket.count,
      limit,
    };
  }

  record(key: string, windowMs: number): number {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || now - existing.windowStartedAt >= windowMs) {
      this.buckets.set(key, { count: 1, windowStartedAt: now });
      return 1;
    }

    existing.count += 1;
    return existing.count;
  }

  reset(): void {
    this.buckets.clear();
  }
}
