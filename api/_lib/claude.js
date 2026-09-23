import Anthropic from '@anthropic-ai/sdk';
import { HttpError } from './http.js';

export const MODEL = process.env.FITTED_MODEL || 'claude-opus-5';
export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client = null;
export const setClient = c => { client = c; };
const getClient = () => client || (client = new Anthropic());

/** When FITTED_ACCESS_CODE is set, AI calls need the same code (Settings → Stylist AI). Stops strangers using your key. */
export function checkAccess(req) {
  const want = process.env.FITTED_ACCESS_CODE;
  if (!want) return;
  const got = req.headers && (req.headers['x-fitted-code'] || req.headers['X-Fitted-Code']);
  if (got !== want) throw new HttpError(401, 'Enter your access code in Settings to use the AI stylist.');
}

/** One structured-output call. Returns the parsed JSON object. */
export async function askJson({ system, messages, schema, maxTokens = 8000, effort = 'low' }) {
  if (!aiEnabled()) throw new HttpError(503, 'The AI stylist isn’t switched on for this app.');
  let r;
  try {
    r = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: { type: 'json_schema', schema } },
      system,
      messages
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError(500, 'The Anthropic API key on the server is invalid.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new HttpError(500, 'The Anthropic API key can’t use this model.');
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, 'The stylist is busy. Try again in a minute.');
    if (e instanceof Anthropic.BadRequestError) throw new HttpError(502, 'The stylist couldn’t read that request.');
    if (e instanceof Anthropic.APIError) throw new HttpError(502, 'The stylist is having trouble right now.');
    throw new HttpError(502, 'Couldn’t reach the stylist.');
  }
  if (r.stop_reason === 'refusal') throw new HttpError(422, 'The stylist can’t help with that one.');
  if (r.stop_reason === 'max_tokens') throw new HttpError(502, 'The stylist ran out of room. Try a shorter question.');
  const text = (r.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  try { return JSON.parse(text); } catch { throw new HttpError(502, 'The stylist sent back something unreadable.'); }
}
