import { send, readJson, HttpError } from './_lib/http.js';
import { askJson, checkAccess } from './_lib/claude.js';

const COLOURS = ['black', 'white', 'grey', 'silver', 'navy', 'denim', 'beige', 'cream', 'brown', 'olive', 'green', 'blue', 'purple', 'pink', 'red', 'burgundy', 'orange', 'yellow'];
const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['found', 'name', 'category', 'kind', 'colours', 'pattern', 'fit', 'warmth', 'dressiness', 'styles'],
  properties: {
    found: { type: 'boolean', description: 'false if there is no clothing item, shoe or accessory in the photo' },
    name: { type: 'string', description: 'Short name a person would use, colour first, e.g. "Black hoodie", "White Air Force 1s", max 4 words' },
    category: { type: 'string', enum: ['top', 'layer', 'bottom', 'shoes', 'extra'], description: 'layer = worn over a top: hoodie, jacket, coat, cardigan, blazer' },
    kind: { type: 'string', description: 'Plain garment type, e.g. t-shirt, football jersey, jeans, denim shorts, sneakers, cap' },
    colours: { type: 'array', items: { type: 'string', enum: COLOURS }, description: '1-3 colours, dominant first. Use denim for blue jean fabric.' },
    pattern: { type: 'string', enum: ['solid', 'striped', 'graphic', 'print', 'check'] },
    fit: { type: 'string', enum: ['slim', 'regular', 'relaxed', 'oversized'], description: 'Cut of the garment as it would sit on the body' },
    warmth: { type: 'integer', enum: [1, 2, 3, 4], description: '1 = summer, 4 = winter coat' },
    dressiness: { type: 'integer', enum: [1, 2, 3, 4, 5], description: '1 = gym or lounge, 3 = smart casual, 5 = formal' },
    styles: { type: 'array', items: { type: 'string', enum: ['casual', 'sport', 'street', 'smart', 'formal', 'lounge'] }, description: '1-3 styles' }
  }
};

/** POST /api/tag { image: base64 JPEG/PNG/WebP, hint?: text } -> tags for the closet */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
    checkAccess(req);
    const body = await readJson(req, 3_000_000);
    const m = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(body.image || '');
    const data = m ? body.image.slice(m[0].length) : body.image;
    const media = m ? m[1] : 'image/jpeg';
    if (!data || typeof data !== 'string' || data.length < 200) throw new HttpError(400, 'Send a photo');
    const hint = String(body.hint || '').slice(0, 200);
    const out = await askJson({
      system: 'You tag clothing photos for a closet app. Describe the single main item in the photo. Be accurate about colour and cut; do not guess brands you cannot see.',
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: media, data } },
        { type: 'text', text: hint ? 'The shop calls it: ' + hint + '\nTag this item.' : 'Tag this item.' }
      ] }],
      schema: SCHEMA, maxTokens: 4000, effort: 'low'
    });
    if (!out.found) throw new HttpError(422, 'Couldn’t spot a clothing item in that photo.');
    send(res, 200, {
      name: String(out.name || '').slice(0, 40), category: out.category, sub: String(out.kind || '').slice(0, 40).toLowerCase(),
      colours: (out.colours || []).filter(c => COLOURS.indexOf(c) > -1).slice(0, 3), pattern: out.pattern, fit: out.fit,
      warmth: out.warmth, formality: out.dressiness, styles: (out.styles || []).slice(0, 3)
    });
  } catch (e) {
    send(res, e.status || 500, { error: e.expose ? e.message : 'Tagging failed' });
  }
}
