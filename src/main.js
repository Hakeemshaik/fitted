import {
  CATS, CATLABEL, ONE, VIBES, STYLES, PATTERNS, FITS, COLOURS, NEUTRAL, WMO, cond, cap, nm, iso, daysAgo, today0,
  normItem, createEngine, guessFromText, pairsWith
} from './engine.js';
import { store, imgs, blobToDataUrl, dataUrlToBlob } from './db.js';
import { processPhoto, forTagging } from './vision.js';

/* ---------- helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = o => JSON.parse(JSON.stringify(o));
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAY = 86400000;
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

const P = {
  home: '<path d="M4 11.2 12 4.8l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  hanger: '<path d="M10 6.2a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.6v1.2M12 10.7 3.6 16.3c-.9.6-.5 1.7.5 1.7h15.8c1 0 1.4-1.1.5-1.7L12 10.7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  sparkle: '<path d="M12 3.5l1.7 5.4 5.3 1.7-5.3 1.7L12 17.7l-1.7-5.4L5 10.6l5.3-1.7Z" fill="currentColor"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" fill="currentColor"/>',
  create: '<rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  grid: '<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="2.2"/><rect x="13" y="4" width="7" height="7" rx="2.2"/><rect x="4" y="13" width="7" height="7" rx="2.2"/><rect x="13" y="13" width="7" height="7" rx="2.2"/></g>',
  camera: '<path d="M4 9a2.5 2.5 0 0 1 2.5-2.5h1.7L9.6 4.5h4.8l1.4 2h1.7A2.5 2.5 0 0 1 20 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  photo: '<rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5L19 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  search: '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  heart: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6Z" fill="currentColor"/>',
  hearto: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  check: '<path d="M6.5 12.5l3.7 3.7L17.5 8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  sun: '<circle cx="12" cy="12" r="4" fill="#FFC53D"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" stroke="#FFC53D" stroke-width="1.8" stroke-linecap="round"/>',
  cloud: '<path d="M7.5 18h9.2a3.8 3.8 0 0 0 .4-7.6A5.3 5.3 0 0 0 7 11.6 3.2 3.2 0 0 0 7.5 18Z" fill="#C9C3D1"/>',
  partly: '<circle cx="9" cy="9" r="3.5" fill="#FFC53D"/><path d="M9 2.5v1.5M2.5 9H4M4.4 4.4l1 1M13.6 4.4l-1 1" stroke="#FFC53D" stroke-width="1.6" stroke-linecap="round"/><path d="M9 19h8.2a3.4 3.4 0 0 0 .4-6.8A4.8 4.8 0 0 0 8.4 13.3 2.9 2.9 0 0 0 9 19Z" fill="#C9C3D1"/>',
  rain: '<path d="M7.5 14h9.2a3.8 3.8 0 0 0 .4-7.6A5.3 5.3 0 0 0 7 7.6 3.2 3.2 0 0 0 7.5 14Z" fill="#B7B0C2"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" stroke="#3D5BFF" stroke-width="1.8" stroke-linecap="round"/>',
  shuffle: '<path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.5 0 2.5-1.4 3.3-3.2M13.2 10.2C14 8.4 15 7 16.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z" fill="currentColor"/>',
  chev: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  down: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6 6l1.7 1.7M16.3 16.3 18 18M6 18l1.7-1.7M16.3 7.7 18 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  bag: '<path d="M5.5 8h13l-1 12h-11Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M17 14v4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 5 18V8.5A1.5 1.5 0 0 1 6.5 7H10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  chat: '<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16a2 2 0 0 1-2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  dl: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  ul: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  palette: '<path d="M12 4a8 8 0 1 0 0 16c1.1 0 1.7-.8 1.7-1.6 0-1.3-1.2-1.6-1.2-2.7 0-.9.7-1.5 1.6-1.5H16a4 4 0 0 0 4-4C20 6.9 16.4 4 12 4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="11" r="1.2" fill="currentColor"/><circle cx="11" cy="7.8" r="1.2" fill="currentColor"/><circle cx="15" cy="8.4" r="1.2" fill="currentColor"/>'
};
const ic = (n, s) => { s = s || 22; return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>'; };

/* ---------- seed data ---------- */
const SEED_ITEMS = [
  { id: 'm1', img: 'img/milan.webp', name: 'Milan jersey', category: 'top', sub: 'football jersey', colours: ['red', 'black'], pattern: 'striped', fit: 'regular', warmth: 1, formality: 1, styles: ['sport', 'street'], fav: true, owned: true, added: daysAgo(120) },
  { id: 'g1', img: 'img/germany.webp', name: 'Germany jersey', category: 'top', sub: 'football jersey', colours: ['white', 'black', 'orange'], pattern: 'graphic', fit: 'regular', warmth: 1, formality: 1, styles: ['sport', 'street'], fav: false, owned: true, added: daysAgo(90) },
  { id: 'j1', img: 'img/jorts.webp', name: 'Denim jorts', category: 'bottom', sub: 'denim shorts', colours: ['denim'], pattern: 'solid', fit: 'relaxed', warmth: 1, formality: 2, styles: ['casual', 'street'], fav: true, owned: true, added: daysAgo(200) },
  { id: 's1', img: 'img/black.webp', name: 'Black runners', category: 'shoes', sub: 'sneakers', colours: ['black'], pattern: 'solid', fit: 'regular', warmth: 2, formality: 2, styles: ['street', 'sport'], fav: false, owned: true, added: daysAgo(150) },
  { id: 's2', img: 'img/shox.webp', name: 'White Shox', category: 'shoes', sub: 'sneakers', colours: ['white', 'silver'], pattern: 'solid', fit: 'regular', warmth: 2, formality: 2, styles: ['street', 'casual'], fav: true, owned: true, added: daysAgo(60) }
];
const SEED_OUTFITS = [
  { id: 'o1', name: 'Matchday red', items: { top: 'm1', bottom: 'j1', shoes: 's1' }, vibe: 'Casual', reason: 'Black runs through the Milan jersey and the runners, tying the fit together.', by: 'ai', saved: daysAgo(20) },
  { id: 'o2', name: 'Clean whites', items: { top: 'g1', bottom: 'j1', shoes: 's2' }, vibe: 'Braai', reason: 'White jersey and white Shox, easy in the sun.', by: 'ai', saved: daysAgo(40) }
];
const SEED_WEAR = [
  { date: daysAgo(3), items: { top: 'm1', bottom: 'j1', shoes: 's1' } },
  { date: daysAgo(10), items: { top: 'm1', bottom: 'j1', shoes: 's1' } },
  { date: daysAgo(36), items: { top: 'g1', bottom: 'j1', shoes: 's2' } }
];
const EMPTY_BUILD = () => ({ top: null, layer: null, bottom: null, shoes: null, extra: null });

/* ---------- state ---------- */
const S = {
  items: store.get('items', clone(SEED_ITEMS)).map(normItem),
  outfits: store.get('outfits', clone(SEED_OUTFITS)),
  wear: store.get('wear', clone(SEED_WEAR)),
  fb: store.get('fb', { like: {}, skip: {} }),
  profile: Object.assign({ fit: '', love: [], avoid: [] }, store.get('profile', {})),
  set: Object.assign({ hintOff: false, loc: { lat: -26.2041, lon: 28.0473, name: 'Johannesburg' }, code: '', chatUsed: false }, store.get('settings', {})),
  seen: store.get('seen2', false),
  tab: 'home', vibe: 'Casual', forecast: null, wxLive: false,
  today: [], todayIdx: 0, scroll: {},
  closetView: 'owned', closetCat: 'all', closetQ: '',
  build: EMPTY_BUILD(), buildWish: false, rating: null,
  ai: { on: false, locked: false }
};
const E = createEngine(S);
const IMG = {};
const src = it => (it.img === 'idb' ? IMG[it.id] || '' : it.img);
function persist() {
  const ok = store.set('items', S.items) && store.set('outfits', S.outfits) && store.set('wear', S.wear) && store.set('fb', S.fb) && store.set('profile', S.profile) && store.set('settings', S.set);
  if (!ok) toast('Storage is full', 'Remove a few items to save more.');
}
const owned = () => S.items.filter(i => i.owned);
const wishes = () => S.items.filter(i => !i.owned);
const money = (n, cur) => (n == null ? '' : (!cur || cur === 'ZAR' ? 'R ' : cur + ' ') + Number(n).toLocaleString('en-ZA', { maximumFractionDigits: n % 1 ? 2 : 0 }));

/* ---------- weather ---------- */
function sampleForecast() {
  const out = [], base = today0(), pat = [[22, 12, 2, 10], [19, 10, 3, 20], [24, 14, 0, 0], [18, 9, 61, 70], [21, 11, 1, 10], [24, 16, 0, 5], [23, 14, 2, 10]];
  for (let i = 0; i < 7; i++) { const d = new Date(base.getTime() + i * DAY), p = pat[d.getDay()]; out.push({ date: iso(d), max: p[0], min: p[1], code: p[2], rain: p[3] }); }
  return out;
}
S.forecast = sampleForecast();
const wxFor = off => S.forecast[Math.min(Math.max(off, 0), S.forecast.length - 1)];
function loadWeather() {
  const l = S.set.loc;
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + l.lat + '&longitude=' + l.lon + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=7';
  fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined }).then(r => r.json()).then(j => {
    if (!j.daily || !j.daily.time) return;
    S.forecast = j.daily.time.map((d, i) => ({ date: d, max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]), code: j.daily.weather_code[i], rain: j.daily.precipitation_probability_max[i] || 0 }));
    S.wxLive = true; refresh(); render();
  }).catch(() => {});
}

/* ---------- AI availability ---------- */
let aiChecked = 0;
function checkAI() {
  aiChecked = Date.now();
  fetch('/api/stylist', { headers: { accept: 'application/json' } }).then(r => (r.ok ? r.json() : null)).then(j => {
    S.ai = { on: !!(j && j.ai), locked: !!(j && j.locked), provider: j && j.provider, model: j && j.model, reason: j && j.reason };
    const st = $('#aistatus'), local = S.ai.provider === 'local';
    st.innerHTML = '<i class="' + (S.ai.on ? 'on' : '') + '"></i>' + esc(S.ai.on ? (local ? 'Local AI' + (S.ai.model ? ' · ' + S.ai.model : '') : 'AI stylist · knows your closet')
      : local ? 'PC offline · using style rules' : 'Style rules');
    st.title = S.ai.reason || '';
  }).catch(() => {});
}
const aiHeaders = () => ({ 'content-type': 'application/json', 'x-fitted-code': S.set.code || '' });

