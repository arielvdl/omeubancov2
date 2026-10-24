import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { env } from '../src/config/index.js';
import {
  generateSessionTokens,
  generateToken,
  verifyRefreshToken,
  verifyToken,
} from '../src/auth/index.js';
import { authMiddleware } from '../src/auth/guards.js';
import {
  assertSessionCurrent,
  bumpSessionVersion,
  isSessionVersionCurrent,
  SessionRevokedError,
  SessionStoreUnavailableError,
  setSessionVersionStoreForTests,
} from '../src/auth/session-version.js';

const FAM = '00000000-0000-4000-8000-0000000000aa';
const OTHER = '00000000-0000-4000-8000-0000000000bb';
const now = () => Math.floor(Date.now() / 1000);

// Banco falso em memoria: versao por familia.
const versions = new Map<string, number>();
let failReads = false;
beforeEach(() => {
  versions.clear();
  versions.set(FAM, 0);
  versions.set(OTHER, 0);
  failReads = false;
  setSessionVersionStoreForTests({
    get: async (id) => {
      if (failReads) throw new Error('db down');
      return versions.get(id);
    },
    bump: async (id) => {
      if (!versions.has(id)) return undefined;
      const next = (versions.get(id) as number) + 1;
      versions.set(id, next);
      return next;
    },
  });
});

const app = new Hono();
app.get('/protected', authMiddleware, (c) => c.json({ ok: true, familyId: c.get('user').familyId }));
const call = (token: string) =>
  app.request('/protected', { headers: { Authorization: `Bearer ${token}` } });

async function legacyAccessToken(familyId = FAM) {
  return sign({ familyId, role: 'parent', iat: now(), exp: now() + 3600 }, env.JWT_SECRET);
}

test('tokens novos carregam sv igual a versao da familia (access e refresh)', async () => {
  versions.set(FAM, 3);
  const { token, refreshToken } = await generateSessionTokens({ familyId: FAM, role: 'parent' });
  assert.equal((await verifyToken(token)).sv, 3);
  assert.equal((await verifyRefreshToken(refreshToken)).sv, 3);
  assert.equal((await verifyToken(await generateToken({ familyId: FAM, role: 'parent' }))).sv, 3);
});

test('regra pura: claim ausente = 0; so igual a versao vigente vale', () => {
  assert.equal(isSessionVersionCurrent(undefined, 0), true);
  assert.equal(isSessionVersionCurrent(undefined, 1), false);
  assert.equal(isSessionVersionCurrent(0, 0), true);
  assert.equal(isSessionVersionCurrent(1, 1), true);
  assert.equal(isSessionVersionCurrent(0, 1), false);
  assert.equal(isSessionVersionCurrent(2, 1), false);
  for (const bad of [-1, 1.5, '0', null, NaN, Infinity, {}]) {
    assert.equal(isSessionVersionCurrent(bad, 0), false, `claim ${String(bad)}`);
  }
});

test('middleware: token legado sem sv segue valido enquanto a familia esta na versao 0', async () => {
  const r = await call(await legacyAccessToken());
  assert.equal(r.status, 200);
});

test('middleware: token novo (sv=0) valido; depois do bump o antigo e o legado dao 401, o novo vale', async () => {
  const legacy = await legacyAccessToken();
  const { token: before } = await generateSessionTokens({ familyId: FAM, role: 'parent' });
  assert.equal((await call(before)).status, 200);

  await bumpSessionVersion(FAM);

  assert.equal((await call(before)).status, 401);
  assert.equal((await call(legacy)).status, 401);
  const { token: after } = await generateSessionTokens({ familyId: FAM, role: 'parent' });
  assert.equal((await verifyToken(after)).sv, 1);
  assert.equal((await call(after)).status, 200);
});

test('revogar uma familia nao afeta outra', async () => {
  const { token } = await generateSessionTokens({ familyId: OTHER, role: 'parent' });
  await bumpSessionVersion(FAM);
  assert.equal((await call(token)).status, 200);
});

test('familia inexistente: 401', async () => {
  const ghost = await legacyAccessToken('00000000-0000-4000-8000-0000000000cc');
  assert.equal((await call(ghost)).status, 401);
});

test('falha do banco na verificacao vira 503, nunca 401 (app nao desloga)', async () => {
  const legacy = await legacyAccessToken();
  failReads = true;
  setSessionVersionStoreForTests({
    get: async () => {
      throw new Error('db down');
    },
    bump: async () => 1,
  });
  const r = await call(legacy);
  assert.equal(r.status, 503);
  await assert.rejects(assertSessionCurrent({ familyId: FAM }), SessionStoreUnavailableError);
});

test('assertSessionCurrent: revogado lanca SessionRevokedError', async () => {
  await bumpSessionVersion(FAM);
  await assert.rejects(assertSessionCurrent({ familyId: FAM, sv: 0 }), SessionRevokedError);
  await assert.rejects(assertSessionCurrent({ familyId: FAM }), SessionRevokedError);
  await assertSessionCurrent({ familyId: FAM, sv: 1 });
});

test('refresh token antigo nao vale depois do bump (regra usada por /auth/refresh)', async () => {
  const { refreshToken } = await generateSessionTokens({ familyId: FAM, role: 'parent' });
  const p = await verifyRefreshToken(refreshToken);
  assert.equal(isSessionVersionCurrent(p.sv, versions.get(FAM) as number), true);
  await bumpSessionVersion(FAM);
  assert.equal(isSessionVersionCurrent(p.sv, versions.get(FAM) as number), false);
});

test('bump de familia inexistente falha fechado', async () => {
  await assert.rejects(bumpSessionVersion('00000000-0000-4000-8000-0000000000dd'), SessionRevokedError);
});

test('multiinstancia: cache em 0, banco em 1 (bump em outra instancia), token sv=1 passa e sv=0 e recusado', async () => {
  // Aquece o cache desta instancia com a versao 0.
  await assertSessionCurrent({ familyId: FAM, sv: 0 });
  // Outra instancia fez o bump: so o banco muda, o cache local segue em 0.
  versions.set(FAM, 1);
  await assertSessionCurrent({ familyId: FAM, sv: 1 });
  await assert.rejects(assertSessionCurrent({ familyId: FAM, sv: 0 }), SessionRevokedError);
});

test('cache que aceita o token nao consulta o banco', async () => {
  await assertSessionCurrent({ familyId: FAM, sv: 0 });
  failReads = true;
  await assertSessionCurrent({ familyId: FAM, sv: 0 });
});
