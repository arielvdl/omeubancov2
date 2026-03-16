import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, windowMs);

  return async function rateLimitMiddleware(c: Context, next: Next): Promise<Response | void> {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown';

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', String(maxRequests - 1));
      await next();
      return;
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      return c.json({ error: 'Too many requests' }, 429);
    }

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(maxRequests - entry.count));
    await next();
  };
}

export const authRateLimit = createRateLimiter(5, 60 * 1000);

export const generalRateLimit = createRateLimiter(60, 60 * 1000);

export const invitationRateLimit = createRateLimiter(5, 60 * 60 * 1000);

export const inviteInfoRateLimit = createRateLimiter(10, 60 * 1000);
