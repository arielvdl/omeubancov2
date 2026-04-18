import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from 'hono/utils/jwt/types';
import bcrypt from 'bcryptjs';
import { env } from '../config/index.js';

export interface TokenPayload {
  familyId: string;
  role: 'parent' | 'child';
  childId?: string;
  guardianId?: string;
  exp: number;
  iat: number;
}

export async function generateToken(payload: {
  familyId: string;
  role: 'parent' | 'child';
  childId?: string;
  guardianId?: string;
  guardianAccessLevel?: 'admin' | 'member';
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.role === 'parent' ? 7 * 24 * 60 * 60 : 24 * 60 * 60;

  const tokenPayload: JWTPayload = {
    familyId: payload.familyId,
    role: payload.role,
    childId: payload.childId,
    guardianId: payload.guardianId,
    guardianAccessLevel: payload.guardianAccessLevel,
    iat: now,
    exp: now + expiresIn,
  };

  return sign(tokenPayload, env.JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const payload = await verify(token, env.JWT_SECRET, 'HS256');
  return payload as unknown as TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
