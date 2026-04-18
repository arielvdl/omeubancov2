import type { Context, Next } from 'hono';
import { verifyToken, type TokenPayload } from './index.js';
import { guardianRepo } from '../repositories/guardian.repo.js';
import { env } from '../config/index.js';

declare module 'hono' {
  interface ContextVariableMap {
    user: TokenPayload;
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const resourceMetadataUrl = `${env.PUBLIC_URL.replace(/\/+$/, '')}/.well-known/oauth-protected-resource`;

  const unauthorized = (message: string) => {
    c.header(
      'WWW-Authenticate',
      `Bearer realm="omeubanco-api", resource_metadata="${resourceMetadataUrl}"`
    );
    return c.json({ error: message }, 401);
  };

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  if (!token) {
    return unauthorized('Missing token');
  }

  try {
    const payload = await verifyToken(token);

    // If token belongs to a guardian, verify they are still active
    if (payload.guardianId) {
      const guardian = await guardianRepo.findById(payload.guardianId);
      if (!guardian || guardian.status !== 'active') {
        return unauthorized('Access revoked');
      }
    }

    c.set('user', payload);
    await next();
  } catch {
    return unauthorized('Invalid or expired token');
  }
}

export async function requireParent(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');
  if (!user || user.role !== 'parent') {
    return c.json({ error: 'Parent access required' }, 403);
  }
  await next();
}

export async function requireFamilyOwner(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');
  if (!user || user.role !== 'parent' || user.guardianId) {
    return c.json({ error: 'Family owner access required' }, 403);
  }
  await next();
}

export async function requireChild(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');
  if (!user || user.role !== 'child') {
    return c.json({ error: 'Child access required' }, 403);
  }
  await next();
}