/* ---------- outfit helpers ---------- */
function refresh() {
  S.today = E.candidates({ weather: wxFor(0), vibe: S.vibe });
  if (S.todayIdx >= S.today.length) S.todayIdx = 0;
}
function plate(ids, cls) {
  const p = E.resolve(ids || {});
  let h = '';
  ['layer', 'top', 'bottom', 'shoes', 'extra'].forEach(k => {
    const it = p[k]; if (!it) return;
    h += '<span class="pc ' + k + '" data-k="' + k + '"><img src="' + esc(src(it)) + '" alt="' + esc(it.name) + '" draggable="false">' + (it.owned ? '' : '<b class="wtag">Wishlist</b>') + '</span>';
  });
  return '<div class="plate' + (p.layer ? ' L' : '') + (cls ? ' ' + cls : '') + '">' + h + '</div>';
}
const swatches = (list, big) => '<span class="sw' + (big ? ' big' : '') + '">' + (list || []).map(c => '<i style="background:' + COLOURS[c] + '" title="' + c + '"></i>').join('') + '</span>';
const itemNames = ids => ['top', 'layer', 'bottom', 'shoes', 'extra'].filter(k => ids[k] && E.byId(ids[k])).map(k => E.byId(ids[k]).name).join(', ');
function itemCard(it) {
  const d = E.lastWornDays(it.id);
  const meta = it.owned ? cap(it.fit) + ' · ' + (d === Infinity ? 'Never worn' : d === 0 ? 'Worn today' : d + 'd ago') : (it.price ? money(it.price, it.currency) : 'Wishlist') + (it.shop ? ' · ' + it.shop : '');
  return '<button class="item" data-act="item" data-id="' + it.id + '"><span class="ph"><img src="' + esc(src(it)) + '" alt="" draggable="false"></span>' +
    (it.fav ? '<span class="fav">' + ic('heart', 14) + '</span>' : '') + (it.owned ? '' : '<span class="wbadge">' + ic('bag', 13) + '</span>') +
    '<b>' + esc(it.name) + '</b><small>' + swatches(it.colours) + esc(meta) + '</small></button>';
}
function tile(o) {
  const n = S.wear.filter(w => E.comboKey(w.items) === E.comboKey(o.items)).length;
  return '<button class="tile" data-act="fit" data-id="' + o.id + '">' + plate(o.items, 'sm') + '<b>' + esc(o.name) + '</b><small>Worn ' + n + '× · ' + esc(o.vibe) + '</small></button>';
}
function fitCard(c, opts) {
  opts = opts || {};
  const tags = '<div class="tags"><span class="tag">' + swatches(c.colour.swatches) + esc(c.colour.label) + '</span>' + (c.shape && c.shape.label ? '<span class="tag">' + esc(c.shape.label) + '</span>' : '') + '</div>';
  const worn = S.wear.some(w => w.date === iso(new Date()) && E.comboKey(w.items) === E.comboKey(c.items));
  return '<div class="fit' + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
    '<div class="pos">' + plate(c.items) + (opts.stamps ? '<span class="stamp keep">SAVE</span><span class="stamp skip">SKIP</span>' : '') + '</div>' +
    '<div class="body"><h3>' + esc(c.name) + '</h3><p class="why">' + esc(c.reason) + '</p>' + tags + '</div>' +
    (opts.acts ? '<div class="acts"><button class="circ glass" data-act="today-skip" aria-label="Skip">' + ic('x') + '</button>' +
      '<button class="btn ' + (worn ? 'done' : 'ink') + '" data-act="today-wear">' + ic('check', 18) + (worn ? 'Worn today' : 'Wear it') + '</button>' +
      '<button class="circ love" data-act="today-save" aria-label="Save fit">' + ic('heart') + '</button></div>' : '') + '</div>';
}
function saveOutfit(c, name) {
  const key = E.comboKey(c.items), ex = S.outfits.filter(o => E.comboKey(o.items) === key)[0];
  if (ex) { toast('Already in your Fits', ex.name); return ex; }
  const o = { id: uid(), name: name || c.name, items: clone(c.items), vibe: c.vibe || 'Casual', reason: c.reason || '', by: c.by || 'ai', saved: iso(new Date()) };
  S.outfits.unshift(o);
  CATS.forEach(k => { if (c.items[k]) S.fb.like[c.items[k]] = (S.fb.like[c.items[k]] || 0) + 1; });
  persist();
  toast('Fit saved', 'Added to Fits as “' + o.name + '”', () => { S.outfits = S.outfits.filter(x => x.id !== o.id); persist(); render(); });
  return o;
}
function skipFeedback(c) { CATS.forEach(k => { if (c.items[k]) S.fb.skip[c.items[k]] = (S.fb.skip[c.items[k]] || 0) + 1; }); persist(); }
function logWorn(ids) {
  const d = iso(new Date()), items = {};
  CATS.forEach(k => { if (ids[k]) items[k] = ids[k]; });
  S.wear = S.wear.filter(w => w.date !== d);
  S.wear.push({ date: d, items });
  persist(); toast('Logged for today', itemNames(items));
}

/* ---------- screens ---------- */
const screens = $('#screens');
function render() {
  const prev = $('#scr'); if (prev) S.scroll[prev.dataset.tab] = prev.scrollTop;
  const h = { home: rHome, closet: rCloset, build: rBuild, fits: rFits }[S.tab]();
  screens.innerHTML = '<div class="screen" id="scr" data-tab="' + S.tab + '">' + h + '</div>';
  $('#scr').scrollTop = S.scroll[S.tab] || 0;
  rTabs();
  $('#barhint').classList.toggle('on', !S.set.chatUsed && S.seen);
}
function header(title, sub) {
  return '<div class="title"><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>';
}
function rHome() {
  const w = wxFor(0), date = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  let h = '<div class="topbar"><button class="wx glass" data-act="weather" aria-label="Weather for ' + esc(S.set.loc.name) + '">' + ic(WMO(w.code)[1], 22) + '<b>' + w.max + '°</b><small>' + esc(cond(w)) + '</small></button>' +
    '<button class="circ glass" data-act="settings" aria-label="Settings">' + ic('gear') + '</button></div>';
  h += '<div class="title"><p class="over">' + esc(date) + '</p><h1>Today’s fit</h1></div>';
  if (!S.set.hintOff && !isStandalone()) h += '<div class="hint glass">' + ic('share', 24) + '<div><b>Install Fitted</b>In Safari tap Share, then Add to Home Screen.</div><button class="x" data-act="hintoff" aria-label="Dismiss">' + ic('x', 18) + '</button></div>';
  if (!owned().length) return h + emptyCloset();
  h += '<div class="seg five" role="tablist">' + VIBES.map(v => '<button role="tab" class="' + (S.vibe === v ? 'on' : '') + '" data-act="vibe" data-v="' + v + '" aria-selected="' + (S.vibe === v) + '">' + (v === 'Date night' ? 'Date' : v) + '</button>').join('') + '</div>';
  const c = S.today[S.todayIdx], n = S.today[(S.todayIdx + 1) % Math.max(1, S.today.length)];
  if (c) {
    h += '<div class="stack" id="stack">' + (n && n !== c ? fitCard(n, { cls: 'back' }) : '') + fitCard(c, { acts: true, stamps: true, id: 'topcard' }) + '</div>';
    h += '<p class="helper">Swipe right to save · left to skip · tap a piece to swap it</p>';
  } else h += '<div class="card empty"><b>Add a top, bottoms and shoes</b><p>Fitted needs one of each to build a fit.</p><button class="btn primary" data-act="add">' + ic('plus', 18) + 'Add clothes</button></div>';
  const wl = wishes();
  h += '<div class="sec"><h2>Try before you buy</h2>' + (wl.length ? '<button data-act="closet-wish">Wishlist</button>' : '') + '</div>';
  if (wl.length) h += wl.slice(0, 3).map(wishCard).join('');
  else h += '<button class="promo glass" data-act="link"><span class="dot">' + ic('link') + '</span><span><b>Paste a link from any shop</b><small>See how it works with your closet before you spend.</small></span>' + ic('chev', 20) + '</button>';
  const old = owned().filter(i => E.lastWornDays(i.id) >= 30);
  if (old.length) h += '<div class="sec"><h2>Give these some love</h2><button data-act="style-these">Style one</button></div><div class="hscroll">' + old.map(itemCard).join('') + '</div>';
  return h;
}
function wishCard(it) {
  const cp = E.compat(it.id, wxFor(0)), best = cp && cp.best[0];
  return '<button class="wishc" data-act="item" data-id="' + it.id + '"><span class="th"><img src="' + esc(src(it)) + '" alt=""></span><span class="mid"><b>' + esc(it.name) + '</b><small>' + esc([money(it.price, it.currency), it.shop].filter(Boolean).join(' · ') || 'Wishlist') + '</small>' +
    '<em class="lvl ' + (cp ? cp.level : 'low') + '">' + esc(cp ? cp.verdict : '') + '</em></span>' + (best ? '<span class="mini">' + plate(best.items, 'sm') + '</span>' : '') + '</button>';
}
function emptyCloset() {
  return '<div class="card empty"><b>Your closet is empty</b><p>Snap your first item or paste a shop link to get started.</p><div class="acts2"><button class="btn primary" data-act="add">' + ic('camera', 18) + 'Add clothes</button><button class="btn ghost" data-act="link">' + ic('link', 18) + 'Shop link</button></div></div>';
}
function rCloset() {
  const o = owned(), wl = wishes(), list = S.closetView === 'owned' ? o : wl;
  let h = header('Closet', o.length + ' item' + (o.length === 1 ? '' : 's') + (wl.length ? ' · ' + wl.length + ' on your wishlist' : ''));
  h += '<div class="seg two"><button class="' + (S.closetView === 'owned' ? 'on' : '') + '" data-act="cview" data-v="owned">My clothes</button><button class="' + (S.closetView === 'wish' ? 'on' : '') + '" data-act="cview" data-v="wish">' + ic('bag', 16) + 'Wishlist</button></div>';
  h += '<label class="search glass">' + ic('search', 20) + '<input id="cq" type="search" placeholder="Search colour, type or name" value="' + esc(S.closetQ) + '" autocomplete="off" enterkeyhint="search"></label>';
  h += '<div class="chips wrap">' + ['all'].concat(CATS).map(k => { const n = k === 'all' ? list.length : list.filter(i => i.category === k).length; return '<button class="pill' + (S.closetCat === k ? ' on' : '') + '" data-act="ccat" data-c="' + k + '">' + (k === 'all' ? 'All' : CATLABEL[k]) + ' <span>' + n + '</span></button>'; }).join('') + '</div>';
  h += '<div id="cgrid">' + closetGrid() + '</div>';
  return h;
}
function closetGrid() {
  const q = S.closetQ.trim().toLowerCase();
  const list = S.items.filter(i => (S.closetView === 'owned' ? i.owned : !i.owned) && (S.closetCat === 'all' || i.category === S.closetCat) &&
    (!q || (i.name + ' ' + i.sub + ' ' + i.category + ' ' + i.fit + ' ' + i.colours.join(' ') + ' ' + i.styles.join(' ') + ' ' + (i.shop || '')).toLowerCase().indexOf(q) > -1));
  if (list.length) return '<div class="items">' + list.map(itemCard).join('') + '</div>';
  if (q) return '<div class="card empty"><b>Nothing matches “' + esc(q) + '”</b><p>Try a colour like “black” or a type like “shoes”.</p></div>';
  if (S.closetView === 'wish') return '<div class="card empty"><b>Your wishlist is empty</b><p>Paste a link from any online shop. Fitted pulls in the photo and price so you can build fits with it before you buy.</p><button class="btn primary" data-act="link">' + ic('link', 18) + 'Paste a shop link</button></div>';
  return '<div class="card empty"><b>No ' + (S.closetCat === 'all' ? 'items' : CATLABEL[S.closetCat].toLowerCase()) + ' yet</b><p>Snap a photo of one to add it.</p><button class="btn primary" data-act="add">' + ic('camera', 18) + 'Add clothes</button></div>';
}
function rBuild() {
  const b = S.build, filled = CATS.filter(k => b[k]).length;
  const slot = (k, wide) => {
    const it = b[k] && E.byId(b[k]);
    if (it) return '<button class="slot' + (wide ? ' wide' : '') + '" data-act="slot" data-k="' + k + '"><span class="over">' + ONE[k] + '</span><img src="' + esc(src(it)) + '" alt="' + esc(it.name) + '" draggable="false">' + (it.owned ? '' : '<b class="wtag">Wishlist</b>') + '</button>';
    return '<button class="slot empty' + (wide ? ' wide' : '') + '" data-act="slot" data-k="' + k + '"><span class="plus">' + ic('plus', 18) + '</span>Add ' + ONE[k].toLowerCase() + (k === 'layer' || k === 'extra' ? '<small>optional</small>' : '') + '</button>';
  };
  let h = header('Build a fit', 'Tap a slot or pick pieces below. Mix in wishlist pieces to try before you buy.');
  h += '<div class="canvas"><div class="grid">' + slot('top') + slot('layer') + slot('bottom') + slot('shoes') + slot('extra', true) + '</div>' +
    '<div class="foot"><span>' + filled + ' of 5 filled</span><button data-act="build-clear"' + (filled ? '' : ' disabled') + '>Clear</button></div></div>';
  const wl = wishes();
  h += '<div class="seg two small"><button class="' + (S.buildWish ? '' : 'on') + '" data-act="bwish" data-v="0">My clothes</button><button class="' + (S.buildWish ? 'on' : '') + '" data-act="bwish" data-v="1">' + ic('bag', 15) + 'Wishlist' + (wl.length ? ' (' + wl.length + ')' : '') + '</button></div>';
  const pool = S.buildWish ? wl : owned();
  h += pool.length ? '<div class="strip glass">' + pool.map(i => '<button data-act="strip" data-id="' + i.id + '" class="' + (b[i.category] === i.id ? 'on' : '') + '" aria-label="' + esc(i.name) + '"><img src="' + esc(src(i)) + '" alt="" draggable="false"></button>').join('') + '</div>'
    : '<button class="promo glass" data-act="link"><span class="dot">' + ic('link') + '</span><span><b>No wishlist pieces yet</b><small>Paste a shop link to try something on with your closet.</small></span>' + ic('chev', 20) + '</button>';
  h += '<div class="acts2"><button class="btn primary" data-act="complete">' + ic('sparkle', 18) + 'Complete it</button><button class="btn ghost" data-act="rate">' + ic('star', 18) + 'Rate my fit</button></div>';
  if (S.rating) {
    const r = S.rating, bar = (l, v, sub) => '<div class="bar2"><span>' + l + '</span><i><b style="width:' + v * 10 + '%"></b></i><em>' + v + '</em>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    const wish = CATS.map(k => b[k] && E.byId(b[k])).filter(i => i && !i.owned), cost = wish.reduce((a, i) => a + (i.price || 0), 0);
    h += '<div class="rating glass"><div class="score"><span class="over">Fit check</span><div class="sc">' + r.overall + '<small>/10</small></div>' + swatches(r.swatches, true) + '</div>' +
      bar('Colour', r.colour, r.colourLabel) + bar('Fit', r.fit, r.fitLabel) + bar('Weather', r.weather, wxFor(0).max + '° ' + cond(wxFor(0)).toLowerCase()) +
      '<p>' + esc(r.verdict) + '</p>' + (wish.length ? '<p class="wishnote">' + ic('bag', 16) + 'Includes ' + wish.length + ' wishlist piece' + (wish.length > 1 ? 's' : '') + (cost ? ' · ' + money(cost, wish[0].currency) : '') + '</p>' : '') + '</div>';
  }
  if (b.top && b.bottom && b.shoes) h += '<button class="btn ink block" style="margin-top:14px" data-act="build-save">' + ic('heart', 18) + 'Save this fit</button>';
  return h;
}
function rFits() {
  const start0 = today0(), start = new Date(start0.getTime() - ((start0.getDay() + 6) % 7) * DAY);
  let logged = 0, days = '';
  for (let i = 0; i < 7; i++) {
    const d = iso(start.getTime() + i * DAY), isT = d === iso(new Date()), wr = S.wear.filter(x => x.date === d)[0];
    if (wr) logged++;
    const top = wr && E.byId(wr.items.top);
    days += '<button class="' + (isT ? 'today' : '') + (wr ? ' logged' : '') + '" data-act="' + (isT ? 'wear-today' : 'noop') + '"' + (isT ? ' aria-label="Log today’s fit"' : '') + '><span>' + 'MTWTFSS'[i] + '</span>' + (top ? '<img src="' + esc(src(top)) + '" alt="">' : isT ? ic('plus', 16) : '<em></em>') + '</button>';
  }
  let h = header('Fits', S.outfits.length + ' saved · ' + logged + ' of 7 days logged this week');
  h += '<div class="wk glass"><div class="row"><b>This week</b><small>Tap today to log what you wore</small></div><div class="days">' + days + '</div></div>';
  h += '<div class="sec"><h2>Saved fits</h2><button data-act="tab" data-tab="build">New fit</button></div>';
  h += S.outfits.length ? '<div class="tiles">' + S.outfits.map(tile).join('') + '</div>' : '<div class="card empty"><b>No saved fits yet</b><p>Tap ♥ on Today’s fit, or build one yourself.</p><button class="btn primary" data-act="tab" data-tab="build">' + ic('create', 18) + 'Build a fit</button></div>';
  return h;
}
function rTabs() {
  const t = [['home', 'home', 'Today'], ['closet', 'hanger', 'Closet'], null, ['build', 'create', 'Build'], ['fits', 'grid', 'Fits']];
  $('#tabs').innerHTML = t.map(x => x ? '<button class="tab' + (S.tab === x[0] ? ' on' : '') + '" data-act="tab" data-tab="' + x[0] + '"' + (S.tab === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[1]) + '<span>' + x[2] + '</span></button>'
    : '<button class="addbtn" data-act="add" aria-label="Add clothes">' + ic('plus', 26) + '</button>').join('');
}

