import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Readable } from 'node:stream';
import stylist from '../api/stylist.js';

let mode = 'ok', seen = [];
const srv = http.createServer((req, res) => {
  let b = ''; req.on('data', c => { b += c; }); req.on('end', () => {
    seen.push({ url: req.url, headers: req.headers, body: b ? JSON.parse(b) : null });
    if (mode === 'down') { res.writeHead(502, { 'ngrok-error-code': 'ERR_NGROK_8012' }); return res.end(); }
    if (req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'llama-3.2-3b-instruct' }] })); }
    const body = JSON.parse(b);
    if (mode === 'noschema' && body.response_format) { res.writeHead(400); return res.end('{}'); }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: 'Sure!\n```json\n' + JSON.stringify({ reply: 'Go red.', quick: ['Swap shoes'], outfits: [{ name: 'Red', why: 'Pop.', top: 'm1', layer: '', bottom: 'j1', shoes: 's1', extra: '' }] }) + '\n```' } }] }));
  });
});
await new Promise(r => srv.listen(0, r));
const base = 'http://127.0.0.1:' + srv.address().port + '/v1';
test.after(() => srv.close());

const call = async (method, body) => {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  Object.assign(req, { method, url: '/api/stylist', headers: {} });
  let out; const res = { setHeader() {}, end(x) { out = { status: this.statusCode, body: JSON.parse(x) }; } };
  await stylist(req, res); return out;
};
const closet = [{ id: 'm1', name: 'Milan jersey', category: 'top' }, { id: 'j1', name: 'Jorts', category: 'bottom' }, { id: 's1', name: 'Runners', category: 'shoes' }];
const ask = { closet, messages: [{ role: 'user', text: 'What should I wear?' }] };

test('local model: status, chat, ngrok header', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  process.env.LLM_BASE_URL = base + '/'; process.env.LLM_MODEL = 'llama-3.2-3b-instruct';
  const st = await call('GET');
  assert.deepEqual([st.body.ai, st.body.provider, st.body.model], [true, 'local', 'llama-3.2-3b-instruct']);
  seen = [];
  const r = await call('POST', ask);
  assert.equal(r.status, 200); assert.equal(r.body.reply, 'Go red.');
  assert.deepEqual(r.body.outfits[0].items, { top: 'm1', bottom: 'j1', shoes: 's1' });
  assert.equal(seen[0].headers['ngrok-skip-browser-warning'], 'true');
  assert.equal(seen[0].body.model, 'llama-3.2-3b-instruct');
  assert.equal(seen[0].body.messages[0].role, 'system');
});

test('falls back to plain JSON when the server rejects json_schema', async () => {
  mode = 'noschema'; seen = [];
  const r = await call('POST', ask);
  assert.equal(r.status, 200); assert.equal(seen.length, 2); assert.ok(!seen[1].body.response_format);
});

test('reports which link is down', async () => {
  mode = 'ok'; process.env.LLM_MODEL = 'mistral-7b';
  assert.match((await call('GET')).body.reason, /isn’t loaded/);
  mode = 'down'; process.env.LLM_MODEL = 'llama-3.2-3b-instruct';
  assert.match((await call('GET')).body.reason, /LM Studio/);
  assert.equal((await call('POST', ask)).status, 503);
  process.env.LLM_BASE_URL = 'http://127.0.0.1:1/v1';
  const off = await call('GET'); assert.equal(off.body.ai, false); assert.match(off.body.reason, /asleep|ngrok/);
  delete process.env.LLM_BASE_URL; delete process.env.LLM_MODEL;
});

test('reads JSON out of thinking-model and chatty replies', async () => {
  const { firstJson } = await import('../api/_lib/llm.js');
  assert.deepEqual(firstJson('<think>maybe {a} or {"x":1}</think>\nHere: {"reply":"hi","outfits":[],"quick":[]} thanks'), { reply: 'hi', outfits: [], quick: [] });
  assert.deepEqual(firstJson('```json\n{"reply":"a {b}","outfits":[]}\n```'), { reply: 'a {b}', outfits: [] });
  assert.equal(firstJson('no json here'), null);
});
