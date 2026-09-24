import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { setClient } from '../api/_lib/claude.js';
import stylist from '../api/stylist.js';
import tag from '../api/tag.js';

const call = async (handler, method, body, headers = {}) => {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  Object.assign(req, { method, url: '/api/x', headers: Object.assign({ host: 'fitted.test', origin: 'https://fitted.test' }, headers) });
  let out;
  const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(b) { out = { status: this.statusCode, body: JSON.parse(b) }; } };
  await handler(req, res);
  return out;
};
const closet = [
  { id: 'm1', name: 'Milan jersey', category: 'top', colours: ['red', 'black'], owned: true },
  { id: 'j1', name: 'Denim jorts', category: 'bottom', colours: ['denim'], owned: true },
  { id: 's1', name: 'Black runners', category: 'shoes', colours: ['black'], owned: true }
];

test('status reports AI off without a key', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const r = await call(stylist, 'GET');
  assert.equal(r.body.ai, false);
});

test('stylist sends a structured request and drops invented ids', async () => {
  process.env.ANTHROPIC_API_KEY = 'test';
  let sent;
  setClient({ beta: { messages: { create: async p => { sent = p; return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({
    reply: 'Go matchday.', quick: ['Swap the shoes'],
    outfits: [
      { pick: 'c1', name: 'Matchday', why: 'Red pops.' },
      { pick: 'c7', name: 'Fake', why: 'x' },
      { pick: 'c1', name: 'Twice', why: 'x' }
    ] }) }] }; } } } });
  const candidates = [{ items: { top: 'm1', bottom: 'j1', shoes: 's1' }, look: 'Red pop' }, { items: { top: 'j1', bottom: 'm1', shoes: 's1' } }, { items: { top: 'nope', bottom: 'j1', shoes: 's1' } }];
  const r = await call(stylist, 'POST', { closet, candidates, need: 3, messages: [{ role: 'assistant', text: 'hi' }, { role: 'user', text: 'What should I wear?' }], weather: [{ day: 'Today', max: 22, min: 12, conditions: 'Sunny' }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.reply, 'Go matchday.');
  assert.equal(r.body.outfits.length, 1);
  assert.deepEqual(r.body.outfits[0].items, { top: 'm1', bottom: 'j1', shoes: 's1' });
  assert.equal(sent.model, 'claude-opus-5');
  assert.equal(sent.fallbacks, 'default');
  assert.deepEqual(sent.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(sent.output_config.format.type, 'json_schema');
  assert.equal(sent.messages[0].role, 'user');
  assert.match(sent.messages[0].content[0].text, /Milan jersey/);
  assert.deepEqual(sent.output_config.format.schema.properties.outfits.items.properties.pick.enum, ['c1'], 'only valid candidates reach the model');
});

test('refusal is surfaced as a friendly error', async () => {
  setClient({ beta: { messages: { create: async () => ({ stop_reason: 'refusal', content: [] }) } } });
  const r = await call(stylist, 'POST', { closet, messages: [{ role: 'user', text: 'x' }] });
  assert.equal(r.status, 422);
});

test('access code is enforced when set', async () => {
  process.env.FITTED_ACCESS_CODE = 'braai';
  const r = await call(stylist, 'POST', { closet, messages: [{ role: 'user', text: 'x' }] });
  assert.equal(r.status, 401);
  setClient({ beta: { messages: { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"reply":"ok","outfits":[],"quick":[]}' }] }) } } });
  const ok = await call(stylist, 'POST', { closet, messages: [{ role: 'user', text: 'x' }] }, { 'x-fitted-code': 'braai' });
  assert.equal(ok.status, 200);
  delete process.env.FITTED_ACCESS_CODE;
});

test('tag sends the image and maps the result', async () => {
  let sent;
  setClient({ beta: { messages: { create: async p => { sent = p; return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({
    found: true, name: 'Black hoodie', category: 'layer', kind: 'Hoodie', colours: ['black'], pattern: 'solid', fit: 'oversized', warmth: 3, dressiness: 1, styles: ['street'] }) }] }; } } } });
  const r = await call(tag, 'POST', { image: 'data:image/jpeg;base64,' + 'A'.repeat(400) });
  assert.equal(r.status, 200);
  assert.equal(r.body.category, 'layer');
  assert.equal(r.body.sub, 'hoodie');
  assert.equal(r.body.formality, 1);
  assert.equal(sent.messages[0].content[0].source.media_type, 'image/jpeg');
});

test('tag reads screenshots for the listing title and never rotates them', async () => {
  let sent;
  setClient({ beta: { messages: { create: async p => { sent = p; return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({
    found: true, name: 'Brazil 1998 home jersey', category: 'top', kind: 'football jersey', colours: ['yellow', 'green'], pattern: 'solid', fit: 'regular', warmth: 1, dressiness: 1, styles: ['sport'], rotate: 90 }) }] }; } } } });
  const r = await call(tag, 'POST', { image: 'data:image/jpeg;base64,' + 'A'.repeat(400), screenshot: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.rotate, 0);
  assert.equal(r.body.name, 'Brazil 1998 home jersey');
  assert.match(sent.messages[0].content[1].text, /screenshot/);
  const plain = await call(tag, 'POST', { image: 'data:image/jpeg;base64,' + 'A'.repeat(400) });
  assert.equal(plain.body.rotate, 90);
});