/* ---------- sheets ---------- */
const sheetWrap = $('#sheetwrap'), sheet = $('#sheet');
let onSheetClose = null;
function openSheet(title, html, after) {
  if (onSheetClose) { const f = onSheetClose; onSheetClose = null; f(); }
  sheet.innerHTML = '<div class="sh"><h3>' + esc(title) + '</h3><button class="circ ghostc" data-close="1" aria-label="Close">' + ic('x', 18) + '</button></div><div class="sc">' + html + '</div>';
  sheetWrap.classList.add('on');
  sheet.onclick = null; sheet.oninput = null;
  $('[data-close]', sheet).onclick = closeSheet;
  if (after) after(sheet);
  const sh = $('.sh', sheet); let y0 = null;
  sh.onpointerdown = e => { if (e.target.closest('button')) return; y0 = e.clientY; try { sh.setPointerCapture(e.pointerId); } catch (x) {} };
  sh.onpointermove = e => { if (y0 == null) return; const d = Math.max(0, e.clientY - y0); sheet.style.transition = 'none'; sheet.style.transform = 'translateY(' + d + 'px)'; };
  sh.onpointerup = sh.onpointercancel = e => { const d = y0 == null ? 0 : e.clientY - y0; y0 = null; sheet.style.transition = ''; sheet.style.transform = ''; if (d > 90) closeSheet(); };
}
function closeSheet() { sheetWrap.classList.remove('on'); if (onSheetClose) { const f = onSheetClose; onSheetClose = null; f(); } }
$('#sheetbd').addEventListener('click', closeSheet);
function busySheet(title, msg) { openSheet(title, '<div class="busy"><span class="spin"></span><p>' + esc(msg) + '</p></div>'); }

function kv(k, v) { return '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>'; }
function itemSheet(id) {
  const it = E.byId(id); if (!it) return;
  const d = E.lastWornDays(id), n = S.wear.filter(w => CATS.some(k => w.items[k] === id)).length;
  let h = '<div class="bigph"><img src="' + esc(src(it)) + '" alt="' + esc(it.name) + '"></div>';
  if (!it.owned) {
    const cp = E.compat(id, wxFor(0));
    h += '<div class="compat ' + (cp ? cp.level : 'low') + '"><b>' + esc(cp ? cp.verdict : 'Add more clothes to see how this fits in.') + '</b>' +
      (cp && cp.best[0] ? plate(cp.best[0].items) + '<p>' + esc(cp.best[0].reason) + '</p>' : '') + '</div>';
    h += '<div class="acts2"><button class="btn primary" data-a="build">' + ic('create', 18) + 'Open in Build</button><button class="btn ghost" data-a="bought">' + ic('check', 18) + 'I bought it</button></div>';
    if (it.url) h += '<a class="btn ghost block" style="margin-top:12px" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + ic('external', 18) + 'View at ' + esc(it.shop || 'the shop') + (it.price ? ' · ' + money(it.price, it.currency) : '') + '</a>';
  }
  h += '<div class="kvs">' + kv('Type', esc(cap(it.sub || it.category))) + kv('Fit', esc(cap(it.fit))) + kv('Colour', swatches(it.colours) + esc(it.colours.join(', '))) +
    kv('Pattern', esc(cap(it.pattern))) + kv('Warmth', '●'.repeat(it.warmth) + '<span class="off">' + '●'.repeat(4 - it.warmth) + '</span>') + kv('Style', esc(it.styles.map(cap).join(' · '))) +
    (it.owned ? kv('Worn', n + '× · ' + (d === Infinity ? 'never' : d === 0 ? 'today' : d + ' days ago')) : '') + '</div>';
  h += '<div class="acts2"><button class="btn ghost" data-a="fav">' + ic(it.fav ? 'heart' : 'hearto', 18) + (it.fav ? 'Favourite' : 'Favourite it') + '</button><button class="btn ' + (it.owned ? 'primary' : 'ghost') + '" data-a="style">' + ic('sparkle', 18) + 'Style it</button></div>';
  h += '<div class="acts2"><button class="btn ghost" data-a="edit">Edit details</button><button class="btn ghost danger" data-a="del">' + ic('trash', 18) + 'Delete</button></div>';
  openSheet(it.name, h, sh => {
    sh.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'fav') { it.fav = !it.fav; persist(); itemSheet(id); render(); }
      if (a === 'style') { closeSheet(); openChat(); setTimeout(() => ask('Build a fit with my ' + it.name), 450); }
      if (a === 'edit') tagSheet({ existing: it });
      if (a === 'build') { const cp = E.compat(id, wxFor(0)); S.build = EMPTY_BUILD(); Object.assign(S.build, cp && cp.best[0] ? cp.best[0].items : { [it.category]: id }); S.buildWish = true; S.rating = null; closeSheet(); go('build'); }
      if (a === 'bought') { it.owned = true; it.added = iso(new Date()); persist(); refresh(); closeSheet(); render(); toast('Moved to your closet', it.name); }
      if (a === 'del') {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.innerHTML = ic('trash', 18) + 'Tap again'; return; }
        S.items = S.items.filter(x => x.id !== id);
        S.outfits = S.outfits.filter(o => CATS.every(k => o.items[k] !== id));
        CATS.forEach(k => { if (S.build[k] === id) S.build[k] = null; });
        if (it.img === 'idb') { imgs.del(id); if (IMG[id]) URL.revokeObjectURL(IMG[id]); delete IMG[id]; }
        persist(); refresh(); closeSheet(); render(); toast('Deleted', it.name + ' was removed');
      }
    };
  });
}
function fitSheet(oid) {
  const o = S.outfits.filter(x => x.id === oid)[0]; if (!o) return;
  const c = E.decorate({ items: clone(o.items), w: wxFor(0), vibe: o.vibe });
  openSheet(o.name, plate(o.items) + '<div class="tags center" style="margin-top:12px"><span class="tag">' + swatches(c.colour.swatches) + esc(c.colour.label) + '</span>' + (c.shape.label ? '<span class="tag">' + esc(c.shape.label) + '</span>' : '') + '</div>' +
    '<p class="lead">' + esc(o.reason || c.reason) + '</p><p class="muted small center">' + esc(itemNames(o.items)) + '</p>' +
    '<div class="acts2"><button class="btn primary" data-a="wear">' + ic('check', 18) + 'Wear today</button><button class="btn ghost" data-a="edit">' + ic('create', 18) + 'Open in Build</button></div>' +
    '<button class="btn ghost danger block" style="margin-top:12px" data-a="del">' + ic('trash', 18) + 'Delete fit</button>', sh => {
    sh.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'wear') { logWorn(o.items); closeSheet(); refresh(); render(); }
      if (b.dataset.a === 'edit') { S.build = Object.assign(EMPTY_BUILD(), clone(o.items)); S.rating = null; closeSheet(); go('build'); }
      if (b.dataset.a === 'del') { S.outfits = S.outfits.filter(x => x.id !== oid); persist(); closeSheet(); render(); toast('Fit deleted', o.name); }
    };
  });
}
function pickSheet(title, k, cur, done, allowClear) {
  const list = owned().filter(i => i.category === k).concat(wishes().filter(i => i.category === k));
  openSheet(title, (list.length ? '<div class="pick">' + list.map(i => '<button data-id="' + i.id + '" class="' + (cur === i.id ? 'on' : '') + '"><span><img src="' + esc(src(i)) + '" alt=""></span>' + esc(i.name) + (i.owned ? '' : '<b class="wtag">Wishlist</b>') + '</button>').join('') + '</div>'
    : '<div class="card empty"><b>No ' + CATLABEL[k].toLowerCase() + ' yet</b><p>Add one with the + button.</p></div>') +
    (allowClear && cur ? '<button class="btn ghost block" style="margin-top:14px" data-clear="1">Empty this slot</button>' : '') +
    (list.length < 2 && list.length ? '<p class="muted small center" style="margin-top:14px">That’s your only ' + ONE[k].toLowerCase() + ' so far. Add more to get swaps.</p>' : ''), sh => {
    sh.onclick = e => {
      const b = e.target.closest('[data-id]'), c = e.target.closest('[data-clear]');
      if (b) { closeSheet(); done(b.dataset.id); }
      if (c) { closeSheet(); done(null); }
    };
  });
}

