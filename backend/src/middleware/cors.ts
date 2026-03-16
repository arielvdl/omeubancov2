import { cors } from 'hono/cors';
import { env } from '../config/index.js';

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Cron-Secret'],
  exposeHeaders: ['X-Request-Id'],
  maxAge: 86400,
  credentials: env.CORS_ORIGIN !== '*',
});
