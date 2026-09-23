/* Server-only client for a model running on your own PC (LM Studio, Ollama or any
   OpenAI-compatible server) reached through an ngrok tunnel. */
import { HttpError } from './http.js';

const cfg = () => ({
  base: (process.env.LLM_BASE_URL || '').replace(/\/+$/, ''),
  model: process.env.LLM_MODEL || '',
  key: process.env.LLM_API_KEY || 'lm-studio',
  // Some chat templates (e.g. Mistral 7B Instruct v0.2) have no system role.
  merge: process.env.LLM_MERGE_SYSTEM === '1'
});
export const localEnabled = () => !!cfg().base;

const headers = () => ({
  'content-type': 'application/json',
  authorization: 'Bearer ' + cfg().key,
  // Free ngrok serves an HTML warning page to requests without this header.
  'ngrok-skip-browser-warning': 'true'
});

async function timed(url, init, ms) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

function prepare(messages) {
  if (!cfg().merge) return messages;
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const rest = messages.filter(m => m.role !== 'system').map(m => ({ ...m }));
  const i = rest.findIndex(m => m.role === 'user');
  if (system && i > -1) rest[i].content = typeof rest[i].content === 'string' ? system + '\n\n---\n\n' + rest[i].content : [{ type: 'text', text: system }].concat(rest[i].content);
  return rest;
}

const REASONS = {
  not_configured: 'Local AI isn’t set up. Add LLM_BASE_URL in Vercel.',
  tunnel_offline: 'Your PC is asleep or ngrok isn’t running.',
  server_down: 'The tunnel is up but LM Studio’s server isn’t running.',
  model_missing: 'The model in LLM_MODEL isn’t loaded in LM Studio.',
  timeout: 'Your PC didn’t answer in time. It may be waking up or loading the model.',
  error: 'The local AI returned an error.'
};

/** Which link of app → ngrok → PC → LM Studio → model is working. */
export async function localStatus() {
  const c = cfg();
  if (!c.base) return { online: false, reason: 'not_configured', detail: REASONS.not_configured };
  try {
    const res = await timed(c.base + '/models', { headers: headers() }, 8000);
    const ngrokErr = res.headers.get('ngrok-error-code');
    if (ngrokErr === 'ERR_NGROK_3200') return { online: false, reason: 'tunnel_offline', detail: REASONS.tunnel_offline };
    if (ngrokErr || res.status === 502 || res.status === 504) return { online: false, reason: 'server_down', detail: REASONS.server_down };
    if (!res.ok) return { online: false, reason: 'error', detail: REASONS.error + ' (' + res.status + ')' };
    const models = (((await res.json().catch(() => null)) || {}).data || []).map(m => m.id);
    if (c.model && models.indexOf(c.model) < 0) return { online: false, reason: 'model_missing', detail: '“' + c.model + '” isn’t loaded. Loaded: ' + (models.join(', ') || 'none') + '.' };
    return { online: true, model: c.model || models[0] || '' };
  } catch (e) {
    const t = e && e.name === 'AbortError';
    return { online: false, reason: t ? 'timeout' : 'tunnel_offline', detail: t ? REASONS.timeout : REASONS.tunnel_offline };
  }
}

const firstJson = text => {
  const m = String(text || '').replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
};

/** JSON answer from the local model. Tries a strict JSON schema first, then plain "reply with JSON". */
export async function localJson({ system, messages, schema, name = 'answer', timeoutMs = 50000, maxTokens = 1200 }) {
  const c = cfg();
  if (!c.base) throw new HttpError(503, REASONS.not_configured);
  const all = prepare([{ role: 'system', content: system + '\n\nReply with a single JSON object and nothing else.' }].concat(messages));
  const call = async withSchema => {
    const body = { model: c.model || undefined, temperature: 0.3, max_tokens: maxTokens, messages: all };
    if (withSchema) body.response_format = { type: 'json_schema', json_schema: { name, strict: true, schema } };
    let res;
    try { res = await timed(c.base + '/chat/completions', { method: 'POST', headers: headers(), body: JSON.stringify(body) }, timeoutMs); }
    catch (e) { throw new HttpError(504, e && e.name === 'AbortError' ? REASONS.timeout : REASONS.tunnel_offline); }
    const ngrokErr = res.headers.get('ngrok-error-code');
    if (ngrokErr === 'ERR_NGROK_3200') throw new HttpError(503, REASONS.tunnel_offline);
    if (ngrokErr || res.status === 502 || res.status === 504) throw new HttpError(503, REASONS.server_down);
    const j = await res.json().catch(() => null);
    if (!res.ok) return { retry: withSchema && res.status >= 400 && res.status < 500, err: res.status };
    return { out: firstJson(j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) };
  };
  let r = await call(true);
  if (r.retry || (!r.err && !r.out)) r = await call(false);
  if (r.err) throw new HttpError(502, REASONS.error + ' (' + r.err + ')');
  if (!r.out) throw new HttpError(502, 'The local AI sent back something unreadable.');
  return r.out;
}