function wearSheet() {
  const tc = S.today[S.todayIdx], opts = (tc ? [{ id: '_today', name: 'Today’s fit: ' + tc.name, items: tc.items, vibe: tc.vibe }] : []).concat(S.outfits);
  if (!opts.length) return toast('Nothing to log yet', 'Save a fit first, or add clothes.');
  openSheet('What did you wear today?', '<div class="tiles">' + opts.map((o, i) => '<button class="tile" data-i="' + i + '">' + plate(o.items, 'sm') + '<b>' + esc(o.name) + '</b><small>' + esc(o.vibe || '') + '</small></button>').join('') + '</div>' +
    '<button class="btn ghost block" style="margin-top:14px" data-b="1">' + ic('create', 18) + 'Something else · build it</button>', sh => {
    sh.onclick = e => {
      const t = e.target.closest('[data-i]'); if (t) { logWorn(opts[+t.dataset.i].items); closeSheet(); refresh(); render(); return; }
      if (e.target.closest('[data-b]')) { closeSheet(); go('build'); }
    };
  });
}

/* ---------- weather + settings ---------- */
function weatherSheet() {
  const rows = S.forecast.map((w, i) => '<div class="wrow"><span>' + (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(w.date + 'T00:00').toLocaleDateString('en-ZA', { weekday: 'long' })) + '</span>' + ic(WMO(w.code)[1], 22) + '<b>' + w.max + '°</b><small>' + w.min + '°</small><em>' + (w.rain >= 30 ? w.rain + '% rain' : '') + '</em></div>').join('');
  openSheet('Weather · ' + S.set.loc.name, (S.wxLive ? '' : '<p class="muted small center">Showing a sample forecast until live weather loads.</p>') + '<div class="wlist">' + rows + '</div>' + locationBlock(), bindLocation);
}
function locationBlock() {
  return '<div class="field"><label>Location</label><div class="acts2 tight"><button class="btn ghost" data-loc="gps">' + ic('pin', 18) + 'Use my location</button><input type="search" id="cityq" placeholder="Search a city" autocomplete="off" enterkeyhint="search"></div><div id="cityres" class="cityres"></div></div>';
}
function bindLocation(sh) {
  const gps = $('[data-loc="gps"]', sh), q = $('#cityq', sh), res = $('#cityres', sh);
  const setLoc = l => { S.set.loc = l; persist(); loadWeather(); closeSheet(); toast('Weather location set', l.name); };
  gps.onclick = () => {
    if (!navigator.geolocation) return toast('Location isn’t available', 'Search for your city instead.');
    gps.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(p => setLoc({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), name: 'My location' }),
      () => { gps.innerHTML = ic('pin', 18) + 'Use my location'; toast('Couldn’t get your location', 'Check location access, or search your city.'); }, { timeout: 10000, maximumAge: 3600000 });
  };
  let t = null;
  q.oninput = () => {
    clearTimeout(t); const v = q.value.trim(); if (v.length < 2) { res.innerHTML = ''; return; }
    t = setTimeout(() => fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&name=' + encodeURIComponent(v)).then(r => r.json()).then(j => {
      res.innerHTML = (j.results || []).map((c, i) => '<button data-i="' + i + '">' + esc(c.name) + '<small>' + esc([c.admin1, c.country].filter(Boolean).join(', ')) + '</small></button>').join('') || '<p class="muted small">No matches.</p>';
      res.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const c = j.results[+b.dataset.i]; setLoc({ lat: c.latitude, lon: c.longitude, name: c.name }); };
    }).catch(() => { res.innerHTML = '<p class="muted small">Couldn’t search right now.</p>'; }), 300);
  };
}
function settingsSheet() {
  const pr = S.profile;
  const colourChips = key => '<div class="chips wrap">' + Object.keys(COLOURS).map(c => '<button class="pill' + (pr[key].indexOf(c) > -1 ? ' on' : '') + '" data-pc="' + key + '" data-v="' + c + '"><i style="background:' + COLOURS[c] + '"></i>' + cap(c) + '</button>').join('') + '</div>';
  const h = '<h4 class="group">My style</h4>' +
    '<div class="field"><label>Preferred fit</label><div class="seg five small">' + [''].concat(FITS).map(f => '<button class="' + (pr.fit === f ? 'on' : '') + '" data-pf="' + f + '">' + (f ? cap(f) : 'Any') + '</button>').join('') + '</div></div>' +
    '<div class="field"><label>Colours I love</label>' + colourChips('love') + '</div>' +
    '<div class="field"><label>Colours I avoid</label>' + colourChips('avoid') + '</div>' +
    '<h4 class="group">Weather</h4><p class="muted small">Now: ' + esc(S.set.loc.name) + '</p>' + locationBlock() +
    '<h4 class="group">Stylist AI</h4><p class="muted small">' + esc(S.ai.on ? (S.ai.provider === 'local' ? 'On. Using the model on your PC' + (S.ai.model ? ' (' + S.ai.model + ')' : '') + ' through ngrok.' : 'On. The stylist chat and photo tagging use Claude.')
      : S.ai.provider === 'local' ? 'Your PC’s AI is offline: ' + (S.ai.reason || 'no answer') + ' Fitted uses its built-in rules until it’s back.' : 'Off. Fitted is styling with its built-in rules. Set LLM_BASE_URL and LLM_MODEL in Vercel to use the AI on your PC.') + '</p>' +
    (S.ai.locked ? '<div class="field"><label for="acode">Access code</label><input type="text" id="acode" value="' + esc(S.set.code) + '" placeholder="The FITTED_ACCESS_CODE you set on Vercel" autocomplete="off"></div>' : '') +
    '<h4 class="group">Your data</h4><p class="muted small">Your closet lives on this phone. Back it up before deleting the app.</p>' +
    '<div class="acts2"><button class="btn ghost" data-s="export">' + ic('dl', 18) + 'Back up</button><label class="btn ghost filebtn">' + ic('ul', 18) + 'Restore<input type="file" accept="application/json,.json" id="importf"></label></div>' +
    '<button class="btn ghost danger block" style="margin-top:12px" data-s="reset">Reset to the demo closet</button>' +
    '<button class="btn ghost block" style="margin-top:12px" data-s="tour">Show the intro again</button>';
  openSheet('Settings', h, sh => {
    bindLocation(sh);
    const code = $('#acode', sh); if (code) code.onchange = () => { S.set.code = code.value.trim(); persist(); };
    $('#importf', sh).onchange = e => { const f = e.target.files && e.target.files[0]; if (f) importBackup(f); };
    sh.onclick = e => {
      const pf = e.target.closest('[data-pf]'), pc = e.target.closest('[data-pc]'), s = e.target.closest('[data-s]');
      if (pf) { pr.fit = pf.dataset.pf; $$('[data-pf]', sh).forEach(x => x.classList.toggle('on', x === pf)); persist(); refresh(); render(); }
      if (pc) {
        const key = pc.dataset.pc, other = key === 'love' ? 'avoid' : 'love', v = pc.dataset.v, arr = pr[key], i = arr.indexOf(v);
        if (i > -1) arr.splice(i, 1); else { arr.push(v); const j = pr[other].indexOf(v); if (j > -1) { pr[other].splice(j, 1); const o = $('[data-pc="' + other + '"][data-v="' + v + '"]', sh); if (o) o.classList.remove('on'); } }
        pc.classList.toggle('on', arr.indexOf(v) > -1); persist(); refresh(); render();
      }
      if (s && s.dataset.s === 'export') exportBackup();
      if (s && s.dataset.s === 'tour') { closeSheet(); S.seen = false; onboarding(); }
      if (s && s.dataset.s === 'reset') {
        if (!s.dataset.sure) { s.dataset.sure = '1'; s.textContent = 'Tap again to erase everything and reset'; return; }
        S.items.forEach(i => { if (i.img === 'idb') imgs.del(i.id); });
        S.items = clone(SEED_ITEMS).map(normItem); S.outfits = clone(SEED_OUTFITS); S.wear = clone(SEED_WEAR); S.fb = { like: {}, skip: {} }; S.build = EMPTY_BUILD(); S.rating = null;
        persist(); refresh(); chatReset(); closeSheet(); go('home'); toast('Reset', 'Back to the 5 demo items');
      }
    };
  });
}
async function exportBackup() {
  const items = await Promise.all(S.items.map(async i => { const o = clone(i); if (i.img === 'idb' && IMG[i.id]) { try { o.img = await blobToDataUrl(await (await fetch(IMG[i.id])).blob()); } catch (e) {} } return o; }));
  const data = JSON.stringify({ app: 'fitted', v: 2, exported: new Date().toISOString(), items, outfits: S.outfits, wear: S.wear, fb: S.fb, profile: S.profile });
  const name = 'fitted-backup-' + iso(new Date()) + '.json', file = new File([data], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Fitted backup' }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup saved', name);
}
async function importBackup(f) {
  try {
    const j = JSON.parse(await f.text());
    if (j.app !== 'fitted' || !Array.isArray(j.items)) throw new Error('bad');
    for (const i of j.items) {
      normItem(i);
      if (/^data:image\//.test(i.img || '')) { const blob = await dataUrlToBlob(i.img); if (await saveBlob(i.id, blob)) i.img = 'idb'; }
    }
    S.items = j.items; S.outfits = j.outfits || []; S.wear = j.wear || []; S.fb = j.fb || { like: {}, skip: {} }; S.profile = Object.assign({ fit: '', love: [], avoid: [] }, j.profile || {});
    persist(); refresh(); closeSheet(); render(); toast('Closet restored', S.items.length + ' items');
  } catch (e) { toast('Couldn’t restore that file', 'Pick a Fitted backup (.json).'); }
}
async function saveBlob(id, blob) {
  try { await imgs.put(id, blob); if (IMG[id]) URL.revokeObjectURL(IMG[id]); IMG[id] = URL.createObjectURL(blob); return true; } catch (e) { return false; }
}

/* ---------- add: photo, link ---------- */
function addSheet() {
  openSheet('Add to Fitted',
    '<label class="addrow"><span class="dot violet">' + ic('camera') + '</span><span><b>Take a photo</b><small>One item, laid flat on a plain background</small></span>' + ic('chev', 20) + '<input type="file" accept="image/*" capture="environment" id="fcam"></label>' +
    '<label class="addrow"><span class="dot blue">' + ic('photo') + '</span><span><b>Choose from Photos</b><small>A photo or a screenshot from a shop</small></span>' + ic('chev', 20) + '<input type="file" accept="image/*" id="flib"></label>' +
    '<button class="addrow" data-a="link"><span class="dot sun">' + ic('link') + '</span><span><b>Paste a shop link</b><small>Try it with your closet before you buy</small></span>' + ic('chev', 20) + '</button>' +
    '<p class="muted small center" style="margin-top:14px">Fitted cuts out plain backgrounds and picks up colours on your phone.' + (S.ai.on ? ' The AI stylist fills in the rest.' : '') + '</p>', sh => {
    const h = e => { const f = e.target.files && e.target.files[0]; if (f) fromPhoto(f); };
    $('#fcam', sh).onchange = h; $('#flib', sh).onchange = h;
    sh.onclick = e => { if (e.target.closest('[data-a="link"]')) linkSheet(); };
  });
}
async function fromPhoto(file, extra) {
  busySheet('Getting it ready', 'Cutting out the background and reading the colours…');
  try {
    const r = await processPhoto(file);
    tagSheet(Object.assign({ cut: r.cut, orig: r.orig, useCut: !!r.cut, colours: r.colours }, extra || {}));
  } catch (e) { closeSheet(); toast('Couldn’t read that photo', 'Try a JPG or PNG.'); }
}
function linkSheet(prefill) {
  openSheet('Add from a shop link',
    '<p class="lead">Paste the link to a product page. Fitted pulls in the photo, name and price so you can try it with your closet.</p>' +
    '<div class="field"><input type="url" id="lu" inputmode="url" autocomplete="off" placeholder="https://shop.co.za/product/…" value="' + esc(prefill || '') + '"></div>' +
    '<div class="acts2"><button class="btn ghost" data-a="paste">Paste</button><button class="btn primary" data-a="go">' + ic('link', 18) + 'Get item</button></div><p class="err" id="lerr" role="alert"></p>' +
    '<p class="muted small center">Works with most online shops. If one blocks it, screenshot the item and add it from Photos.</p>', sh => {
    const inp = $('#lu', sh), err = $('#lerr', sh);
    const go2 = async () => {
      const u = inp.value.trim().match(/https?:\/\/\S+/);
      if (!u) { err.textContent = 'That doesn’t look like a link. Copy it from the shop’s share button.'; return; }
      busySheet('Reading the shop page', 'Finding the photo, name and price…');
      try {
        const r = await fetch('/api/product?url=' + encodeURIComponent(u[0]));
        const j = await r.json().catch(() => ({ error: 'Link import needs the app to be deployed on Vercel.' }));
        if (!r.ok) throw new Error(j.error || 'Couldn’t read that page');
        productSheet(j);
      } catch (e) { linkSheet(u[0]); setTimeout(() => { const el = $('#lerr'); if (el) el.textContent = e.message || 'Couldn’t read that page'; }, 0); }
    };
    sh.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'paste') { try { inp.value = (await navigator.clipboard.readText()).trim(); if (/https?:\/\//.test(inp.value)) go2(); } catch (x) { err.textContent = 'Press and hold the box, then tap Paste.'; inp.focus(); } }
      if (b.dataset.a === 'go') go2();
    };
    inp.onkeydown = e => { if (e.key === 'Enter') go2(); };
  });
}
function productSheet(p) {
  let pick = 0;
  const g = guessFromText([p.name, p.colour, p.description].filter(Boolean).join(' '));
  const draw = () => '<div class="bigph"><img src="' + esc(p.images[pick] || '') + '" alt="" referrerpolicy="no-referrer"></div>' +
    (p.images.length > 1 ? '<p class="muted small center">Pick the clearest photo of just the item</p><div class="gallery">' + p.images.map((u, i) => '<button data-i="' + i + '" class="' + (i === pick ? 'on' : '') + '"><img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer" loading="lazy"></button>').join('') + '</div>' : '') +
    '<div class="prod"><b>' + esc(p.name || 'Untitled item') + '</b><small>' + esc([p.brand, p.site].filter((v, i, a) => v && a.findIndex(x => x && x.toLowerCase() === v.toLowerCase()) === i).join(' · ')) + '</small>' + (p.price ? '<em>' + money(p.price, p.currency) + '</em>' : '') + '</div>' +
    (p.images.length ? '<button class="btn primary block" data-a="use">' + ic('check', 18) + 'Use this photo</button>' : '<p class="err">No photo on that page. Screenshot the item and add it from Photos.</p>');
  openSheet('Found it', draw(), sh => {
    sh.onclick = async e => {
      const t = e.target.closest('[data-i]');
      if (t) { pick = +t.dataset.i; $('.sc', sh).innerHTML = draw(); return; }
      if (!e.target.closest('[data-a="use"]')) return;
      const meta = Object.assign({ name: shortName(p.name, g), owned: false, price: p.price, currency: p.currency, url: p.url, shop: p.site || p.brand, fromShop: true, guess: g }, {});
      busySheet('Getting it ready', 'Cutting out the background and reading the colours…');
      try {
        const r = await fetch('/api/img?url=' + encodeURIComponent(p.images[pick]));
        if (!r.ok) throw new Error('img');
        await fromPhoto(await r.blob(), meta);
      } catch (x) { tagSheet(Object.assign(meta, { remote: p.images[pick], colours: g.colours || [] })); }
    };
  });
}
function shortName(title, g) {
  let n = String(title || '').replace(/\s*[|–—-]\s*[^|–—-]*$/, '').replace(/\b(men'?s|women'?s|unisex|mens|womens)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (n.length > 32) n = ((g.colours && g.colours[0] ? cap(g.colours[0]) + ' ' : '') + (g.sub || n.split(' ').slice(0, 3).join(' '))).trim();
  return n.slice(0, 40);
}

/* ---------- tag form ---------- */
function tagSheet(d) {
  const ex = d.existing, g = d.guess || {};
  const t = ex ? clone(ex) : normItem(Object.assign({ name: d.name || '', category: 'top', sub: '', colours: [], pattern: 'solid', fit: 'regular', warmth: 2, formality: 2, styles: ['casual'], owned: d.owned !== false, price: d.price || null }, g, { name: d.name || '' }));
  if (!ex) t.colours = ((d.fromShop && g.colours) || (d.colours && d.colours.length ? d.colours : g.colours) || []).slice(0, 3);
  const touched = {}; let more = false, aiState = '';
  const urls = {};
  if (d.cut) urls.cut = URL.createObjectURL(d.cut);
  if (d.orig) urls.orig = URL.createObjectURL(d.orig);
  const preview = () => (ex ? src(ex) : d.remote || (d.useCut ? urls.cut : urls.orig));
  const seg = (key, list, label) => '<div class="seg ' + (list.length === 5 ? 'five' : list.length === 4 ? 'four' : 'two') + ' small" data-key="' + key + '">' + list.map(v => '<button class="' + (t[key] === v ? 'on' : '') + '" data-v="' + v + '">' + esc(label(v)) + '</button>').join('') + '</div>';
  const chips = (key, list, label, multi) => '<div class="chips wrap" data-key="' + key + '"' + (multi ? ' data-multi="1"' : '') + '>' + list.map(v => { const on = multi ? t[key].indexOf(v) > -1 : t[key] === v; return '<button class="pill' + (on ? ' on' : '') + '" data-v="' + v + '">' + (key === 'colours' ? '<i style="background:' + COLOURS[v] + '"></i>' : '') + esc(cap(v)) + '</button>'; }).join('') + '</div>';
  const dots = (key, n) => '<div class="dotsel" data-key="' + key + '">' + Array.from({ length: n }, (_, i) => '<button class="' + (i + 1 <= t[key] ? 'on' : '') + '" data-n="' + (i + 1) + '" aria-label="' + key + ' ' + (i + 1) + '"></button>').join('') + '</div>';
  const form = () =>
    '<div class="bigph' + (!ex && d.useCut ? ' cutbg' : '') + '"><img src="' + esc(preview()) + '" alt=""></div>' +
    (!ex && d.cut ? '<div class="seg two small" data-bg="1"><button class="' + (d.useCut ? 'on' : '') + '" data-v="cut">Background removed</button><button class="' + (d.useCut ? '' : 'on') + '" data-v="orig">Original photo</button></div>' : '') +
    (aiState ? '<p class="ailine">' + ic('sparkle', 14) + esc(aiState) + '</p>' : (!ex && d.colours && d.colours.length ? '<p class="ailine muted">' + ic('palette', 14) + 'Colours picked up from the photo</p>' : '')) +
    '<div class="field"><label for="tn">Name</label><input type="text" id="tn" value="' + esc(t.name) + '" placeholder="e.g. Black hoodie" autocomplete="off"></div>' +
    '<div class="field"><label>Type</label>' + seg('category', CATS, v => ONE[v]) + '</div>' +
    (t.category !== 'extra' ? '<div class="field"><label>Fit</label>' + seg('fit', FITS, cap) + '</div>' : '') +
    '<div class="field"><label>Colours <small>up to 3, main one first</small></label>' + chips('colours', Object.keys(COLOURS), cap, true) + '</div>' +
    (d.fromShop || (ex && !ex.owned) ? '<div class="field"><label>Do you own it?</label><div class="seg two small" data-key="owned"><button class="' + (!t.owned ? 'on' : '') + '" data-v="0">Not yet · wishlist</button><button class="' + (t.owned ? 'on' : '') + '" data-v="1">I own it</button></div></div>' : '') +
    '<button class="morebtn" data-more="1">' + (more ? 'Fewer details' : 'More details') + ic('down', 16) + '</button>' +
    (more ? '<div class="field"><label for="ts">Kind</label><input type="text" id="ts" value="' + esc(t.sub) + '" placeholder="e.g. hoodie, jeans, sneakers" autocomplete="off"></div>' +
      '<div class="field"><label>Pattern</label>' + chips('pattern', PATTERNS, cap) + '</div>' +
      '<div class="field"><label>Warmth</label>' + dots('warmth', 4) + '</div>' +
      '<div class="field"><label>How dressy</label>' + dots('formality', 5) + '</div>' +
      '<div class="field"><label>Style</label>' + chips('styles', STYLES, cap, true) + '</div>' : '') +
    '<button class="btn primary block" data-save="1" style="margin-top:10px">' + (ex ? 'Save changes' : t.owned ? 'Save to closet' : 'Add to wishlist') + '</button>';
  const readInputs = sh => { const n = $('#tn', sh), s = $('#ts', sh); if (n) t.name = n.value; if (s) t.sub = s.value; };
  openSheet(ex ? 'Edit ' + ex.name : 'Tag your item', form(), sh => {
    const redraw = () => { readInputs(sh); const sc = $('.sc', sh), y = sc.scrollTop; sc.innerHTML = form(); sc.scrollTop = y; };
    onSheetClose = () => { Object.keys(urls).forEach(k => setTimeout(() => URL.revokeObjectURL(urls[k]), 2000)); };
    sh.oninput = e => { if (e.target.id === 'tn') touched.name = 1; if (e.target.id === 'ts') { touched.sub = 1; const g2 = guessFromText(e.target.value); if (g2.category && !touched.category) { t.category = g2.category; t.warmth = g2.warmth; t.formality = g2.formality; t.styles = g2.styles; } } };
    sh.onclick = e => {
      if (e.target.closest('[data-more]')) { more = !more; redraw(); return; }
      const bg = e.target.closest('[data-bg] [data-v]');
      if (bg) { d.useCut = bg.dataset.v === 'cut'; redraw(); return; }
      const sb = e.target.closest('.seg[data-key] [data-v]');
      if (sb) { const key = sb.parentNode.dataset.key; touched[key] = 1; t[key] = key === 'owned' ? sb.dataset.v === '1' : sb.dataset.v; redraw(); return; }
      const cb = e.target.closest('.chips[data-key] [data-v]');
      if (cb) {
        const g2 = cb.parentNode, key = g2.dataset.key, v = cb.dataset.v; touched[key] = 1;
        if (g2.dataset.multi) { const arr = t[key], i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); else if (arr.length < 3) arr.push(v); else { arr.pop(); arr.push(v); } }
        else t[key] = v;
        redraw(); return;
      }
      const db = e.target.closest('.dotsel [data-n]');
      if (db) { const key = db.parentNode.dataset.key; touched[key] = 1; t[key] = +db.dataset.n; redraw(); return; }
      if (e.target.closest('[data-save]')) { readInputs(sh); saveTagged(t, d, ex); }
    };
    if (!ex && S.ai.on && (d.cut || d.orig)) {
      aiState = 'Tagging with AI…'; redraw();
      forTagging(d.cut || d.orig).then(image => fetch('/api/tag', { method: 'POST', headers: aiHeaders(), body: JSON.stringify({ image, hint: d.name || '' }) }))
        .then(r => r.json().then(j => (r.ok ? j : Promise.reject(new Error(j.error || 'failed')))))
        .then(j => {
          if (!sheetWrap.classList.contains('on') || !$('#tn', sh)) return;
          readInputs(sh);
          ['name', 'category', 'sub', 'fit', 'pattern', 'warmth', 'formality', 'styles', 'colours'].forEach(k => { if (!touched[k] && j[k] != null && !(Array.isArray(j[k]) && !j[k].length)) t[k] = j[k]; });
          if (d.fromShop && d.name && !touched.name) t.name = d.name.length <= 28 ? d.name : j.name || d.name;
          aiState = 'Tagged by AI. Check it looks right.'; redraw();
        }).catch(() => { aiState = ''; if ($('#tn', sh)) redraw(); });
    }
  });
}
async function saveTagged(t, d, ex) {
  t.name = t.name.trim() || (cap(t.colours[0] || '') + ' ' + (t.sub || ONE[t.category].toLowerCase())).trim();
  t.sub = (t.sub || '').trim() || (guessFromText(t.name).sub || t.category);
  if (!t.colours.length) t.colours = ['black'];
  if (t.category === 'extra') t.fit = 'regular';
  normItem(t);
  if (ex) { Object.assign(ex, t); persist(); refresh(); closeSheet(); render(); toast('Saved', t.name); return; }
  t.id = uid(); t.fav = false; t.added = iso(new Date());
  if (d.url) { t.url = d.url; t.shop = d.shop || ''; t.currency = d.currency || null; }
  const blob = d.useCut ? d.cut : d.orig;
  if (blob) { t.img = (await saveBlob(t.id, blob)) ? 'idb' : await blobToDataUrl(blob); }
  else t.img = d.remote || '';
  S.items.push(t);
  persist();
  refresh(); closeSheet();
  if (!t.owned) { S.closetView = 'wish'; render(); toast('Added to your wishlist', 'Here’s how it works with your closet'); setTimeout(() => itemSheet(t.id), 350); }
  else { render(); toast('Added to your closet', t.name); }
}

/* ---------- toast ---------- */
let toastT = null;
function toast(title, sub, undo) {
  const el = $('#toast');
  el.innerHTML = '<i>' + ic('check', 18) + '</i><div><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (undo ? '<button type="button">Undo</button>' : '');
  if (undo) $('button', el).onclick = () => { undo(); el.classList.remove('on'); render(); };
  el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2800);
}

/* ---------- clicks ---------- */
function go(tab) { S.tab = tab; render(); const s = $('#scr'); if (s && tab !== 'closet') s.scrollTop = 0; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || !$('#app').contains(b) || b.closest('.sheet')) return;
  const a = b.dataset.act, tc = S.today[S.todayIdx];
  if (a === 'tab') return go(b.dataset.tab);
  if (a === 'add') return addSheet();
  if (a === 'link') return linkSheet();
  if (a === 'settings') return settingsSheet();
  if (a === 'weather') return weatherSheet();
  if (a === 'hintoff') { S.set.hintOff = true; persist(); return render(); }
  if (a === 'item') return itemSheet(b.dataset.id);
  if (a === 'fit') return fitSheet(b.dataset.id);
  if (a === 'closet-wish') { S.closetView = 'wish'; S.closetCat = 'all'; return go('closet'); }
  if (a === 'cview') { S.closetView = b.dataset.v; S.closetCat = 'all'; return render(); }
  if (a === 'ccat') { S.closetCat = b.dataset.c; return render(); }
  if (a === 'style-these') { const old = owned().filter(i => E.lastWornDays(i.id) >= 30)[0]; openChat(); setTimeout(() => ask('Build a fit with my ' + (old ? old.name : 'closet')), 450); return; }
  if (a === 'vibe') { S.vibe = b.dataset.v; S.todayIdx = 0; refresh(); return render(); }
  if (a === 'today-skip') return flyCard(-1);
  if (a === 'today-save') return flyCard(1);
  if (a === 'today-wear' && tc) { logWorn(tc.items); return render(); }
  if (a === 'wear-today') return wearSheet();
  if (a === 'slot') { const k = b.dataset.k; return pickSheet('Choose ' + ONE[k].toLowerCase(), k, S.build[k], id => { S.build[k] = id; S.rating = null; render(); }, true); }
  if (a === 'strip') { const it = E.byId(b.dataset.id); S.build[it.category] = S.build[it.category] === it.id ? null : it.id; S.rating = null; return render(); }
  if (a === 'bwish') { S.buildWish = b.dataset.v === '1'; return render(); }
  if (a === 'build-clear') { S.build = EMPTY_BUILD(); S.rating = null; return render(); }
  if (a === 'complete') return completeIt();
  if (a === 'rate') return rateIt();
  if (a === 'build-save') return saveBuild();
});
document.addEventListener('input', e => {
  if (e.target.id !== 'cq') return;
  S.closetQ = e.target.value; $('#cgrid').innerHTML = closetGrid();
});

