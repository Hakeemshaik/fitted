import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import trap from '../api/trap.js';
import stylist from '../api/stylist.js';

const mk = (method, headers, url = '/api/stylist', body) => { const r = Readable.from(body ? [Buffer.from(body)] : []); Object.assign(r, { method, url, headers }); return r; };
const run = async (h, req) => { let out = { h: {} }; const res = { setHeader(k, v) { out.h[k.toLowerCase()] = v; }, end(b) { out.status = this.statusCode; out.body = String(b || ''); } }; await h(req, res); return out; };

test('cross-origin POSTs are refused', async () => {
  const r = await run(stylist, mk('POST', { host: 'fitted.app', origin: 'https://evil.example', 'x-real-ip': '1.1.1.1' }, '/api/stylist', '{}'));
  assert.equal(r.status, 403);
});

test('scanner user-agents are refused', async () => {
  const r = await run(stylist, mk('GET', { host: 'fitted.app', 'user-agent': 'sqlmap/1.7', 'x-real-ip': '1.1.1.2' }));
  assert.equal(r.status, 403);
});

test('honeypot serves bait, sets the trap cookie, and the IP is then blocked', async () => {
  const t = await run(trap, mk('GET', { host: 'fitted.app', 'x-real-ip': '6.6.6.6', 'user-agent': 'curl/8' }, '/api/trap?p=/.env'));
  assert.equal(t.status, 200); assert.match(t.body, /DB_PASSWORD=hp_/); assert.match(t.h['set-cookie'], /fz_t=1/);
  const after = await run(stylist, mk('GET', { host: 'fitted.app', 'x-real-ip': '6.6.6.6' }));
  assert.equal(after.status, 403);
  const withCookie = await run(stylist, mk('GET', { host: 'fitted.app', 'x-real-ip': '7.7.7.7', cookie: 'fz_t=1' }));
  assert.equal(withCookie.status, 403);
});

test('rate limit kicks in', async () => {
  let last;
  for (let i = 0; i < 22; i++) last = await run(stylist, mk('POST', { host: 'fitted.app', origin: 'https://fitted.app', 'x-real-ip': '9.9.9.9' }, '/api/stylist', '{}'));
  assert.equal(last.status, 429);
});
