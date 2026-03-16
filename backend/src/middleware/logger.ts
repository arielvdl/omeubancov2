import type { Context, Next } from 'hono';

export async function loggerMiddleware(c: Context, next: Next): Promise<void> {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      method,
      path,
      status,
      duration: `${duration}ms`,
    })
  );
}