/* ---------- today card: swipe ---------- */
function flyCard(dir) {
  const card = $('#topcard'), c = S.today[S.todayIdx]; if (!card || !c) return;
  card.style.transition = 'transform .35s cubic-bezier(.3,.6,.4,1), opacity .35s';
  card.style.transform = 'translateX(' + dir * 520 + 'px) rotate(' + dir * 16 + 'deg)'; card.style.opacity = '0';
  if (dir > 0) saveOutfit(c); else skipFeedback(c);
  setTimeout(() => { S.todayIdx = (S.todayIdx + 1) % Math.max(1, S.today.length); if (dir < 0 && S.todayIdx === 0) refresh(); render(); }, 280);
}
document.addEventListener('pointerdown', e => {
  const card = e.target.closest('#topcard'); if (!card || e.target.closest('button')) return;
  const x0 = e.clientX, y0 = e.clientY, keep = $('.stamp.keep', card), skip = $('.stamp.skip', card);
  let dx = 0, moved = false, done = false;
  card.style.transition = 'none';
  function mv(ev) {
    dx = ev.clientX - x0; const dy = ev.clientY - y0;
    if (!moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) return up(ev, true);
    if (Math.abs(dx) > 6) moved = true;
    card.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 24 + 'deg)';
    keep.style.opacity = Math.max(0, Math.min(1, dx / 90)); skip.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  }
  function up(ev, scrolling) {
    if (done) return; done = true;
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
    if (!scrolling && Math.abs(dx) > 100) return flyCard(dx > 0 ? 1 : -1);
    card.style.transition = ''; card.style.transform = ''; keep.style.opacity = 0; skip.style.opacity = 0;
    if (!moved && !scrolling && ev && ev.type === 'pointerup') { const pc = e.target.closest('.pc'); if (pc) swapPiece(pc.dataset.k); }
  }
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
});
function swapPiece(k) {
  const c = S.today[S.todayIdx]; if (!c) return;
  pickSheet('Swap ' + ONE[k].toLowerCase(), k, c.items[k], id => {
    if (id) c.items[k] = id; else delete c.items[k];
    E.decorate(c); render();
  }, k === 'layer' || k === 'extra');
}

