import assert from 'node:assert/strict';
import test from 'node:test';
import { sign } from 'hono/jwt';
import {
  generateSessionTokens,
  verifyRefreshToken,
  verifyToken,
} from '../src/auth/index.js';
import { setSessionVersionStoreForTests } from '../src/auth/session-version.js';

setSessionVersionStoreForTests({ get: async () => 0, bump: async () => 1 });

const FAMILY_ID = '00000000-0000-4000-8000-000000000001';
const DAY_SECONDS = 24 * 60 * 60;

test('parent session keeps a renewable login for one year', async () => {
  const { token, refreshToken } = await generateSessionTokens({
    familyId: FAMILY_ID,
    role: 'parent',
  });

  const access = await verifyToken(token);
  const refresh = await verifyRefreshToken(refreshToken);

  assert.equal(access.tokenType, 'access');
  assert.equal(refresh.tokenType, 'refresh');
  assert.ok(access.exp - access.iat >= 7 * DAY_SECONDS);
  assert.ok(refresh.exp - refresh.iat >= 365 * DAY_SECONDS);
});

test('child access remains short while its login is renewable for one year', async () => {
  const { token, refreshToken } = await generateSessionTokens({
    familyId: FAMILY_ID,
    role: 'child',
    childId: '00000000-0000-4000-8000-000000000002',
  });

  const access = await verifyToken(token);
  const refresh = await verifyRefreshToken(refreshToken);

  assert.equal(access.exp - access.iat, DAY_SECONDS);
  assert.equal(refresh.exp - refresh.iat, 365 * DAY_SECONDS);
});

test('refresh tokens cannot authorize API requests', async () => {
  const { token, refreshToken } = await generateSessionTokens({
    familyId: FAMILY_ID,
    role: 'parent',
  });

  await assert.rejects(() => verifyToken(refreshToken));
  await assert.rejects(() => verifyRefreshToken(token));
});

test('legacy access tokens remain valid long enough to be upgraded', async () => {
  const now = Math.floor(Date.now() / 1000);
  const legacyToken = await sign(
    {
      familyId: FAMILY_ID,
      role: 'parent',
      iat: now,
      exp: now + DAY_SECONDS,
    },
    process.env.JWT_SECRET!,
  );

  const payload = await verifyToken(legacyToken);
  assert.equal(payload.familyId, FAMILY_ID);
  assert.equal(payload.tokenType, undefined);
});
