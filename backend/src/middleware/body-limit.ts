import type { Context, MiddlewareHandler, Next } from 'hono';
import { bodyLimit } from 'hono/body-limit';

// Default ceiling for any JSON/webhook/OAuth body. Legitimate payloads in this API
// are a few hundred bytes to a few KB (passkey credentials are the largest).
export const DEFAULT_BODY_LIMIT_BYTES = 64 * 1024;

// Upload routes keep the existing 5 MB file contract (see MAX_FILE_SIZE in
// upload.routes.ts) plus room for the multipart envelope.
export const UPLOAD_BODY_LIMIT_BYTES = 5 * 1024 * 1024 + 64 * 1024;

const UPLOAD_PATHS = new Set([
  '/api/v1/upload/avatar',
  '/api/v1/upload/receipt',
  '/api/v1/upload/wishlist',
]);

const onError = (c: Context) => c.json({ error: 'Payload too large' }, 413);

const defaultLimit = bodyLimit({ maxSize: DEFAULT_BODY_LIMIT_BYTES, onError });
const uploadLimit = bodyLimit({ maxSize: UPLOAD_BODY_LIMIT_BYTES, onError });

// Enforced on Content-Length and, when the body is chunked, while it is streamed.
export const bodyLimitMiddleware: MiddlewareHandler = (c: Context, next: Next) =>
  UPLOAD_PATHS.has(c.req.path) ? uploadLimit(c, next) : defaultLimit(c, next);