/* ---------- build: complete, rate, save ---------- */
function completeIt() {
  const lock = {}; CATS.forEach(k => { if (S.build[k]) lock[k] = S.build[k]; });
  const cs = E.candidates({ weather: wxFor(0), vibe: 'Casual', lock, withWish: false });
  if (!cs.length) return toast('Can’t complete yet', 'Add at least one top, bottoms and shoes to your closet.');
  const c = cs[0]; let n = 0;
  CATS.forEach(k => { if (!S.build[k] && c.items[k]) { S.build[k] = c.items[k]; n++; } });
  S.rating = E.rate(S.build, wxFor(0), 'Casual');
  render(); toast(n ? 'Filled ' + n + ' slot' + (n > 1 ? 's' : '') : 'Already complete', c.colour.label + (c.shape.label ? ' · ' + c.shape.label : ''));
}
function rateIt() {
  const b = S.build; if (!(b.top && b.bottom && b.shoes)) return toast('Add a top, bottoms and shoes', 'Then Fitted can rate the fit.');
  S.rating = E.rate(b, wxFor(0), 'Casual'); render();
  setTimeout(() => { const r = $('.rating'); if (r) r.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }, 60);
}
function saveBuild() {
  const items = {}; CATS.forEach(k => { if (S.build[k]) items[k] = S.build[k]; });
  const c = E.decorate({ items, vibe: 'Casual', w: wxFor(0), by: 'user' });
  openSheet('Name this fit', '<div class="field"><input type="text" id="fn" value="' + esc(c.name) + '" autocomplete="off"></div><button class="btn primary block" id="fnok">' + ic('heart', 18) + 'Save fit</button>', sh => {
    $('#fnok', sh).onclick = () => { saveOutfit(c, $('#fn', sh).value.trim() || c.name); closeSheet(); render(); };
  });
}

/* =========================================================
   Stylist chat: swipe up on the tab bar (or tap its handle)
   ========================================================= */
