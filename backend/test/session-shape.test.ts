import assert from 'node:assert/strict';
import test from 'node:test';
import { sign } from 'hono/jwt';
import { env } from '../src/config/index.js';
import { generateToken, generateRefreshToken, verifyToken, verifyRefreshToken } from '../src/auth/index.js';

const now = Math.floor(Date.now() / 1000);

test('token de sessão legítimo (access e refresh) continua válido', async () => {
  const identity = { familyId: 'fam-1', role: 'parent' as const };
  assert.equal((await verifyToken(await generateToken(identity))).familyId, 'fam-1');
  assert.equal((await verifyRefreshToken(await generateRefreshToken(identity))).role, 'parent');
});

test('token legado sem tokenType, com role, continua válido', async () => {
  const legacy = await sign({ familyId: 'fam-1', role: 'child', childId: 'c1', iat: now, exp: now + 60 }, env.JWT_SECRET);
  assert.equal((await verifyToken(legacy)).role, 'child');
});

test('JWT de desafio do passkey não vale como sessão', async () => {
  for (const type of ['registration', 'authentication']) {
    const challenge = await sign({ challenge: 'x', familyId: 'fam-1', guardianId: null, type, iat: now, exp: now + 60 }, env.JWT_SECRET);
    await assert.rejects(verifyToken(challenge));
    await assert.rejects(verifyRefreshToken(challenge));
  }
});

test('token sem role válido é recusado', async () => {
  const noRole = await sign({ familyId: 'fam-1', iat: now, exp: now + 60 }, env.JWT_SECRET);
  await assert.rejects(verifyToken(noRole));
  const badRole = await sign({ familyId: 'fam-1', role: 'admin', iat: now, exp: now + 60 }, env.JWT_SECRET);
  await assert.rejects(verifyToken(badRole));
});

test('tokenType desconhecido é recusado', async () => {
  const odd = await sign({ familyId: 'fam-1', role: 'parent', tokenType: 'challenge', iat: now, exp: now + 60 }, env.JWT_SECRET);
  await assert.rejects(verifyToken(odd));
});
