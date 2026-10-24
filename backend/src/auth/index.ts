import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from 'hono/utils/jwt/types';
import bcrypt from 'bcryptjs';
import { env } from '../config/index.js';

export interface TokenPayload {
  familyId: string;
  role: 'parent' | 'child';
  childId?: string;
  guardianId?: string;
  guardianAccessLevel?: 'admin' | 'member';
  tokenType?: 'access' | 'refresh';
  exp: number;
  iat: number;
}

export interface SessionIdentity {
  familyId: string;
  role: 'parent' | 'child';
  childId?: string;
  guardianId?: string;
  guardianAccessLevel?: 'admin' | 'member';
}

const PARENT_ACCESS_TOKEN_SECONDS = 7 * 24 * 60 * 60;
const CHILD_ACCESS_TOKEN_SECONDS = 24 * 60 * 60;
const REFRESH_TOKEN_SECONDS = 365 * 24 * 60 * 60;

async function signSessionToken(
  payload: SessionIdentity,
  tokenType: 'access' | 'refresh',
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = tokenType === 'refresh'
    ? REFRESH_TOKEN_SECONDS
    : payload.role === 'parent'
      ? PARENT_ACCESS_TOKEN_SECONDS
      : CHILD_ACCESS_TOKEN_SECONDS;

  const tokenPayload: JWTPayload = {
    familyId: payload.familyId,
    role: payload.role,
    childId: payload.childId,
    guardianId: payload.guardianId,
    guardianAccessLevel: payload.guardianAccessLevel,
    tokenType,
    iat: now,
    exp: now + expiresIn,
  };

  return sign(tokenPayload, env.JWT_SECRET);
}

export async function generateToken(payload: SessionIdentity): Promise<string> {
  return signSessionToken(payload, 'access');
}

export async function generateRefreshToken(payload: SessionIdentity): Promise<string> {
  return signSessionToken(payload, 'refresh');
}

export async function generateSessionTokens(payload: SessionIdentity): Promise<{
  token: string;
  refreshToken: string;
}> {
  const [token, refreshToken] = await Promise.all([
    generateToken(payload),
    generateRefreshToken(payload),
  ]);
  return { token, refreshToken };
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const payload = await verify(token, env.JWT_SECRET, 'HS256');
  if (payload.tokenType === 'refresh') {
    throw new Error('Refresh token cannot be used as an access token');
  }
  return payload as unknown as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const payload = await verify(token, env.JWT_SECRET, 'HS256');
  if (payload.tokenType !== 'refresh') {
    throw new Error('Invalid refresh token');
  }
  return payload as unknown as TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
