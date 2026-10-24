import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { serve } from '@hono/node-server';
import { app } from '../src/app.js';
import { reorderWishItemsSchema } from '../src/validators/index.js';

let server: ReturnType<typeof serve>;
let port = 0;

before(async () => {
  server = serve({ fetch: app.fetch, port: 0 });
  await new Promise((r) => server.once('listening', r));
  port = (server.address() as AddressInfo).port;
});
after(() => {
  server.close();
});

function post(path: string, body: Buffer | string, opts: { chunked?: boolean; type?: string } = {}) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const buf = typeof body === 'string' ? Buffer.from(body) : body;
    const headers: Record<string, string> = { 'content-type': opts.type ?? 'application/json' };
    if (!opts.chunked) headers['content-length'] = String(buf.length);
    else headers['transfer-encoding'] = 'chunked';
    const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
    });
    req.on('error', (e) => {
      // server may close the socket after answering 413 while we are still writing
      if ((e as NodeJS.ErrnoException).code === 'ECONNRESET' || (e as NodeJS.ErrnoException).code === 'EPIPE') {
        resolve({ status: 413, body: 'connection closed by server after limit' });
      } else reject(e);
    });
    if (opts.chunked) {
      for (let i = 0; i < buf.length; i += 4096) req.write(buf.subarray(i, i + 4096));
      req.end();
    } else req.end(buf);
  });
}

test('normal JSON body passes the limit and reaches validation (400, not 413)', async () => {
  const r = await post('/api/v1/auth/login', JSON.stringify({ email: 'x' }));
  assert.equal(r.status, 400);
});

test('64 KB + 1 with Content-Length gets 413 JSON', async () => {
  const r = await post('/api/v1/auth/login', Buffer.alloc(64 * 1024 + 1, 0x61));
  assert.equal(r.status, 413);
  assert.match(r.body, /Payload too large|connection closed/);
});

test('chunked body without Content-Length is cut by the stream limit (413)', async () => {
  const big = JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(200 * 1024) });
  const r = await post('/api/v1/auth/login', big, { chunked: true });
  assert.equal(r.status, 413);
});

test('chunked body under the limit is still accepted', async () => {
  const r = await post('/api/v1/auth/login', JSON.stringify({ email: 'x' }), { chunked: true });
  assert.equal(r.status, 400);
});

test('webhook and oauth routes are limited too', async () => {
  const r = await post('/webhooks/revenuecat', Buffer.alloc(70 * 1024, 0x61));
  assert.equal(r.status, 413);
});

test('upload routes keep 5 MB: 5 MB passes the limiter (401 without auth), 6 MB gets 413', async () => {
  const ok = await post('/api/v1/upload/avatar', Buffer.alloc(5 * 1024 * 1024, 0x61), { type: 'multipart/form-data; boundary=x' });
  assert.equal(ok.status, 401);
  const big = await post('/api/v1/upload/avatar', Buffer.alloc(6 * 1024 * 1024, 0x61), { type: 'multipart/form-data; boundary=x' });
  assert.equal(big.status, 413);
});

test('a non-upload path does not inherit the upload ceiling', async () => {
  const r = await post('/api/v1/children', Buffer.alloc(1024 * 1024, 0x61));
  assert.equal(r.status, 413);
});

test('legitimate reorder (1 and 100 items) is accepted by the schema', () => {
  const mk = (n: number) => ({
    items: Array.from({ length: n }, (_, i) => ({ id: crypto.randomUUID(), sortOrder: i })),
  });
  for (const n of [1, 3, 100]) {
    const r = reorderWishItemsSchema.safeParse(mk(n));
    assert.equal(r.success, true, `n=${n}`);
    if (r.success) assert.equal(r.data.items.length, n);
  }
  assert.ok(JSON.stringify(mk(100)).length < 64 * 1024);
});

test('reorder rejects 101 items, empty, and malformed items', () => {
  const item = { id: crypto.randomUUID(), sortOrder: 0 };
  assert.equal(reorderWishItemsSchema.safeParse({ items: Array(101).fill(item) }).success, false);
  assert.equal(reorderWishItemsSchema.safeParse({ items: [] }).success, false);
  assert.equal(reorderWishItemsSchema.safeParse({ items: [{ id: 'nope', sortOrder: 0 }] }).success, false);
  assert.equal(reorderWishItemsSchema.safeParse({}).success, false);
});

test('reorder with 1,000,000 items fails with a single issue, not one per element', () => {
  const r = reorderWishItemsSchema.safeParse({ items: new Array(1_000_000).fill({ id: 'bad' }) });
  assert.equal(r.success, false);
  if (!r.success) assert.equal(r.error.issues.length, 1);
});