const app = $('#app'), chat = $('#chat'), cbody = $('#cbody'), dim = $('#chatdim'), bar = $('#bar');
$('#chatClose').innerHTML = ic('down'); $('#mic').innerHTML = ic('mic'); $('.send').innerHTML = ic('up');
let chatOpen = false;
chat.inert = true;
const H = () => app.getBoundingClientRect().height;
function chatTo(y, anim) {
  chat.style.transition = anim ? '' : 'none'; dim.style.transition = anim ? '' : 'none';
  chat.style.transform = 'translateY(' + y + 'px)';
  dim.style.opacity = String(Math.max(0, Math.min(1, 1 - y / H())));
}
function openChat() {
  if (chatOpen) return; chatOpen = true;
  chat.classList.add('open'); dim.classList.add('on'); chat.inert = false; chat.setAttribute('aria-hidden', 'false');
  chat.style.transition = ''; dim.style.transition = ''; chat.style.transform = ''; dim.style.opacity = '';
  if (!cbody.children.length) hello();
  if (Date.now() - aiChecked > 30000) checkAI();
  if (!S.set.chatUsed) { S.set.chatUsed = true; persist(); $('#barhint').classList.remove('on'); }
  try { history.pushState({ chat: 1 }, ''); } catch (e) {}
}
function closeChat(fromPop) {
  if (!chatOpen) return; chatOpen = false;
  chat.classList.remove('open'); dim.classList.remove('on'); chat.inert = true; chat.setAttribute('aria-hidden', 'true');
  chat.style.transition = ''; dim.style.transition = ''; chat.style.transform = ''; dim.style.opacity = '';
  try { document.activeElement.blur(); } catch (e) {}
  if (!fromPop) { try { if (history.state && history.state.chat) history.back(); } catch (e) {} }
}
window.addEventListener('popstate', () => { if (chatOpen) closeChat(true); });
$('#chatClose').addEventListener('click', () => closeChat());
$('#grab').addEventListener('click', () => openChat());
dim.addEventListener('click', () => closeChat());
(function barDrag() {
  let d = null, swallow = false;
  bar.addEventListener('pointerdown', e => { if (chatOpen || (e.button && e.button > 0)) return; d = { id: e.pointerId, x: e.clientX, y: e.clientY, dy: 0, on: false, v: 0, lt: performance.now(), ly: e.clientY }; });
  window.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y, dx = e.clientX - d.x;
    if (!d.on) { if (dy < -10 && Math.abs(dy) > Math.abs(dx) * 1.2) { d.on = true; chat.classList.add('dragging'); } else return; }
    const now = performance.now(); d.v = (e.clientY - d.ly) / Math.max(1, now - d.lt); d.lt = now; d.ly = e.clientY; d.dy = dy;
    chatTo(Math.max(0, H() + dy), false);
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const x = d; d = null; if (!x.on) return;
    chat.classList.remove('dragging'); swallow = true; setTimeout(() => { swallow = false; }, 120);
    if (-x.dy > 90 || x.v < -0.45) return openChat();
    chatTo(H(), true);
    setTimeout(() => { if (!chatOpen) { chat.style.transform = ''; dim.style.opacity = ''; } }, 450);
  };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  bar.addEventListener('click', e => { if (swallow) { e.preventDefault(); e.stopPropagation(); } }, true);
})();
(function headDrag() {
  let hd = null; const ch = $('#chead');
  ch.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; hd = { y: e.clientY, d: 0 }; try { ch.setPointerCapture(e.pointerId); } catch (x) {} });
  ch.addEventListener('pointermove', e => { if (!hd) return; hd.d = Math.max(0, e.clientY - hd.y); chatTo(hd.d, false); });
  const end = () => { if (!hd) return; const dd = hd.d; hd = null; if (dd > 90) closeChat(); else chatTo(0, true); };
  ch.addEventListener('pointerup', end); ch.addEventListener('pointercancel', end);
})();

const CH = { hist: [], current: null, busy: false, cards: {} };
function chatReset() { cbody.innerHTML = ''; CH.current = null; CH.hist = []; CH.cards = {}; if (chatOpen) hello(); }
const nextSatOffset = () => (6 - new Date().getDay() + 7) % 7;
function hello() {
  const least = owned().slice().sort((a, b) => E.lastWornDays(b.id) - E.lastWornDays(a.id))[0], wl = wishes()[0], sat = nextSatOffset();
  const sugs = [];
  sugs.push(['sparkle', 'What should I wear today?', 'Uses ' + wxFor(0).max + '° and ' + cond(wxFor(0)).toLowerCase(), 'What should I wear today?']);
  if (least) sugs.push(['palette', 'What goes with my ' + nm(least) + '?', 'Colours and pieces that match', 'What goes with my ' + least.name + '?']);
  if (wl) sugs.push(['bag', 'Should I buy the ' + nm(wl) + '?', 'Checks it against your closet', 'Should I buy the ' + wl.name + '?']);
  else sugs.push(['grid', sat === 0 ? 'Braai today' : 'Braai on Saturday', 'A relaxed fit for the weekend', 'What should I wear to a braai on Saturday?']);
  sugs.push(['create', 'Plan my week', 'A fit for every day', 'Plan my week']);
  cbody.innerHTML = '<div class="hello"><h5>What are we<br><span>wearing today?</span></h5><p>I know your ' + owned().length + ' pieces' + (wishes().length ? ', your wishlist' : '') + ' and this week’s weather.</p>' +
    sugs.map(s => '<button type="button" class="sug glass" data-q="' + esc(s[3]) + '"><span class="th">' + ic(s[0], 22) + '</span><span><b>' + esc(s[1]) + '</b><small>' + esc(s[2]) + '</small></span><span class="chev">' + ic('chev', 18) + '</span></button>').join('') + '</div>';
}
cbody.addEventListener('click', e => {
  const s = e.target.closest('[data-q]'); if (s) return ask(s.dataset.q);
  const sv = e.target.closest('[data-savefit]'); if (sv && CH.cards[sv.dataset.savefit]) { saveOutfit(CH.cards[sv.dataset.savefit]); sv.classList.add('saved'); sv.innerHTML = ic('check', 20); render(); }
  const ob = e.target.closest('[data-openbuild]'); if (ob && CH.cards[ob.dataset.openbuild]) { S.build = Object.assign(EMPTY_BUILD(), clone(CH.cards[ob.dataset.openbuild].items)); S.buildWish = true; S.rating = null; closeChat(); go('build'); }
});

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function parseDay(q) {
  if (/tomorrow/.test(q)) return 1;
  if (/weekend|saturday|sat\b/.test(q)) return nextSatOffset();
  for (let i = 0; i < 7; i++) if (q.indexOf(DAYS[i]) > -1) return (i - new Date().getDay() + 7) % 7;
  return 0;
}
const parseVibe = q => (/braai|bbq/.test(q) ? 'Braai' : /work|office|meeting|interview/.test(q) ? 'Work' : /date|dinner|night out|club|party/.test(q) ? 'Date night' : /gym|workout|run\b|training/.test(q) ? 'Gym' : null);
function parseSlot(q) {
  if (/shoe|sneaker|kicks|runner|boot|shox|trainer/.test(q)) return 'shoes';
  if (/jacket|hoodie|layer|coat/.test(q)) return 'layer';
  if (/short|jort|pant|jean|bottom|trouser|skirt/.test(q)) return 'bottom';
  if (/jersey|top|shirt|tee|t-shirt/.test(q)) return 'top';
  return null;
}
function mentioned(q) {
  let best = null, bs = 0;
  S.items.forEach(i => { const n = i.name.toLowerCase(); let s = q.indexOf(n) > -1 ? 10 : 0; n.split(' ').forEach(w => { if (w.length > 3 && q.indexOf(w) > -1 && !/jersey|shoes/.test(w)) s += 2; }); if (s > bs) { bs = s; best = i; } });
  return best;
}
function route(q) {
  q = q.toLowerCase();
  if (/start over|reset|clear chat/.test(q)) return { intent: 'reset' };
  if (/^save|save (this|it|the fit)/.test(q)) return { intent: 'save' };
  const it = mentioned(q);
  if (/buy|worth it|should i get|wishlist|purchase/.test(q)) return { intent: 'wish', item: it && !it.owned ? it : null };
  if (/swap|change|different|another/.test(q)) return { intent: 'swap', slot: parseSlot(q) };
  if (/week/.test(q)) return { intent: 'week' };
  if (it && /colou?r/.test(q)) return { intent: 'colour', item: it };
  if (it && /build|style|fit with|outfit with|wear with my/.test(q)) return { intent: 'build', item: it };
  if (it && /go with|goes with|pair|match/.test(q)) return { intent: 'pair', item: it };
  if (/wear|outfit|fit\b|fit for|what should|dress|suggest|braai|work|date|gym|today|tomorrow|weekend|party/.test(q)) return { intent: 'suggest', day: parseDay(q), vibe: parseVibe(q) };
  if (it) return { intent: 'pair', item: it };
  return { intent: 'other' };
}
const dayWord = off => (off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : cap(DAYS[new Date(today0().getTime() + off * DAY).getDay()]));
function cardHtml(c) {
  const k = uid(); CH.cards[k] = c;
  const wish = c.wish && c.wish.length;
  return '<div class="fitc glass">' + plate(c.items) + '<div class="cap"><div><b>' + esc(c.name) + '</b><small>' + esc(itemNames(c.items)) + '</small></div>' +
    (wish ? '<button type="button" data-openbuild="' + k + '" aria-label="Open in Build">' + ic('create', 20) + '</button>' : '<button type="button" data-savefit="' + k + '" aria-label="Save this fit">' + ic('heart', 20) + '</button>') + '</div>' +
    (c.colour ? '<div class="tags"><span class="tag">' + swatches(c.colour.swatches) + esc(c.colour.label) + '</span>' + (c.shape && c.shape.label ? '<span class="tag">' + esc(c.shape.label) + '</span>' : '') + '</div>' : '') + '</div>';
}
const quickFor = (c, justSwapped) => { const q = []; if (justSwapped !== 'top') q.push('Swap the top'); if (justSwapped !== 'shoes') q.push('Swap the shoes'); q.push('Save this fit'); return q; };
function respond(q) {
  const r = route(q); let w, cs, c;
  if (r.intent === 'reset') return { reset: true };
  if (r.intent === 'suggest') {
    w = wxFor(r.day); const vibe = r.vibe || 'Casual';
    cs = E.candidates({ weather: w, vibe });
    if (!cs.length) return { t: 'I need at least one top, bottoms and shoes to build a fit. Add a few with the + button.' };
    c = cs[0]; CH.current = c;
    const drop = w.min <= w.max - 6 ? ', dropping to ' + w.min + '° later' : '';
    return { t: dayWord(r.day) + ' is ' + w.max + '° and ' + cond(w).toLowerCase() + drop + '. ' + c.reason, x: cardHtml(c), q: quickFor(c) };
  }
  if (r.intent === 'swap') {
    if (!CH.current) { const first = respond('What should I wear today?'); first.t = 'Let’s start with a fit. ' + first.t; return first; }
    const slot = r.slot || 'shoes', cur = CH.current;
    const alts = owned().filter(i => i.category === slot && i.id !== cur.items[slot]);
    if (!alts.length) return { t: 'That’s the only ' + ONE[slot].toLowerCase() + ' in your closet so far. Add another with the + button and I’ll swap it in.', q: ['Save this fit', 'Plan my week'] };
    let best = null, bs = -Infinity;
    alts.forEach(a => { const items = Object.assign({}, cur.items); items[slot] = a.id; const s = E.score(items, cur.w, cur.vibe, false); if (s.score > bs) { bs = s.score; best = items; } });
    c = E.decorate({ items: best, w: cur.w, vibe: cur.vibe }); CH.current = c;
    return { t: 'Swapped in your ' + nm(E.byId(best[slot])) + '. ' + c.reason, x: cardHtml(c), q: quickFor(c, slot) };
  }
  if (r.intent === 'save') {
    if (!CH.current) return { t: 'Nothing to save yet. Ask me for a fit first.', q: ['What should I wear today?'] };
    const o = saveOutfit(CH.current); render();
    return { t: 'Saved to your Fits as “' + o.name + '”.', q: ['Plan my week', 'What goes with my ' + E.byId(CH.current.items.top).name + '?'] };
  }
  if (r.intent === 'wish') {
    const it = r.item || wishes()[0];
    if (!it) return { t: 'Your wishlist is empty. Tap + and paste a link from any shop, and I’ll tell you how it works with what you already own.', q: ['What should I wear today?'] };
    const cp = E.compat(it.id, wxFor(0));
    if (!cp || !cp.best.length) return { t: 'I can’t build a fit with the ' + nm(it) + ' yet. Add a few more basics first.' };
    c = cp.best[0]; CH.current = c;
    const tip = cp.level === 'high' ? ' It earns its place.' : cp.level === 'mid' ? ' Decent, but not a must.' : ' I’d skip it unless you love it.';
    return { t: cp.verdict + tip + ' ' + c.reason, x: cardHtml(c), q: wishes().length > 1 ? ['Should I buy the ' + wishes().filter(i => i.id !== it.id)[0].name + '?', 'What should I wear today?'] : ['What should I wear today?', 'Plan my week'] };
  }
  if (r.intent === 'colour') {
    const it = r.item, main = it.colours[0], pw = pairsWith(main);
    const matches = owned().filter(i => i.id !== it.id && i.category !== it.category && i.colours.some(cc => pw.safe.indexOf(cc) > -1 || pw.accent.indexOf(cc) > -1 || cc === main));
    return { t: cap(main) + ' goes with ' + pw.safe.slice(0, 3).join(', ') + ' as a safe base, and ' + pw.accent.slice(0, 2).join(' or ') + ' if you want an accent. From your closet:', x: matches.length ? '<div class="irow">' + matches.slice(0, 8).map(i => '<div><img src="' + esc(src(i)) + '" alt="">' + esc(i.name) + '</div>').join('') + '</div>' : '', q: ['Build a fit with my ' + it.name] };
  }
  if (r.intent === 'pair' || r.intent === 'build') {
    const it = r.item, lock = {}; lock[it.category] = it.id;
    cs = E.candidates({ weather: wxFor(0), vibe: 'Casual', lock });
    if (!cs.length) return { t: 'I need more pieces to pair with your ' + nm(it) + '. Add bottoms and shoes first.' };
    if (r.intent === 'build') { c = cs[0]; CH.current = c; return { t: 'Built around your ' + nm(it) + '. ' + c.reason, x: cardHtml(c), q: quickFor(c) }; }
    const seen = {}, row = [];
    cs.forEach(x => CATS.forEach(k => { const id = x.items[k]; if (id && id !== it.id && !seen[id]) { seen[id] = 1; row.push(E.byId(id)); } }));
    const tone = it.pattern !== 'solid' ? 'is the loud piece, so keep the rest plain' : it.colours.some(cc => !NEUTRAL[cc]) ? 'brings the colour, so build on neutrals' : 'is easy to pair';
    return { t: 'Your ' + nm(it) + ' ' + tone + '. These all work with it:', x: '<div class="irow">' + row.slice(0, 8).map(i => '<div><img src="' + esc(src(i)) + '" alt="">' + esc(i.name) + '</div>').join('') + '</div>', q: ['Build a fit with my ' + it.name] };
  }
  if (r.intent === 'week') {
    const used = {}; let out = '';
    for (let d = 1; d <= 5; d++) {
      w = wxFor(Math.min(d, S.forecast.length - 1));
      cs = E.candidates({ weather: w, vibe: 'Casual' }); if (!cs.length) break;
      const pick = cs.filter(x => !used[x.items.top])[0] || cs[d % cs.length];
      used[pick.items.top] = 1; CH.current = pick;
      out += '<div>' + plate(pick.items, 'sm') + '<b>' + dayWord(d) + ' · ' + w.max + '°</b></div>';
    }
    if (!out) return { t: 'Add a top, bottoms and shoes first, then I can plan your week.' };
    const tops = owned().filter(i => i.category === 'top').length;
    return { t: 'Here are the next five days' + (tops < 5 ? '. You have ' + tops + ' tops, so some repeat; add more and I’ll spread them out.' : ', no repeats.'), x: '<div class="week">' + out + '</div>', q: ['What should I wear today?', 'Start over'] };
  }
  return { t: 'I can suggest fits for any day or occasion, swap pieces, match colours, plan your week and tell you if a wishlist piece is worth buying.' + (S.ai.on ? '' : ' Open questions work once your PC’s AI is connected (see Settings).'), q: ['What should I wear today?', 'Plan my week'] };
}
async function askAI(q) {
  const closet = S.items.map(i => ({ id: i.id, name: i.name, category: i.category, kind: i.sub, colours: i.colours, pattern: i.pattern, fit: i.fit, warmth: i.warmth, dressiness: i.formality, styles: i.styles, lastWornDays: E.lastWornDays(i.id) === Infinity ? null : E.lastWornDays(i.id), owned: i.owned, price: i.price || null }));
  const r = await fetch('/api/stylist', { method: 'POST', headers: aiHeaders(), body: JSON.stringify({
    messages: CH.hist.concat([{ role: 'user', text: q }]).slice(-12), closet, profile: S.profile,
    today: new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
    weather: S.forecast.map((w, i) => ({ day: dayWord(i), max: w.max, min: w.min, conditions: cond(w), rainChance: w.rain }))
  }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'The stylist is unavailable'); e.status = r.status; throw e; }
  const day = parseDay(q.toLowerCase()), vibe = parseVibe(q.toLowerCase()) || 'Casual';
  const cards = (j.outfits || []).filter(o => CATS.every(k => !o.items[k] || E.byId(o.items[k]))).map(o => {
    const c = E.decorate({ items: o.items, w: wxFor(day), vibe }); if (o.name) c.name = o.name; if (o.why) c.reason = o.why; return c;
  });
  if (cards[0]) CH.current = cards[0];
  return { t: j.reply || 'Here you go.', x: cards.map(cardHtml).join(''), q: j.quick && j.quick.length ? j.quick : null };
}
const scrollEnd = () => cbody.scrollTo({ top: cbody.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
async function ask(q) {
  if (CH.busy || !q) return;
  const pre = route(q);
  if (pre.intent === 'reset') return chatReset();
  CH.busy = true;
  const hl = $('.hello', cbody); if (hl) hl.remove();
  $$('.qrs', cbody).forEach(n => n.remove());
  const me = document.createElement('div'); me.className = 'msg me'; me.innerHTML = '<div></div>'; me.firstChild.textContent = q; cbody.appendChild(me);
  const ai = document.createElement('div'); ai.className = 'msg ai';
  ai.innerHTML = '<span class="mini">' + ic('sparkle', 14) + '</span><div class="txt"><span class="dots"><i></i><i></i><i></i></span></div>';
  cbody.appendChild(ai); scrollEnd();
  let r, note = '';
  const local = ['save', 'swap'].indexOf(pre.intent) > -1 && CH.current;
  if (S.ai.on && !local) {
    try { r = await askAI(q); }
    catch (e) { r = respond(q); note = e.status === 401 ? 'Add your access code in Settings to use the AI stylist. ' : S.ai.provider === 'local' ? 'Your PC’s AI didn’t answer, so here’s my quick take. ' : ''; if (e.status >= 500) checkAI(); }
  } else { await wait(reduce ? 100 : 550); r = respond(q); }
  const txt = $('.txt', ai); txt.textContent = '';
  const words = (note + r.t).split(' ');
  for (let i = 0; i < words.length; i++) { txt.textContent += (i ? ' ' : '') + words[i]; if (i % 8 === 0) scrollEnd(); if (!reduce) await wait(24); }
  if (r.x) { const d = document.createElement('div'); d.innerHTML = r.x; while (d.firstChild) txt.appendChild(d.firstChild); }
  if (r.q) { const qs = document.createElement('div'); qs.className = 'qrs'; r.q.forEach(l => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = l; b.onclick = () => ask(l); qs.appendChild(b); }); cbody.appendChild(qs); }
  CH.hist.push({ role: 'user', text: q }, { role: 'assistant', text: r.t });
  CH.busy = false; scrollEnd();
}
$('#comp').addEventListener('submit', e => { e.preventDefault(); const v = $('#q').value.trim(); if (!v) return; $('#q').value = ''; ask(v); });
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fix = () => { const off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); $('#comp').style.transform = off > 60 ? 'translateY(' + (-off + 8) + 'px)' : ''; };
  vv.addEventListener('resize', fix); vv.addEventListener('scroll', fix);
}
$('#mic').addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast('Voice isn’t available here', 'Type your question instead.');
  const v = document.createElement('div'); v.className = 'voice';
  let bars = ''; for (let i = 0; i < 11; i++) bars += '<i style="animation-delay:' + (i * 0.07).toFixed(2) + 's"></i>';
  v.innerHTML = '<div class="wave">' + bars + '</div><b>Listening…</b><small></small><button class="btn ghost" type="button">Cancel</button>';
  chat.appendChild(v);
  let rec, fin = ''; const sm = $('small', v);
  try { rec = new SR(); } catch (e) { v.remove(); return toast('Voice isn’t available here', 'Type instead.'); }
  rec.lang = 'en-ZA'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = ev => { let t = ''; for (let j = 0; j < ev.results.length; j++) t += ev.results[j][0].transcript; fin = t; sm.textContent = '“' + t + '”'; };
  rec.onerror = () => { v.remove(); toast('Couldn’t hear you', 'Check microphone access, or type instead.'); };
  rec.onend = () => { if (!v.parentNode) return; v.remove(); if (fin.trim()) ask(fin.trim()); };
  $('button', v).onclick = () => { fin = ''; try { rec.abort(); } catch (e) {} v.remove(); };
  try { rec.start(); } catch (e) { v.remove(); toast('Voice isn’t available here', 'Type instead.'); }
});

