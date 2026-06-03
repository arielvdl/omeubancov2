// iOS often reports the network adapter as up before it's actually routable, so
// the first request on cold boot can fail with ERR_NETWORK / 15s timeout. Retry
// transient failures a few times with exponential backoff before giving up;
// once a connection is warm, subsequent calls return in <1s.
//
// Shared by the root-layout hydration (app/_layout.tsx) and the dashboard read
// path (app/(tabs)/index.tsx) so both survive the same cold-boot race.
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const e = err as { code?: string; message?: string; response?: unknown };
      const isTransient =
        !e?.response ||
        e?.code === 'ECONNABORTED' ||
        e?.code === 'ETIMEDOUT' ||
        e?.code === 'ERR_NETWORK' ||
        (typeof e?.message === 'string' && e.message.toLowerCase().includes('timeout'));
      if (!isTransient || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** i));
    }
  }
  throw lastErr;
}
