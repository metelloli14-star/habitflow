// Simple in-memory rate limits per client IP (one server process is enough for this app's scale;
// with several instances, move the counters to Redis).
// Behind nginx, make sure the proxy sets X-Real-IP / X-Forwarded-For itself (see README),
// otherwise clients could spoof these headers.

import { ApiError } from './http';

const globalForLimits = globalThis as unknown as { __hfRateLimits?: Map<string, number[]> };
const buckets = (globalForLimits.__hfRateLimits ??= new Map<string, number[]>());

export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'local';
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): void {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const waitMin = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 60_000));
    throw new ApiError(429, `Слишком много запросов. Попробуйте через ${waitMin} мин.`, 'rate_limited');
  }
  recent.push(now);
  buckets.set(key, recent);
}

/** Letters with codes: at most 10 per hour from one IP (stops using the site to spam other people's inboxes). */
export const limitEmailSends = (req: Request) => rateLimit(`mail:${clientIp(req)}`, 10, 60 * 60 * 1000);

/** Password / code checks: at most 30 per 15 minutes from one IP (on top of the per-account limits). */
export const limitAuthAttempts = (req: Request) => rateLimit(`auth:${clientIp(req)}`, 30, 15 * 60 * 1000);