/* ---------- onboarding ---------- */
function onboarding() {
  if (S.seen) return;
  let step = 0; const pr = S.profile;
  const host = $('#onbHost');
  const sample = (S.outfits[0] && S.outfits[0].items) || (S.today[0] && S.today[0].items) || {};
  const how = (icon, t, s) => '<div class="how"><span class="dot">' + icon + '</span><span><b>' + t + '</b><small>' + s + '</small></span></div>';
  function draw() {
    let body;
    if (step === 0) body = '<div class="onbart">' + plate(sample) + '</div><h1>Meet Fitted.</h1><p>Your closet, styled every morning around the weather, your colours and your fit.</p>';
    else if (step === 1) body = '<h1>How do you like<br>your fit?</h1><p>Fitted balances every outfit around this. You can change it any time in Settings.</p>' +
      '<div class="seg four onbseg">' + FITS.map(f => '<button class="' + (pr.fit === f ? 'on' : '') + '" data-f="' + f + '">' + cap(f) + '</button>').join('') + '</div>' +
      '<p class="lbl">Colours you love <small>optional</small></p><div class="chips wrap center">' + Object.keys(COLOURS).map(c => '<button class="pill' + (pr.love.indexOf(c) > -1 ? ' on' : '') + '" data-c="' + c + '"><i style="background:' + COLOURS[c] + '"></i>' + cap(c) + '</button>').join('') + '</div>';
    else body = '<h1>How it works</h1><p>Three things to know.</p><div class="hows">' +
      how('<span class="addmini">' + ic('plus', 18) + '</span>', 'Add clothes', 'Tap + to snap a photo, or paste a shop link to try something before you buy.') +
      how('<span class="barmini"><i></i></span>', 'Swipe up on the bar', 'Your stylist opens from the bottom bar. Ask it anything about your closet.') +
      how(ic('heart', 20), 'Swipe right to save', 'Swipe Today’s fit right to save it, left to skip. Tap a piece to swap it.') + '</div>';
    host.innerHTML = '<div class="onb" id="onb"><div class="onbbody">' + body + '</div><div class="onbfoot"><div class="dots3">' + [0, 1, 2].map(i => '<i class="' + (i === step ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<button class="btn ink block" data-o="next">' + (step < 2 ? 'Next' : 'Start styling') + '</button>' + (step === 1 ? '<button class="linkbtn" data-o="skip">Skip for now</button>' : '<span class="linkbtn ghost"></span>') + '</div></div>';
  }
  host.onclick = e => {
    const f = e.target.closest('[data-f]'), c = e.target.closest('[data-c]'), o = e.target.closest('[data-o]');
    if (f) { pr.fit = pr.fit === f.dataset.f ? '' : f.dataset.f; persist(); return draw(); }
    if (c) { const i = pr.love.indexOf(c.dataset.c); if (i > -1) pr.love.splice(i, 1); else if (pr.love.length < 5) pr.love.push(c.dataset.c); persist(); return draw(); }
    if (!o) return;
    if (step < 2) { step++; return draw(); }
    S.seen = true; store.set('seen2', true); refresh(); render();
    const el = $('#onb'); el.classList.add('bye'); setTimeout(() => { host.innerHTML = ''; host.onclick = null; }, 420);
  };
  draw();
}

/* ---------- boot ---------- */
async function boot() {
  const blobs = await imgs.all();
  Object.keys(blobs).forEach(id => { IMG[id] = URL.createObjectURL(blobs[id]); });
  refresh(); render(); onboarding(); loadWeather(); checkAI();
}
boot();
