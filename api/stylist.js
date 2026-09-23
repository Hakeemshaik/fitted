import { send, readJson, HttpError } from './_lib/http.js';
import { askJson, aiEnabled, checkAccess, MODEL } from './_lib/claude.js';
import { localEnabled, localStatus, localJson } from './_lib/llm.js';

const SLOTS = ['top', 'layer', 'bottom', 'shoes', 'extra'];
const str = (v, n) => String(v == null ? '' : v).slice(0, n);

const OUTFIT = {
  type: 'object', additionalProperties: false,
  required: ['name', 'why', 'top', 'layer', 'bottom', 'shoes', 'extra'],
  properties: {
    name: { type: 'string', description: 'Short catchy outfit name, 2-3 words' },
    why: { type: 'string', description: 'One sentence on why it works: colour, fit, weather or occasion' },
    top: { type: 'string', description: 'Item id, or empty string' },
    layer: { type: 'string', description: 'Item id, or empty string for none' },
    bottom: { type: 'string', description: 'Item id, or empty string' },
    shoes: { type: 'string', description: 'Item id, or empty string' },
    extra: { type: 'string', description: 'Item id, or empty string for none' }
  }
};
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['reply', 'outfits', 'quick'],
  properties: {
    reply: { type: 'string', description: 'Your answer to the user, plain text, no markdown' },
    outfits: { type: 'array', items: OUTFIT, description: '0 to 3 outfits built only from item ids in the closet' },
    quick: { type: 'array', items: { type: 'string' }, description: '2 or 3 short follow-up questions the user might tap next' }
  }
};

const SYSTEM = `You are Fitted, a personal stylist inside a closet app. The user is in South Africa (temperatures in °C, prices in rand, "braai" is a barbecue).

You get the user's closet as JSON: every item has an id, name, category (top, layer, bottom, shoes, extra), kind, colours (first is dominant), pattern, fit (slim, regular, relaxed, oversized), warmth 1-4, dressiness 1-5, styles, days since last worn, and owned. Items with owned=false are on their wishlist: things they are thinking of buying.

How you style:
- Colour: build on neutrals (black, white, grey, navy, denim, beige, cream, brown) with at most one or two accent colours. Echo an accent in a second piece (for example shoes that pick up a colour in the top). Complementary colours work as a small accent, not as two big pieces. Avoid three competing accents, two patterns in one fit, and navy directly against black.
- Fit: balance the silhouette. A relaxed or oversized top goes over slim or regular bottoms; baggy on baggy only works for casual streetwear. A layer should be as roomy as the top under it.
- Weather: shorts from about 20°C, a warm layer below about 14°C, no layer when it is hot, darker shoes when rain is likely.
- Occasion: match dressiness to the plan (work and date night need smarter pieces; gym needs sport pieces).
- Respect the user's saved style preferences (preferred fit, colours they love or avoid).
- Prefer pieces not worn recently.

Rules:
- Only use item ids that appear in the closet. An outfit needs a top, bottom and shoes; use an empty string for no layer or extra. Never invent items.
- Use owned=false items only when the user asks about their wishlist or about buying something, and say clearly which pieces they don't own yet.
- If the closet can't make what they ask for, say what is missing and what to buy, and return no outfit or the closest one.
- Reply in a warm, direct voice, at most 70 words, plain text with no markdown or lists. The outfit cards show the pieces, so don't list every item again.
- Only help with clothes, outfits, shopping for clothes and looking good. Politely steer anything else back to style.`;

/** GET /api/stylist -> { ai }  ·  POST /api/stylist -> { reply, outfits, quick } */
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const locked = !!process.env.FITTED_ACCESS_CODE;
      if (localEnabled()) {
        const st = await localStatus();
        if (st.online || !aiEnabled()) return send(res, 200, { ai: st.online, provider: 'local', model: st.model || null, reason: st.online ? null : st.detail, locked });
      }
      return send(res, 200, { ai: aiEnabled(), provider: aiEnabled() ? 'claude' : null, model: aiEnabled() ? MODEL : null, locked });
    }
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
    checkAccess(req);
    const body = await readJson(req);
    const closet = (Array.isArray(body.closet) ? body.closet : []).slice(0, 400).map(i => ({
      id: str(i.id, 24), name: str(i.name, 60), category: SLOTS.indexOf(i.category) > -1 ? i.category : 'top', kind: str(i.kind, 40),
      colours: (Array.isArray(i.colours) ? i.colours : []).slice(0, 3).map(c => str(c, 12)), pattern: str(i.pattern, 10), fit: str(i.fit, 10),
      warmth: +i.warmth || 2, dressiness: +i.dressiness || 2, styles: (Array.isArray(i.styles) ? i.styles : []).slice(0, 4).map(s => str(s, 10)),
      lastWornDays: i.lastWornDays == null ? null : +i.lastWornDays, owned: i.owned !== false, price: i.price == null ? null : +i.price
    }));
    if (!closet.length) throw new HttpError(400, 'Your closet is empty');
    const history = (Array.isArray(body.messages) ? body.messages : []).slice(-12)
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.text)
      .map(m => ({ role: m.role, content: str(m.text, 1200) }));
    while (history.length && history[0].role !== 'user') history.shift();
    if (!history.length || history[history.length - 1].role !== 'user') throw new HttpError(400, 'Ask a question');
    const context = {
      today: str(body.today, 40), weather: (Array.isArray(body.weather) ? body.weather : []).slice(0, 7),
      style: body.profile && typeof body.profile === 'object' ? { fit: str(body.profile.fit, 10), love: body.profile.love || [], avoid: body.profile.avoid || [] } : {},
      closet
    };
    const last = history.pop();
    const messages = history.concat([{ role: 'user', content: [
      { type: 'text', text: 'Context for this question (JSON):\n' + JSON.stringify(context) },
      { type: 'text', text: last.content }
    ] }]);
    let out;
    if (localEnabled()) {
      // Local models get plain-string turns (OpenAI format).
      const slim = Object.assign({}, context, { closet: closet.map(i => { const o = {}; for (const k in i) if (i[k] != null && i[k] !== '' && !(Array.isArray(i[k]) && !i[k].length)) o[k] = i[k]; return o; }) });
      const local = history.slice(-6).concat([{ role: 'user', content: 'Context for this question (JSON):\n' + JSON.stringify(slim) + '\n\nQuestion: ' + last.content + '\n\nAnswer as JSON: {"reply": string, "outfits": [{"name","why","top","layer","bottom","shoes","extra"}], "quick": [string]}' }]);
      try { out = await localJson({ system: SYSTEM, messages: local, schema: SCHEMA, name: 'stylist_reply' }); }
      catch (e) { if (!aiEnabled()) throw e; }
    }
    if (!out) out = await askJson({ system: SYSTEM, messages, schema: SCHEMA, maxTokens: 8000, effort: 'low' });
    const ids = {}; closet.forEach(i => { ids[i.id] = i.category; });
    const outfits = (out.outfits || []).slice(0, 3).map(o => {
      const items = {};
      SLOTS.forEach(k => { const id = o[k]; if (id && ids[id] === k) items[k] = id; });
      return items.top && items.bottom && items.shoes ? { items, name: str(o.name, 40), why: str(o.why, 240) } : null;
    }).filter(Boolean);
    send(res, 200, { reply: str(out.reply, 900), outfits, quick: (out.quick || []).slice(0, 3).map(q => str(q, 60)) });
  } catch (e) {
    send(res, e.status || 500, { error: e.expose ? e.message : 'The stylist hit a snag' });
  }
}
