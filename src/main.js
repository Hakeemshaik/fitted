import {
  CATS, CATLABEL, ONE, VIBES, STYLES, PATTERNS, FITS, COLOURS, NEUTRAL, WMO, cond, cap, nm, iso, daysAgo, today0,
  normItem, createEngine, guessFromText, pairsWith, isShort
} from './engine.js';
import { store, imgs, blobToDataUrl, dataUrlToBlob } from './db.js';
import { processPhoto, forTagging, rotateBlob, warmUp, autoName, modelsReady } from './vision.js';
import { LOGO, RAIL, TAG, CHALK, SWIPE, TIPS, tee } from './art.js';

/* ---------- helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = o => JSON.parse(JSON.stringify(o));
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAY = 86400000;
const MAX_BATCH = 40;
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const haptic = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };

const P = {
  home: '<path d="M4 11.2 12 4.8l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  hanger: '<path d="M10 6.2a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.6v1.2M12 10.7 3.6 16.3c-.9.6-.5 1.7.5 1.7h15.8c1 0 1.4-1.1.5-1.7L12 10.7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  sparkle: '<path d="M12 3.5l1.7 5.4 5.3 1.7-5.3 1.7L12 17.7l-1.7-5.4L5 10.6l5.3-1.7Z" fill="currentColor"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" fill="currentColor"/>',
  create: '<rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  grid: '<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="2.2"/><rect x="13" y="4" width="7" height="7" rx="2.2"/><rect x="4" y="13" width="7" height="7" rx="2.2"/><rect x="13" y="13" width="7" height="7" rx="2.2"/></g>',
  camera: '<path d="M4 9a2.5 2.5 0 0 1 2.5-2.5h1.7L9.6 4.5h4.8l1.4 2h1.7A2.5 2.5 0 0 1 20 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  photos: '<rect x="7" y="3.5" width="13.5" height="13.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 8v9.5A3 3 0 0 0 7 20.5h9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 14.5l3.4-3.4 2.4 2.4 2-2 3.4 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="16.4" cy="7.6" r="1.4" fill="currentColor"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  search: '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  heart: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6Z" fill="currentColor"/>',
  hearto: '<path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.3-7 9.6-7 9.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  check: '<path d="M6.5 12.5l3.7 3.7L17.5 8.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  x: '<path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  sun: '<circle cx="12" cy="12" r="4" fill="#F5A524"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" stroke="#F5A524" stroke-width="1.8" stroke-linecap="round"/>',
  cloud: '<path d="M7.5 18h9.2a3.8 3.8 0 0 0 .4-7.6A5.3 5.3 0 0 0 7 11.6 3.2 3.2 0 0 0 7.5 18Z" fill="#B9B1A4"/>',
  partly: '<circle cx="9" cy="9" r="3.5" fill="#F5A524"/><path d="M9 2.5v1.5M2.5 9H4M4.4 4.4l1 1M13.6 4.4l-1 1" stroke="#F5A524" stroke-width="1.6" stroke-linecap="round"/><path d="M9 19h8.2a3.4 3.4 0 0 0 .4-6.8A4.8 4.8 0 0 0 8.4 13.3 2.9 2.9 0 0 0 9 19Z" fill="#B9B1A4"/>',
  rain: '<path d="M7.5 14h9.2a3.8 3.8 0 0 0 .4-7.6A5.3 5.3 0 0 0 7 7.6 3.2 3.2 0 0 0 7.5 14Z" fill="#A79F92"/><path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" stroke="#3B5BDB" stroke-width="1.8" stroke-linecap="round"/>',
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z" fill="currentColor"/>',
  chev: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  back: '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
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
  dl: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  ul: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  rotate: '<path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17.5 3.5v4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
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
  seen: store.get('seen3', false),
  tab: 'home', vibe: 'Casual', forecast: null, wxLive: false,
  today: [], todayIdx: 0, scroll: {}, seg: {}, lastTab: null, lastCard: null,
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
const tint = it => { const h = COLOURS[it.colours[0]] || '#E8E0D3'; return 'color-mix(in srgb, ' + h + ' 16%, #E8E0D3)'; };

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
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(l.lat) + '&longitude=' + encodeURIComponent(l.lon) + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=7';
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
    S.ai = { on: !!(j && j.ai), locked: !!(j && j.locked), provider: j && j.provider, model: j && j.model, reason: j && j.reason, vision: !!(j && j.vision) };
    const local = S.ai.provider === 'local';
    $('#aistatus').innerHTML = '<i class="' + (S.ai.on ? 'on' : '') + '"></i>' + esc(S.ai.on ? (local ? 'Local AI' + (S.ai.model ? ' · ' + S.ai.model : '') : 'AI stylist · knows your closet') : local ? 'PC offline · using style rules' : 'Style rules');
  }).catch(() => {});
}
const aiHeaders = () => ({ 'content-type': 'application/json', 'x-fitted-code': S.set.code || '' });

/* ---------- outfit helpers ---------- */
function refresh() {
  S.today = E.candidates({ weather: wxFor(0), vibe: S.vibe, goodOnly: true, byLook: true });
  if (!S.today.length) S.today = E.candidates({ weather: wxFor(0), vibe: S.vibe, limit: 3 });
  if (S.todayIdx > S.today.length) S.todayIdx = 0;
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
const swatches = (list, big) => '<span class="sw' + (big ? ' big' : '') + '">' + (list || []).map(c => '<i style="background:' + COLOURS[c] + '" title="' + esc(c) + '"></i>').join('') + '</span>';
const itemNames = ids => ['top', 'layer', 'bottom', 'shoes', 'extra'].filter(k => ids[k] && E.byId(ids[k])).map(k => E.byId(ids[k]).name).join(', ');
function itemCard(it, i) {
  const d = E.lastWornDays(it.id);
  const meta = it.owned ? cap(it.fit) + ' · ' + (d === Infinity ? 'New' : d === 0 ? 'Worn today' : d + 'd ago') : (it.price ? money(it.price, it.currency) : 'Wishlist') + (it.shop ? ' · ' + it.shop : '');
  return '<button class="item" data-act="item" data-id="' + it.id + '" style="--i:' + (i || 0) + '"><span class="ph" style="--tint:' + tint(it) + '"><img src="' + esc(src(it)) + '" alt="" draggable="false" loading="lazy"></span>' +
    (it.fav ? '<span class="fav">' + ic('heart', 13) + '</span>' : '') + (it.owned ? '' : '<span class="wbadge">' + ic('bag', 13) + '</span>') +
    '<b>' + esc(it.name) + '</b><small>' + swatches(it.colours) + esc(meta) + '</small></button>';
}
function tile(o, i) {
  const n = S.wear.filter(w => E.comboKey(w.items) === E.comboKey(o.items)).length;
  return '<button class="tile" data-act="fit" data-id="' + o.id + '" style="--i:' + (i || 0) + '">' + plate(o.items, 'sm') + '<b>' + esc(o.name) + '</b><small>Worn ' + n + '× · ' + esc(o.vibe) + '</small></button>';
}
function tagCard(c, opts) {
  opts = opts || {};
  const tags = '<div class="tags"><span class="tag">' + swatches(c.colour.swatches) + esc(c.colour.label) + '</span>' + (c.shape && c.shape.label ? '<span class="tag">' + esc(c.shape.label) + '</span>' : '') + '</div>';
  const worn = S.wear.some(w => w.date === iso(new Date()) && E.comboKey(w.items) === E.comboKey(c.items));
  return '<div class="tagcard' + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
    plate(c.items, opts.drop ? 'drop' : '') + (opts.stamps ? '<span class="stamp keep">Saved</span><span class="stamp skip">Next</span>' : '') +
    '<div class="body"><h3>' + esc(c.name) + '</h3><p class="why">' + esc(c.reason) + '</p>' + tags + '</div>' +
    (opts.acts ? '<div class="acts"><button class="circ" data-act="today-skip" aria-label="Show another">' + ic('x') + '</button>' +
      '<button class="btn ' + (worn ? 'done' : 'ink') + '" data-act="today-wear">' + ic('check', 18) + (worn ? 'Wearing it' : 'Wear it') + '</button>' +
      '<button class="circ accent" data-act="today-save" aria-label="Save fit">' + ic('heart') + '</button></div>' : '') + '</div>';
}
function burst(el) {
  if (reduce || !el) return;
  const r = el.getBoundingClientRect(), a = $('#app').getBoundingClientRect(), b = document.createElement('div');
  b.className = 'burst'; b.style.left = (r.left - a.left + r.width / 2) + 'px'; b.style.top = (r.top - a.top + r.height / 2) + 'px';
  for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2, d = 34 + Math.random() * 22, s = document.createElement('i'); s.style.setProperty('--dx', Math.cos(t) * d + 'px'); s.style.setProperty('--dy', Math.sin(t) * d + 'px'); if (i % 3 === 0) s.style.background = 'var(--ink)'; b.appendChild(s); }
  $('#app').appendChild(b); setTimeout(() => b.remove(), 800);
}
function saveOutfit(c, name) {
  const key = E.comboKey(c.items), ex = S.outfits.filter(o => E.comboKey(o.items) === key)[0];
  if (ex) { toast('Already in your Fits', ex.name); return ex; }
  const o = { id: uid(), name: name || c.name, items: clone(c.items), vibe: c.vibe || 'Casual', reason: c.reason || '', by: c.by || 'ai', saved: iso(new Date()) };
  S.outfits.unshift(o);
  CATS.forEach(k => { if (c.items[k]) S.fb.like[c.items[k]] = (S.fb.like[c.items[k]] || 0) + 1; });
  persist(); haptic();
  toast('Saved to Fits', '“' + o.name + '”', () => { S.outfits = S.outfits.filter(x => x.id !== o.id); persist(); render(); });
  return o;
}
function skipFeedback(c) { CATS.forEach(k => { if (c.items[k]) S.fb.skip[c.items[k]] = (S.fb.skip[c.items[k]] || 0) + 1; }); persist(); }
function logWorn(ids) {
  const d = iso(new Date()), items = {};
  CATS.forEach(k => { if (ids[k]) items[k] = ids[k]; });
  S.wear = S.wear.filter(w => w.date !== d);
  S.wear.push({ date: d, items });
  persist(); haptic(); toast('Logged for today', itemNames(items));
}

/* ---------- screens ---------- */
const screens = $('#screens');
function seg(key, opts, cur, attrs, cls) {
  const i = Math.max(0, opts.findIndex(o => o[0] === cur));
  return '<div class="seg' + (cls ? ' ' + cls : '') + '" data-seg="' + key + '" style="--n:' + opts.length + ';--x:' + (S.seg[key] != null ? S.seg[key] : i) + '" data-to="' + i + '" role="tablist">' +
    opts.map(o => '<button role="tab" class="' + (o[0] === cur ? 'on' : '') + '" aria-selected="' + (o[0] === cur) + '" ' + attrs + ' data-v="' + esc(o[0]) + '">' + o[1] + '</button>').join('') + '</div>';
}
function animateSegs(root) {
  $$('.seg[data-seg]', root).forEach(el => {
    const to = +el.dataset.to; S.seg[el.dataset.seg] = to;
    if (el.style.getPropertyValue('--x') === String(to)) return;
    void el.offsetWidth; el.style.setProperty('--x', to);
  });
}
function render() {
  const prev = $('#scr'); if (prev) S.scroll[prev.dataset.tab] = prev.scrollTop;
  const entering = S.lastTab !== S.tab; S.lastTab = S.tab;
  const h = { home: rHome, closet: rCloset, build: rBuild, fits: rFits }[S.tab]();
  screens.innerHTML = '<div class="screen' + (entering && !reduce ? ' enter' : '') + '" id="scr" data-tab="' + S.tab + '">' + h + '</div>';
  const scr = $('#scr');
  Array.prototype.forEach.call(scr.children, (c, i) => c.style.setProperty('--i', Math.min(i, 8)));
  scr.scrollTop = entering ? 0 : S.scroll[S.tab] || 0;
  animateSegs(scr);
  rTabs();
  $('#barhint').classList.toggle('on', !S.set.chatUsed && S.seen);
}
function title(kick, main, sub) {
  return '<div class="title">' + (kick ? '<span class="kick">' + esc(kick) + '</span>' : '') + '<h1>' + main + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>';
}
function rHome() {
  const w = wxFor(0), date = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  let h = '<div class="topbar"><button class="wx" data-act="weather" aria-label="Weather for ' + esc(S.set.loc.name) + '">' + ic(WMO(w.code)[1], 20) + '<b>' + w.max + '°</b><small>' + esc(cond(w)) + '</small></button>' +
    '<button class="circ" data-act="settings" aria-label="Settings">' + ic('gear', 20) + '</button></div>';
  h += title(date, 'Today’s <em>fit</em>');
  if (!S.set.hintOff && !isStandalone()) h += '<div class="hint">' + ic('share', 22) + '<div><b>Install Fitted</b>Tap Share in Safari, then Add to Home Screen.</div><button class="x" data-act="hintoff" aria-label="Dismiss">' + ic('x', 18) + '</button></div>';
  if (!owned().length) return h + emptyCloset();
  h += seg('vibe', VIBES.map(v => [v, v === 'Date night' ? 'Date' : v]), S.vibe, 'data-act="vibe"');
  const c = S.today[S.todayIdx], n = S.today[S.todayIdx + 1];
  if (!c && S.today.length) h += deckEnd();
  else if (c) {
    const key = S.vibe + E.comboKey(c.items), drop = key !== S.lastCard; S.lastCard = key;
    h += '<div class="stack" id="stack">' + (n && n !== c ? tagCard(n, { cls: 'back' }) : '') + tagCard(c, { acts: true, stamps: true, id: 'topcard', drop }) + '</div>';
    h += '<p class="helper"><span>' + ic('heart', 12) + 'Swipe right to save</span><span>' + ic('x', 12) + 'left for next</span><span>Tap a piece to swap</span></p>';
  } else h += '<div class="card empty">' + CHALK + '<b>Almost there</b><p>Add at least a top, bottoms and shoes and Fitted builds you a fit.</p><button class="btn accent" data-act="add">' + ic('plus', 18) + 'Add clothes</button></div>';
  const wl = wishes();
  h += '<div class="sec"><h2>Try before you <em>buy</em></h2>' + (wl.length ? '<button data-act="closet-wish">Wishlist' + ic('chev', 14) + '</button>' : '') + '</div>';
  if (wl.length) h += wl.slice(0, 3).map(wishCard).join('');
  else h += '<button class="promo" data-act="link"><span class="dot">' + ic('link') + '</span><span><b>Paste a link from any shop</b><small>See how it works with what you own before you spend.</small></span>' + ic('chev', 18) + '</button>';
  const old = owned().filter(i => E.lastWornDays(i.id) >= 30);
  if (old.length) h += '<div class="sec"><h2>Give these some <em>love</em></h2><button data-act="style-these">Style one' + ic('chev', 14) + '</button></div><div class="hscroll">' + old.map(itemCard).join('') + '</div>';
  return h;
}
const SLOTWORD = { top: 'top', bottom: 'pair of bottoms', shoes: 'pair of shoes' };
/** The end of Today's deck: say honestly that these were all the good looks, and what would unlock more. */
function deckEnd() {
  const n = S.today.length, need = E.shortOf();
  return '<div class="card empty deckend">' + CHALK + '<b>That’s all ' + n + ' for ' + (S.vibe === 'Date night' ? 'date night' : S.vibe.toLowerCase()) + '</b>' +
    '<p>Those are the only fits I’d stand behind from your closet for today’s weather. One more ' + SLOTWORD[need] + ' would give me new combinations.</p>' +
    '<div class="acts2"><button class="btn ghost" data-act="deck-again">' + ic('rotate', 18) + 'See them again</button><button class="btn accent" data-act="add">' + ic('plus', 18) + 'Add a ' + (need === 'top' ? 'top' : need === 'shoes' ? 'pair' : 'bottom') + '</button></div></div>';
}
function wishCard(it) {
  const cp = E.compat(it.id, wxFor(0)), best = cp && cp.best[0];
  return '<button class="wishc" data-act="item" data-id="' + it.id + '"><span class="th"><img src="' + esc(src(it)) + '" alt=""></span><span class="mid"><b>' + esc(it.name) + '</b><small>' + esc([money(it.price, it.currency), it.shop].filter(Boolean).join(' · ') || 'Wishlist') + '</small>' +
    '<em class="lvl ' + (cp ? cp.level : 'low') + '">' + esc(cp ? cp.verdict : '') + '</em></span>' + (best ? '<span class="mini">' + plate(best.items, 'sm') + '</span>' : '') + '</button>';
}
function emptyCloset() {
  return '<div class="card empty">' + RAIL + '<b>An empty rail</b><p>Add a few photos of your clothes and Fitted starts styling you straight away.</p><div class="acts2"><button class="btn accent" data-act="add">' + ic('photos', 18) + 'Add photos</button><button class="btn ghost" data-act="link">' + ic('link', 18) + 'Shop link</button></div></div>';
}
function rCloset() {
  const o = owned(), wl = wishes(), list = S.closetView === 'owned' ? o : wl;
  let h = title(o.length + ' piece' + (o.length === 1 ? '' : 's') + (wl.length ? ' · ' + wl.length + ' wished for' : ''), 'Your <em>closet</em>');
  h += seg('cview', [['owned', 'My clothes'], ['wish', ic('bag', 15) + 'Wishlist']], S.closetView, 'data-act="cview"');
  h += '<label class="search">' + ic('search', 19) + '<input id="cq" type="search" placeholder="Search colour, type or name" value="' + esc(S.closetQ) + '" autocomplete="off" enterkeyhint="search" maxlength="60"></label>';
  h += '<div class="chips">' + ['all'].concat(CATS).map(k => { const n = k === 'all' ? list.length : list.filter(i => i.category === k).length; return '<button class="pill' + (S.closetCat === k ? ' on' : '') + '" data-act="ccat" data-c="' + k + '">' + (k === 'all' ? 'All' : CATLABEL[k]) + ' <span>' + n + '</span></button>'; }).join('') + '</div>';
  h += '<div id="cgrid">' + closetGrid() + '</div>';
  return h;
}
function closetGrid() {
  const q = S.closetQ.trim().toLowerCase();
  const list = S.items.filter(i => (S.closetView === 'owned' ? i.owned : !i.owned) && (S.closetCat === 'all' || i.category === S.closetCat) &&
    (!q || (i.name + ' ' + i.sub + ' ' + i.category + ' ' + i.fit + ' ' + i.colours.join(' ') + ' ' + i.styles.join(' ') + ' ' + (i.shop || '')).toLowerCase().indexOf(q) > -1));
  if (list.length) return '<div class="items">' + list.map((it, i) => itemCard(it, Math.min(i, 12))).join('') + '</div>';
  if (q) return '<div class="card empty"><b>Nothing called “' + esc(q) + '”</b><p>Try a colour like “black” or a type like “shoes”.</p></div>';
  if (S.closetView === 'wish') return '<div class="card empty">' + TAG + '<b>Nothing wished for yet</b><p>Paste a link from any online shop. Fitted pulls in the photo and price so you can style it before you buy.</p><button class="btn accent" data-act="link">' + ic('link', 18) + 'Paste a shop link</button></div>';
  return '<div class="card empty">' + RAIL + '<b>No ' + (S.closetCat === 'all' ? 'clothes' : CATLABEL[S.closetCat].toLowerCase()) + ' yet</b><p>Add photos and Fitted cuts them out and names them for you.</p><button class="btn accent" data-act="add">' + ic('photos', 18) + 'Add photos</button></div>';
}
function rBuild() {
  const b = S.build, filled = CATS.filter(k => b[k]).length;
  const slot = (k, wide) => {
    const it = b[k] && E.byId(b[k]);
    if (it) return '<button class="slot' + (wide ? ' wide' : '') + '" data-act="slot" data-k="' + k + '"><span class="kick">' + ONE[k] + '</span><img src="' + esc(src(it)) + '" alt="' + esc(it.name) + '" draggable="false">' + (it.owned ? '' : '<b class="wtag">Wishlist</b>') + '</button>';
    return '<button class="slot empty' + (wide ? ' wide' : '') + '" data-act="slot" data-k="' + k + '"><span class="plus">' + ic('plus', 16) + '</span>' + ONE[k] + (k === 'layer' || k === 'extra' ? '<small>optional</small>' : '') + '</button>';
  };
  let h = title('Your own styling', 'Build a <em>fit</em>', 'Tap a slot or pick pieces below. Mix in wishlist pieces to try them first.');
  h += '<div class="canvas"><div class="grid">' + slot('top') + slot('layer') + slot('bottom') + slot('shoes') + slot('extra', true) + '</div>' +
    '<div class="foot"><span>' + filled + ' of 5 filled</span><button data-act="build-clear"' + (filled ? '' : ' disabled') + '>Clear all</button></div></div>';
  const wl = wishes();
  h += seg('bwish', [['0', 'My clothes'], ['1', ic('bag', 15) + 'Wishlist' + (wl.length ? ' · ' + wl.length : '')]], S.buildWish ? '1' : '0', 'data-act="bwish"', 'small');
  const pool = S.buildWish ? wl : owned();
  h += pool.length ? '<div class="strip">' + pool.map(i => '<button data-act="strip" data-id="' + i.id + '" class="' + (b[i.category] === i.id ? 'on' : '') + '" aria-label="' + esc(i.name) + '"><img src="' + esc(src(i)) + '" alt="" draggable="false"></button>').join('') + '</div>'
    : '<button class="promo" data-act="link"><span class="dot">' + ic('link') + '</span><span><b>No wishlist pieces yet</b><small>Paste a shop link to try something with your closet.</small></span>' + ic('chev', 18) + '</button>';
  h += '<div class="acts2"><button class="btn accent" data-act="complete">' + ic('sparkle', 18) + 'Complete it</button><button class="btn ghost" data-act="rate">' + ic('star', 18) + 'Rate my fit</button></div>';
  if (S.rating) {
    const r = S.rating, bar = (l, v, sub) => '<div class="bar2"><span>' + l + '</span><i><b style="width:' + v * 10 + '%"></b></i>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    const wish = CATS.map(k => b[k] && E.byId(b[k])).filter(i => i && !i.owned), cost = wish.reduce((a, i) => a + (i.price || 0), 0);
    h += '<div class="rating card"><div class="top"><div class="ring" style="--v:0" data-v="' + r.overall + '"><svg viewBox="0 0 96 96"><circle class="bg" cx="48" cy="48" r="40"/><circle class="fg" cx="48" cy="48" r="40"/></svg><b>' + r.overall + '<small>/10</small></b></div>' +
      '<div class="bars">' + bar('Colour', r.colour, r.colourLabel) + bar('Fit', r.fit, r.fitLabel) + bar('Weather', r.weather, wxFor(0).max + '° ' + cond(wxFor(0)).toLowerCase()) + '</div></div>' +
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
    days += '<button class="' + (isT ? 'today' : '') + '" data-act="' + (isT ? 'wear-today' : 'noop') + '"' + (isT ? ' aria-label="Log what you wore today"' : '') + '><span>' + 'MTWTFSS'[i] + '</span>' + (top ? '<img src="' + esc(src(top)) + '" alt="">' : isT ? ic('plus', 16) : '<em></em>') + '</button>';
  }
  let h = title(S.outfits.length + ' saved · ' + logged + ' of 7 days logged', 'Saved <em>fits</em>');
  h += '<div class="wk card"><div class="row"><b>This week</b><small>Tap today to log it</small></div><div class="days">' + days + '</div></div>';
  h += '<div class="sec"><h2>Your <em>looks</em></h2><button data-act="tab" data-tab="build">New fit' + ic('chev', 14) + '</button></div>';
  h += S.outfits.length ? '<div class="tiles">' + S.outfits.map((o, i) => tile(o, Math.min(i, 10))).join('') + '</div>' : '<div class="card empty">' + CHALK + '<b>No looks yet</b><p>Tap the heart on Today’s fit, or build one yourself.</p><button class="btn accent" data-act="tab" data-tab="build">' + ic('create', 18) + 'Build a fit</button></div>';
  return h;
}
function rTabs() {
  const t = [['home', 'home', 'Today'], ['closet', 'hanger', 'Closet'], null, ['build', 'create', 'Build'], ['fits', 'grid', 'Fits']];
  $('#tabs').innerHTML = t.map(x => x ? '<button class="tab' + (S.tab === x[0] ? ' on' : '') + '" data-act="tab" data-tab="' + x[0] + '"' + (S.tab === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[1], 23) + '<span>' + x[2] + '</span></button>'
    : '<button class="addbtn" data-act="add" aria-label="Add clothes">' + ic('plus', 26) + '</button>').join('');
}

/* ---------- sheets ---------- */
const sheetWrap = $('#sheetwrap'), sheet = $('#sheet');
let onSheetClose = null;
/** opts: { tall, foot (html), back (fn), still } */
function openSheet(ttl, html, after, opts) {
  opts = opts || {};
  if (onSheetClose) { const f = onSheetClose; onSheetClose = null; f(); }
  sheet.className = 'sheet' + (opts.tall ? ' tall' : '');
  sheet.innerHTML = '<div class="sh">' + (opts.back ? '<button class="circ flat back" data-back="1" aria-label="Back">' + ic('back', 18) + '</button>' : '') + '<h3>' + esc(ttl) + '</h3><button class="circ flat" data-close="1" aria-label="Close">' + ic('x', 18) + '</button></div>' +
    '<div class="sc' + (opts.still ? ' still' : '') + '">' + html + '</div>' + (opts.foot ? '<div class="ft">' + opts.foot + '</div>' : '');
  $$('.sc > *', sheet).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 8)));
  sheetWrap.classList.add('on');
  sheet.onclick = null; sheet.oninput = null;
  $('[data-close]', sheet).onclick = closeSheet;
  if (opts.back) $('[data-back]', sheet).onclick = opts.back;
  if (after) after(sheet);
  animateSegs(sheet);
  const sh = $('.sh', sheet); let y0 = null;
  sh.onpointerdown = e => { if (e.target.closest('button')) return; y0 = e.clientY; try { sh.setPointerCapture(e.pointerId); } catch (x) {} };
  sh.onpointermove = e => { if (y0 == null) return; const d = Math.max(0, e.clientY - y0); sheet.style.transition = 'none'; sheet.style.transform = 'translateY(' + d + 'px)'; };
  sh.onpointerup = sh.onpointercancel = e => { const d = y0 == null ? 0 : e.clientY - y0; y0 = null; sheet.style.transition = ''; sheet.style.transform = ''; if (d > 90) closeSheet(); };
}
function closeSheet() { sheetWrap.classList.remove('on'); if (onSheetClose) { const f = onSheetClose; onSheetClose = null; f(); } }
$('#sheetbd').addEventListener('click', closeSheet);
function busySheet(ttl, msg) { openSheet(ttl, '<div class="busy"><span class="spin"></span><p>' + esc(msg) + '</p></div>'); }

function kv(k, v) { return '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>'; }
function itemSheet(id) {
  const it = E.byId(id); if (!it) return;
  const d = E.lastWornDays(id), n = S.wear.filter(w => CATS.some(k => w.items[k] === id)).length;
  let h = '<div class="bigph" style="background:' + tint(it) + '"><img src="' + esc(src(it)) + '" alt="' + esc(it.name) + '"></div>';
  if (!it.owned) {
    const cp = E.compat(id, wxFor(0));
    h += '<div class="compat ' + (cp ? cp.level : 'low') + '"><b>' + esc(cp ? cp.verdict : 'Add more clothes to see how this fits in.') + '</b>' +
      (cp && cp.best[0] ? plate(cp.best[0].items, 'drop') + '<p>' + esc(cp.best[0].reason) + '</p>' : '') + '</div>';
    h += '<div class="acts2"><button class="btn accent" data-a="build">' + ic('create', 18) + 'Open in Build</button><button class="btn ghost" data-a="bought">' + ic('check', 18) + 'I bought it</button></div>';
    if (it.url && /^https?:\/\//.test(it.url)) h += '<a class="btn ghost block" style="margin-top:12px" href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' + ic('external', 18) + 'View at ' + esc(it.shop || 'the shop') + (it.price ? ' · ' + money(it.price, it.currency) : '') + '</a>';
  }
  h += '<div class="kvs">' + kv('Type', esc(cap(it.sub || it.category))) + kv('Fit', esc(cap(it.fit))) + kv('Colour', swatches(it.colours) + esc(it.colours.join(', '))) +
    kv('Pattern', esc(cap(it.pattern))) + kv('Warmth', '●'.repeat(it.warmth) + '<span class="off">' + '●'.repeat(4 - it.warmth) + '</span>') + kv('Style', esc(it.styles.map(cap).join(' · '))) +
    (it.owned ? kv('Worn', n + '× · ' + (d === Infinity ? 'not yet' : d === 0 ? 'today' : d + ' days ago')) : '') + '</div>';
  h += '<div class="acts2"><button class="btn ghost" data-a="fav">' + ic(it.fav ? 'heart' : 'hearto', 18) + (it.fav ? 'Favourite' : 'Favourite it') + '</button><button class="btn ' + (it.owned ? 'ink' : 'ghost') + '" data-a="style">' + ic('sparkle', 18) + 'Style it</button></div>';
  h += '<div class="acts2"><button class="btn soft" data-a="edit">Edit details</button><button class="btn soft danger" data-a="del">' + ic('trash', 18) + 'Delete</button></div>';
  openSheet(it.name, h, sh => {
    sh.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'fav') { it.fav = !it.fav; persist(); if (it.fav) burst(b); itemSheet(id); render(); }
      if (a === 'style') { closeSheet(); openChat(); setTimeout(() => ask('Build a fit with my ' + it.name), 450); }
      if (a === 'edit') editExisting(it);
      if (a === 'build') { const cp = E.compat(id, wxFor(0)); S.build = EMPTY_BUILD(); Object.assign(S.build, cp && cp.best[0] ? cp.best[0].items : { [it.category]: id }); S.buildWish = true; S.rating = null; closeSheet(); go('build'); }
      if (a === 'bought') { it.owned = true; it.added = iso(new Date()); persist(); refresh(); closeSheet(); render(); toast('Moved to your closet', it.name); }
      if (a === 'del') {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.innerHTML = ic('trash', 18) + 'Tap again'; return; }
        S.items = S.items.filter(x => x.id !== id);
        S.outfits = S.outfits.filter(o => CATS.every(k => o.items[k] !== id));
        CATS.forEach(k => { if (S.build[k] === id) S.build[k] = null; });
        if (it.img === 'idb') { imgs.del(id); if (IMG[id]) URL.revokeObjectURL(IMG[id]); delete IMG[id]; }
        persist(); refresh(); closeSheet(); render(); toast('Deleted', it.name + ' is gone');
      }
    };
  });
}
function fitSheet(oid) {
  const o = S.outfits.filter(x => x.id === oid)[0]; if (!o) return;
  const c = E.decorate({ items: clone(o.items), w: wxFor(0), vibe: o.vibe });
  openSheet(o.name, plate(o.items, 'drop') + '<div class="tags"><span class="tag">' + swatches(c.colour.swatches) + esc(c.colour.label) + '</span>' + (c.shape.label ? '<span class="tag">' + esc(c.shape.label) + '</span>' : '') + '</div>' +
    '<p class="lead">' + esc(o.reason || c.reason) + '</p><p class="muted small center">' + esc(itemNames(o.items)) + '</p>' +
    '<div class="acts2"><button class="btn ink" data-a="wear">' + ic('check', 18) + 'Wear today</button><button class="btn ghost" data-a="edit">' + ic('create', 18) + 'Open in Build</button></div>' +
    '<button class="btn soft danger block" style="margin-top:12px" data-a="del">' + ic('trash', 18) + 'Delete fit</button>', sh => {
    sh.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'wear') { logWorn(o.items); closeSheet(); refresh(); render(); }
      if (b.dataset.a === 'edit') { S.build = Object.assign(EMPTY_BUILD(), clone(o.items)); S.rating = null; closeSheet(); go('build'); }
      if (b.dataset.a === 'del') { S.outfits = S.outfits.filter(x => x.id !== oid); persist(); closeSheet(); render(); toast('Fit deleted', o.name); }
    };
  });
}
function pickSheet(ttl, k, cur, done, allowClear) {
  const list = owned().filter(i => i.category === k).concat(wishes().filter(i => i.category === k));
  openSheet(ttl, (list.length ? '<div class="pick">' + list.map(i => '<button data-id="' + i.id + '" class="' + (cur === i.id ? 'on' : '') + '"><span><img src="' + esc(src(i)) + '" alt=""></span>' + esc(i.name) + (i.owned ? '' : '<b class="wtag">Wishlist</b>') + '</button>').join('') + '</div>'
    : '<div class="empty">' + RAIL + '<b>No ' + CATLABEL[k].toLowerCase() + ' yet</b><p>Add some with the + button.</p></div>') +
    (allowClear && cur ? '<button class="btn soft block" style="margin-top:14px" data-clear="1">Leave this slot empty</button>' : '') +
    (list.length === 1 ? '<p class="muted small center" style="margin-top:14px">That’s your only ' + ONE[k].toLowerCase() + ' so far. Add more to get swaps.</p>' : ''), sh => {
    sh.onclick = e => {
      const b = e.target.closest('[data-id]'), c = e.target.closest('[data-clear]');
      if (b) { closeSheet(); done(b.dataset.id); }
      if (c) { closeSheet(); done(null); }
    };
  });
}
function wearSheet() {
  const tc = S.today[S.todayIdx], opts = (tc ? [{ id: '_today', name: 'Today’s pick: ' + tc.name, items: tc.items, vibe: tc.vibe }] : []).concat(S.outfits);
  if (!opts.length) return toast('Nothing to log yet', 'Save a fit first, or add clothes.');
  openSheet('What did you wear?', '<div class="tiles">' + opts.map((o, i) => '<button class="tile" data-i="' + i + '" style="--i:' + Math.min(i, 8) + '">' + plate(o.items, 'sm') + '<b>' + esc(o.name) + '</b><small>' + esc(o.vibe || '') + '</small></button>').join('') + '</div>' +
    '<button class="btn soft block" style="margin-top:14px" data-b="1">' + ic('create', 18) + 'Something else · build it</button>', sh => {
    sh.onclick = e => {
      const t = e.target.closest('[data-i]'); if (t) { logWorn(opts[+t.dataset.i].items); closeSheet(); refresh(); render(); return; }
      if (e.target.closest('[data-b]')) { closeSheet(); go('build'); }
    };
  });
}

/* ---------- weather + settings ---------- */
function weatherSheet() {
  const rows = S.forecast.map((w, i) => '<div class="wrow"><span>' + (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(w.date + 'T00:00').toLocaleDateString('en-ZA', { weekday: 'long' })) + '</span>' + ic(WMO(w.code)[1], 22) + '<b>' + w.max + '°</b><small>' + w.min + '°</small><em>' + (w.rain >= 30 ? w.rain + '% rain' : '') + '</em></div>').join('');
  openSheet('Weather in ' + S.set.loc.name, (S.wxLive ? '' : '<p class="muted small center">Showing a sample forecast until live weather loads.</p>') + '<div class="wlist">' + rows + '</div>' + locationBlock(), bindLocation);
}
function locationBlock() {
  return '<div class="field"><label>Location</label><div class="acts2 tight"><button class="btn ghost" data-loc="gps">' + ic('pin', 18) + 'Use my location</button><input type="search" id="cityq" placeholder="Search a city" autocomplete="off" enterkeyhint="search" maxlength="60"></div><div id="cityres" class="cityres"></div></div>';
}
function bindLocation(sh) {
  const gps = $('[data-loc="gps"]', sh), q = $('#cityq', sh), res = $('#cityres', sh);
  const setLoc = l => { S.set.loc = l; persist(); loadWeather(); closeSheet(); toast('Weather set to ' + l.name); };
  gps.onclick = () => {
    if (!navigator.geolocation) return toast('Location isn’t available', 'Search for your city instead.');
    gps.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(p => setLoc({ lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), name: 'your area' }),
      () => { gps.innerHTML = ic('pin', 18) + 'Use my location'; toast('Couldn’t get your location', 'Check location access, or search your city.'); }, { timeout: 10000, maximumAge: 3600000 });
  };
  let t = null;
  q.oninput = () => {
    clearTimeout(t); const v = q.value.trim(); if (v.length < 2) { res.innerHTML = ''; return; }
    t = setTimeout(() => fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&name=' + encodeURIComponent(v)).then(r => r.json()).then(j => {
      res.innerHTML = (j.results || []).map((c, i) => '<button data-i="' + i + '">' + esc(c.name) + '<small>' + esc([c.admin1, c.country].filter(Boolean).join(', ')) + '</small></button>').join('') || '<p class="muted small">No matches.</p>';
      res.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const c = j.results[+b.dataset.i]; setLoc({ lat: +c.latitude, lon: +c.longitude, name: String(c.name).slice(0, 40) }); };
    }).catch(() => { res.innerHTML = '<p class="muted small">Couldn’t search right now.</p>'; }), 300);
  };
}
function settingsSheet() {
  const pr = S.profile;
  const colourChips = key => '<div class="chips">' + Object.keys(COLOURS).map(c => '<button class="pill' + (pr[key].indexOf(c) > -1 ? ' on' : '') + '" data-pc="' + key + '" data-v="' + c + '"><i style="background:' + COLOURS[c] + '"></i>' + cap(c) + '</button>').join('') + '</div>';
  const aiText = S.ai.on ? (S.ai.provider === 'local' ? 'On. Using ' + (S.ai.model || 'the model') + ' on your PC through ngrok' + (S.ai.vision ? ', including photo naming and reading screenshots.' : '. Load a vision model (e.g. Qwen3-VL) to also name photos.') : 'On. The stylist chat and photo tagging use Claude.')
    : S.ai.provider === 'local' ? 'Your PC’s AI is offline: ' + (S.ai.reason || 'no answer') + ' Fitted uses its built-in rules until it’s back.' : 'Off. Fitted is styling with its built-in rules. Set LLM_BASE_URL in Vercel to use the AI on your PC; it uses whichever model LM Studio has loaded.';
  const h = '<h4 class="group">My style</h4>' +
    '<div class="field"><label>Preferred fit</label><div class="fitpick">' + FITS.map(f => '<button class="' + (pr.fit === f ? 'on' : '') + '" data-pf="' + f + '">' + tee(f) + cap(f) + '</button>').join('') + '</div></div>' +
    '<div class="field"><label>Colours I love</label>' + colourChips('love') + '</div>' +
    '<div class="field"><label>Colours I avoid</label>' + colourChips('avoid') + '</div>' +
    '<h4 class="group">Weather</h4><p class="muted small">Now: ' + esc(S.set.loc.name) + '</p>' + locationBlock() +
    '<h4 class="group">Stylist AI</h4><p class="muted small">' + esc(aiText) + '</p>' +
    (S.ai.locked ? '<div class="field"><label for="acode">Access code</label><input type="text" id="acode" value="' + esc(S.set.code) + '" placeholder="The FITTED_ACCESS_CODE you set on Vercel" autocomplete="off" maxlength="80"></div>' : '') +
    '<h4 class="group">Your data</h4><p class="muted small">Your closet lives on this phone. Back it up before deleting the app.</p>' +
    '<div class="acts2"><button class="btn ghost" data-s="export">' + ic('dl', 18) + 'Back up</button><label class="btn ghost filebtn">' + ic('ul', 18) + 'Restore<input type="file" accept="application/json,.json" id="importf"></label></div>' +
    '<button class="btn soft block" style="margin-top:12px" data-s="tips">' + ic('camera', 18) + 'Photo tips</button>' +
    '<button class="btn soft block" style="margin-top:10px" data-s="tour">Show the intro again</button>' +
    '<button class="btn soft danger block" style="margin-top:10px" data-s="reset">Reset to the demo closet</button>';
  openSheet('Settings', h, sh => {
    bindLocation(sh);
    const code = $('#acode', sh); if (code) code.onchange = () => { S.set.code = code.value.trim(); persist(); };
    $('#importf', sh).onchange = e => { const f = e.target.files && e.target.files[0]; if (f) importBackup(f); };
    sh.onclick = e => {
      const pf = e.target.closest('[data-pf]'), pc = e.target.closest('[data-pc]'), s = e.target.closest('[data-s]');
      if (pf) { pr.fit = pr.fit === pf.dataset.pf ? '' : pf.dataset.pf; $$('[data-pf]', sh).forEach(x => x.classList.toggle('on', x.dataset.pf === pr.fit)); persist(); refresh(); render(); }
      if (pc) {
        const key = pc.dataset.pc, other = key === 'love' ? 'avoid' : 'love', v = pc.dataset.v, arr = pr[key], i = arr.indexOf(v);
        if (i > -1) arr.splice(i, 1); else { arr.push(v); const j = pr[other].indexOf(v); if (j > -1) { pr[other].splice(j, 1); const o = $('[data-pc="' + other + '"][data-v="' + v + '"]', sh); if (o) o.classList.remove('on'); } }
        pc.classList.toggle('on', arr.indexOf(v) > -1); persist(); refresh(); render();
      }
      if (s && s.dataset.s === 'export') exportBackup();
      if (s && s.dataset.s === 'tips') tipsSheet(settingsSheet);
      if (s && s.dataset.s === 'tour') { closeSheet(); S.seen = false; onboarding(); }
      if (s && s.dataset.s === 'reset') {
        if (!s.dataset.sure) { s.dataset.sure = '1'; s.textContent = 'Tap again to erase everything'; return; }
        S.items.forEach(i => { if (i.img === 'idb') imgs.del(i.id); });
        S.items = clone(SEED_ITEMS).map(normItem); S.outfits = clone(SEED_OUTFITS); S.wear = clone(SEED_WEAR); S.fb = { like: {}, skip: {} }; S.build = EMPTY_BUILD(); S.rating = null;
        persist(); refresh(); chatReset(); closeSheet(); go('home'); toast('Fresh start', 'Back to the 5 demo pieces');
      }
    };
  });
}
async function exportBackup() {
  const items = await Promise.all(S.items.map(async i => { const o = clone(i); if (i.img === 'idb' && IMG[i.id]) { try { o.img = await blobToDataUrl(await (await fetch(IMG[i.id])).blob()); } catch (e) {} } return o; }));
  const data = JSON.stringify({ app: 'fitted', v: 3, exported: new Date().toISOString(), items, outfits: S.outfits, wear: S.wear, fb: S.fb, profile: S.profile });
  const name = 'fitted-backup-' + iso(new Date()) + '.json', file = new File([data], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Fitted backup' }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Backup saved', name);
}
async function importBackup(f) {
  try {
    if (f.size > 200e6) throw new Error('big');
    const j = JSON.parse(await f.text());
    if (j.app !== 'fitted' || !Array.isArray(j.items)) throw new Error('bad');
    const items = [];
    for (const raw of j.items.slice(0, 2000)) {
      if (!raw || typeof raw !== 'object') continue;
      const i = normItem({ id: String(raw.id || uid()).slice(0, 24), name: String(raw.name || 'Item').slice(0, 60), category: raw.category, sub: String(raw.sub || '').slice(0, 40), colours: raw.colours, pattern: raw.pattern, fit: raw.fit, warmth: raw.warmth, formality: raw.formality, styles: raw.styles, owned: raw.owned !== false, fav: !!raw.fav, price: raw.price == null ? null : +raw.price || null, currency: raw.currency ? String(raw.currency).slice(0, 4) : null, url: /^https?:\/\//.test(raw.url || '') ? String(raw.url).slice(0, 500) : undefined, shop: raw.shop ? String(raw.shop).slice(0, 60) : undefined, added: raw.added });
      const img = String(raw.img || '');
      if (/^data:image\/(png|jpeg|webp);base64,/.test(img)) { const blob = await dataUrlToBlob(img); i.img = (await saveBlob(i.id, blob)) ? 'idb' : img; }
      else if (/^img\/[\w-]+\.webp$/.test(img) || /^https:\/\//.test(img)) i.img = img;
      else continue;
      items.push(i);
    }
    S.items = items; S.outfits = Array.isArray(j.outfits) ? j.outfits.slice(0, 2000) : []; S.wear = Array.isArray(j.wear) ? j.wear.slice(0, 5000) : [];
    S.fb = j.fb && typeof j.fb === 'object' ? j.fb : { like: {}, skip: {} }; S.profile = Object.assign({ fit: '', love: [], avoid: [] }, j.profile || {});
    persist(); refresh(); closeSheet(); render(); toast('Closet restored', S.items.length + ' pieces');
  } catch (e) { toast('Couldn’t restore that file', 'Pick a Fitted backup (.json).'); }
}
async function saveBlob(id, blob) {
  try { await imgs.put(id, blob); if (IMG[id]) URL.revokeObjectURL(IMG[id]); IMG[id] = URL.createObjectURL(blob); return true; } catch (e) { return false; }
}

/* ---------- add: photos, camera, link ---------- */
function addSheet() {
  warmUp();
  openSheet('Add to your closet',
    '<label class="addrow hero"><span class="dot">' + ic('photos') + '</span><span><b>Choose photos</b><small>Pick as many as you like. Fitted cuts each one out and names it.</small></span>' + ic('chev', 18) + '<input type="file" accept="image/*" multiple id="flib"></label>' +
    '<label class="addrow"><span class="dot paper">' + ic('camera') + '</span><span><b>Take a photo</b><small>One item, laid flat or hung up</small></span>' + ic('chev', 18) + '<input type="file" accept="image/*" capture="environment" id="fcam"></label>' +
    '<button class="addrow" data-a="link"><span class="dot paper">' + ic('link') + '</span><span><b>Paste a shop link</b><small>Try it with your closet before you buy</small></span>' + ic('chev', 18) + '</button>' +
    '<button class="tipsrow" data-a="tips">' + TIPS[0][1] + '<span><b>How to take a great photo</b><small>Six quick tips for clean cut-outs</small></span>' + ic('chev', 18) + '</button>' +
    '<p class="muted small center" style="margin-top:16px">Backgrounds are removed on your phone. Your photos never leave it' + (S.ai.on ? ' except to your stylist AI for naming.' : '.') + '</p>', sh => {
    const h = e => { const fs = Array.prototype.slice.call(e.target.files || []).filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(f.name)); if (fs.length) startBatch(fs); };
    $('#fcam', sh).onchange = h; $('#flib', sh).onchange = h;
    sh.onclick = e => { if (e.target.closest('[data-a="link"]')) linkSheet(); if (e.target.closest('[data-a="tips"]')) tipsSheet(addSheet); };
  });
}
/** How to photograph clothes so the cut-out, naming and colours come out right. */
function tipsSheet(back) {
  openSheet('Photo tips', '<p class="lead">Fitted cuts out and names each piece on your phone. These make it spot on.</p>' +
    '<div class="tips">' + TIPS.map((t, i) => '<div class="tip" style="--i:' + i + '">' + t[1] + '<div><b>' + t[2] + '</b><small>' + t[3] + '</small></div></div>').join('') + '</div>' +
    '<button class="btn accent block" data-t="go" style="margin-top:18px">' + ic('photos', 18) + 'Add photos</button>', sh => {
    sh.onclick = e => { if (e.target.closest('[data-t="go"]')) addSheet(); };
  }, { tall: true, back: back || null });
  S.set.tipsSeen = true; persist();
}
function linkSheet(prefill, err) {
  openSheet('Add from a shop',
    '<div class="empty" style="padding:6px 0 0">' + TAG + '</div><p class="lead">Paste the link to a product page. Fitted pulls in the photo, name and price so you can style it with your closet.</p>' +
    '<div class="field"><input type="url" id="lu" inputmode="url" autocomplete="off" maxlength="600" placeholder="https://shop.co.za/product/…" value="' + esc(prefill || '') + '"></div>' +
    '<div class="acts2"><button class="btn ghost" data-a="paste">Paste</button><button class="btn accent" data-a="go">' + ic('link', 18) + 'Get item</button></div><p class="err" id="lerr" role="alert">' + esc(err || '') + '</p>' +
    '<p class="muted small center">Works with most online shops. If one blocks it, screenshot the item and add it from Photos.</p>', sh => {
    const inp = $('#lu', sh), errEl = $('#lerr', sh);
    const go2 = async () => {
      const u = inp.value.trim().match(/https?:\/\/[^\s<>"']+/);
      if (!u) { errEl.textContent = 'That doesn’t look like a link. Copy it from the shop’s share button.'; return; }
      busySheet('Reading the shop', 'Finding the photo, name and price…');
      try {
        const r = await fetch('/api/product?url=' + encodeURIComponent(u[0]));
        const j = await r.json().catch(() => ({ error: 'Link import needs the app to be deployed on Vercel.' }));
        if (!r.ok) throw new Error(j.error || 'Couldn’t read that page');
        productSheet(j);
      } catch (e) { linkSheet(u[0], e.message || 'Couldn’t read that page'); }
    };
    sh.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'paste') { try { inp.value = (await navigator.clipboard.readText()).trim().slice(0, 600); if (/https?:\/\//.test(inp.value)) go2(); } catch (x) { errEl.textContent = 'Press and hold the box, then tap Paste.'; inp.focus(); } }
      if (b.dataset.a === 'go') go2();
    };
    inp.onkeydown = e => { if (e.key === 'Enter') go2(); };
  });
}
function productSheet(p) {
  let pick = 0;
  const imgs2 = (p.images || []).filter(u => /^https?:\/\//.test(u));
  const g = guessFromText([p.name, p.colour, p.description].filter(Boolean).join(' '));
  const draw = () => '<div class="bigph"><img src="' + esc(imgs2[pick] || '') + '" alt="" referrerpolicy="no-referrer"></div>' +
    (imgs2.length > 1 ? '<p class="muted small center">Pick the clearest photo of just the item</p><div class="gallery">' + imgs2.map((u, i) => '<button data-i="' + i + '" class="' + (i === pick ? 'on' : '') + '"><img src="' + esc(u) + '" alt="" referrerpolicy="no-referrer" loading="lazy"></button>').join('') + '</div>' : '') +
    '<div class="prod"><b>' + esc(p.name || 'Untitled item') + '</b><small>' + esc([p.brand, p.site].filter((v, i, a) => v && a.findIndex(x => x && x.toLowerCase() === v.toLowerCase()) === i).join(' · ')) + '</small>' + (p.price ? '<em>' + esc(money(p.price, p.currency)) + '</em>' : '') + '</div>' +
    (imgs2.length ? '<button class="btn accent block" data-a="use">' + ic('check', 18) + 'Use this photo</button>' : '<p class="err">No photo on that page. Screenshot the item and add it from Photos.</p>');
  openSheet('Found it', draw(), sh => {
    sh.onclick = async e => {
      const t = e.target.closest('[data-i]');
      if (t) { pick = +t.dataset.i; const sc = $('.sc', sh); sc.classList.add('still'); sc.innerHTML = draw(); return; }
      if (!e.target.closest('[data-a="use"]')) return;
      const meta = { name: shortName(p.name, g), owned: false, price: p.price, currency: p.currency, url: p.url, shop: p.site || p.brand, fromShop: true, guess: g };
      busySheet('Getting it ready', 'Cutting out the background…');
      try {
        const r = await fetch('/api/img?url=' + encodeURIComponent(imgs2[pick]));
        if (!r.ok) throw new Error('img');
        startBatch([await r.blob()], meta);
      } catch (x) { toast('Couldn’t fetch that photo', 'Screenshot it and add it from Photos instead.'); closeSheet(); }
    };
  });
}
function shortName(t, g) {
  let n = String(t || '').replace(/\s*[|–—-]\s*[^|–—-]*$/, '').replace(/\b(men'?s|women'?s|unisex|mens|womens)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (n.length > 32) n = ((g.colours && g.colours[0] ? cap(g.colours[0]) + ' ' : '') + (g.sub || n.split(' ').slice(0, 3).join(' '))).trim();
  return n.slice(0, 40);
}

/* ---------- batch: many photos -> cut out, name, review, save ---------- */
let B = null; // { drafts, view: 'grid' | draft id, meta }
function startBatch(files, meta) {
  if (files.length > MAX_BATCH) toast('Adding the first ' + MAX_BATCH, 'Do the rest in another round.');
  B = { meta: meta || {}, view: 'grid', drafts: files.slice(0, MAX_BATCH).map(f => ({ id: uid(), file: f, status: 'wait', thumb: URL.createObjectURL(f), cut: null, orig: null, useCut: true, t: null, touched: {}, ai: '' })) };
  if (B.drafts.length === 1) B.view = B.drafts[0].id;
  drawBatch(true);
  runCutQueue();
}
const dUrl = d => { if (!d.url) d.url = URL.createObjectURL(d.useCut && d.cut ? d.cut : d.orig || d.file); return d.url; };
const resetUrl = d => { if (d.url) { const u = d.url; setTimeout(() => URL.revokeObjectURL(u), 3000); } d.url = null; };
function batchDone() { return B.drafts.filter(d => d.status === 'done'); }
let redrawLater = false;
function drawBatch(first, changed) {
  if (!B) return;
  const d = B.view !== 'grid' && B.drafts.filter(x => x.id === B.view)[0];
  if (d && d.status === 'done') {
    const onScreen = $('.sheet #tn');
    if (!first && onScreen) {
      if (changed && changed !== d) return;           // another photo finished: the editor has nothing new to show
      const a = document.activeElement;
      if (a && sheet.contains(a) && a.tagName === 'INPUT') { redrawLater = true; return; } // don't wipe what they're typing
      readEditor(d);
    }
    return drawEditor(d, first);
  }
  const ready = batchDone().length, total = B.drafts.length, working = B.drafts.some(x => x.status === 'wait' || x.status === 'work');
  const tiles = B.drafts.map((x, i) => '<div class="bt ' + (x.status === 'done' ? 'done' : x.status === 'err' ? 'err' : x.status === 'work' ? 'work wait' : 'wait') + '" style="--i:' + Math.min(i, 10) + '" data-d="' + x.id + '">' +
    '<div class="ph">' + (x.status === 'done' ? '<img src="' + esc(dUrl(x)) + '" alt="">' : x.status === 'work' ? '<img src="' + esc(x.thumb) + '" alt="">' : '<span class="ph0"></span>') + '</div>' +
    (x.status === 'done' ? '<button class="r" data-rot="' + x.id + '" aria-label="Rotate">' + ic('rotate', 15) + '</button>' : '') + '<button class="x" data-rm="' + x.id + '" aria-label="Remove">' + ic('x', 14) + '</button>' +
    '<b>' + esc(x.t ? x.t.name : x.status === 'err' ? 'Couldn’t read this one' : x.status === 'work' ? 'Cutting out…' : 'Waiting…') + '</b><small' + (x.t && x.conf < 0.45 && x.ai !== 'done' && !x.touched.category ? ' class="warn"' : '') + '>' + esc(x.t ? ONE[x.t.category] + (x.ai === 'work' ? ' · naming…' : x.conf < 0.45 && x.ai !== 'done' && !x.touched.category ? ' · check type' : '') : ' ') + '</small></div>').join('');
  const tricky = B.drafts.some(x => x.status === 'err' || (x.status === 'done' && (x.method !== 'ai' || x.conf < 0.45)));
  const body = (tricky && !working ? '<button class="tipbar" data-tips="1">' + ic('sparkle', 16) + '<span>Some photos were tricky. <b>See photo tips</b></span></button>' : '') + '<div class="bhead"><b>' + ready + ' of ' + total + ' ready</b><small>' + (working ? (modelsReady() ? 'Cutting out backgrounds…' : 'Setting up the on-phone AI · first time only') : 'Tap one to check it') + '</small></div><div class="prog"><i style="width:' + Math.round(100 * B.drafts.filter(x => x.status === 'done' || x.status === 'err').length / Math.max(1, total)) + '%"></i></div><div class="bgrid">' + tiles + '</div>';
  const foot = '<button class="btn accent block" data-save="1"' + (ready ? '' : ' disabled') + '>' + ic('check', 18) + (working ? 'Add ' + ready + ' now · ' + (total - ready) + ' still working' : 'Add ' + ready + ' to your closet') + '</button>';
  const sc = $('.sheet .sc');
  if (!first && sc && $('.bgrid', sc)) { sc.classList.add('still'); const y = sc.scrollTop; sc.innerHTML = body; sc.scrollTop = y; $('.sheet .ft').innerHTML = foot; return; }
  if (onSheetClose === cleanupBatch) onSheetClose = null;
  openSheet('New pieces', body, bindBatch, { tall: true, foot, still: !first });
  onSheetClose = cleanupBatch;
}
function bindBatch(sh) {
  sh.onclick = e => {
    if (!B) return;
    const rm = e.target.closest('[data-rm]'), rot = e.target.closest('[data-rot]'), t = e.target.closest('[data-d]');
    if (e.target.closest('[data-save]')) return saveBatch();
    if (e.target.closest('[data-tips]')) { onSheetClose = null; tipsSheet(() => drawBatch(true)); onSheetClose = cleanupBatch; return; }
    if (rm) { const gone = B.drafts.filter(x => x.id === rm.dataset.rm)[0]; if (gone) { URL.revokeObjectURL(gone.thumb); resetUrl(gone); } B.drafts = B.drafts.filter(x => x.id !== rm.dataset.rm); if (!B.drafts.length) return closeSheet(); return drawBatch(); }
    if (rot) return rotateDraft(B.drafts.filter(x => x.id === rot.dataset.rot)[0], 90);
    if (t) { const d = B.drafts.filter(x => x.id === t.dataset.d)[0]; if (d && d.status === 'done') { B.view = d.id; drawBatch(true); } }
  };
}
function cleanupBatch() {
  if (!B) return;
  B.drafts.forEach(d => { URL.revokeObjectURL(d.thumb); resetUrl(d); });
  B = null;
}
let cutting = false;
async function runCutQueue() {
  if (cutting) return; cutting = true;
  try {
    for (;;) {
      const d = B && B.drafts.filter(x => x.status === 'wait')[0]; if (!d) break;
      d.status = 'work'; drawBatch(false, d);
      try {
        const r = await processPhoto(d.file);
        if (!B || B.drafts.indexOf(d) < 0) continue;
        const m = B.meta, g = Object.assign({}, r.guess, m.guess || {});
        d.cut = r.cut; d.orig = r.orig; d.useCut = !!r.cut; d.method = r.method; d.context = r.context; d.conf = r.guess.conf;
        d.t = normItem({ name: m.name || r.guess.name, category: g.category, sub: g.sub, fit: g.fit || 'regular', colours: (m.fromShop && m.guess && m.guess.colours) || (r.colours.length ? r.colours : ['black']), pattern: g.pattern || 'solid', warmth: g.warmth, formality: g.formality, styles: g.styles, owned: m.owned !== false, price: m.price || null });
        d.status = 'done'; URL.revokeObjectURL(d.thumb);
        if (S.ai.on) { d.ai = 'work'; aiQueue.push(d); runAiQueue(); }
      } catch (e) { d.status = 'err'; }
      drawBatch(false, d);
    }
  } finally { cutting = false; }
}
const aiQueue = []; let tagging = false;
async function runAiQueue() {
  if (tagging) return; tagging = true;
  try {
    while (aiQueue.length) {
      const d = aiQueue.shift();
      if (!B || B.drafts.indexOf(d) < 0) continue;
      try {
        const image = d.context ? await forTagging(d.context, 1100) : await forTagging(d.cut || d.orig);
        const r = await fetch('/api/tag', { method: 'POST', headers: aiHeaders(), body: JSON.stringify({ image, hint: B.meta.name || '', screenshot: !!d.context }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'failed');
        ['name', 'category', 'sub', 'fit', 'pattern', 'warmth', 'formality', 'styles', 'colours'].forEach(k => { if (!d.touched[k] && j[k] != null && !(Array.isArray(j[k]) && !j[k].length)) d.t[k] = j[k]; });
        if (B.meta.fromShop && B.meta.name && !d.touched.name && B.meta.name.length <= 28) d.t.name = B.meta.name;
        normItem(d.t);
        if (j.rotate && !d.touched.rot && !d.context) await rotateDraft(d, j.rotate, true);
        d.ai = 'done';
      } catch (e) { d.ai = ''; }
      if (B) drawBatch(false, d);
    }
  } finally { tagging = false; }
}
function rotateDraft(d, deg, quiet) {
  if (!d || !d.orig) return Promise.resolve();
  if (!quiet) d.touched.rot = 1;
  // chain turns so quick taps (or a tap during the AI's own turn) all land, and cut and original stay in step
  d.rotP = (d.rotP || Promise.resolve()).then(async () => {
    const [c, o] = await Promise.all([d.cut ? rotateBlob(d.cut, deg) : null, rotateBlob(d.orig, deg)]);
    d.cut = c; d.orig = o; resetUrl(d); if (B) drawBatch(false, d);
  }).catch(() => {});
  return d.rotP;
}
function drawEditor(d, first) {
  const t = d.t, more = !!d.more, single = B.drafts.length === 1;
  const sg = (key, list, label) => seg('ed-' + key, list.map(v => [v, esc(label(v))]), t[key], 'data-k="' + key + '"', 'small');
  const chips = (key, list, label, multi) => '<div class="chips" data-key="' + key + '"' + (multi ? ' data-multi="1"' : '') + '>' + list.map(v => { const on = multi ? t[key].indexOf(v) > -1 : t[key] === v; return '<button class="pill' + (on ? ' on' : '') + '" data-v="' + v + '">' + (key === 'colours' ? '<i style="background:' + COLOURS[v] + '"></i>' : '') + esc(cap(v)) + '</button>'; }).join('') + '</div>';
  const dots = (key, n) => '<div class="dotsel" data-key="' + key + '">' + Array.from({ length: n }, (_, i) => '<button class="' + (i + 1 <= t[key] ? 'on' : '') + '" data-n="' + (i + 1) + '" aria-label="' + key + ' ' + (i + 1) + '"></button>').join('') + '</div>';
  const note = d.ai === 'work' ? ic('sparkle', 14) + 'Your stylist is naming it…' : d.ai === 'done' ? ic('sparkle', 14) + 'Named by your stylist. Check it looks right.' : B.existing ? ic('create', 14) + 'Fix anything that looks off' : d.context ? ic('check', 14) + 'Pulled out of your screenshot' : d.method === 'ai' ? ic('check', 14) + 'Background removed and straightened' : d.cut ? ic('check', 14) + 'Background removed' : ic('palette', 14) + 'Colours picked up from the photo';
  const body = '<div class="bigph' + (d.useCut && d.cut ? ' cut' : '') + '"><img src="' + esc(dUrl(d)) + '" alt=""><button class="circ rot" data-rot1="1" aria-label="Rotate 90°">' + ic('rotate', 18) + '</button></div>' +
    (d.cut && !B.existing ? seg('ed-bg', [['cut', 'Cut out'], ['orig', 'Original']], d.useCut ? 'cut' : 'orig', 'data-bg="1"', 'small') : '') +
    '<p class="ailine' + (d.ai === 'work' ? '' : ' muted') + '">' + note + '</p>' +
    '<div class="field"><label for="tn">Name</label><input type="text" id="tn" value="' + esc(t.name) + '" placeholder="e.g. Black hoodie" autocomplete="off" maxlength="60"></div>' +
    '<div class="field"><label>Type</label>' + sg('category', CATS, v => ONE[v]) + '</div>' +
    (t.category !== 'extra' ? '<div class="field"><label>Fit</label>' + sg('fit', FITS, cap) + '</div>' : '') +
    '<div class="field"><label>Colours <small>up to 3, main first</small></label>' + chips('colours', Object.keys(COLOURS), cap, true) + '</div>' +
    (B.meta.fromShop ? '<div class="field"><label>Do you own it?</label>' + seg('ed-own', [['0', 'Not yet · wishlist'], ['1', 'I own it']], t.owned ? '1' : '0', 'data-own="1"', 'small') + '</div>' : '') +
    '<button class="morebtn" data-more="1">' + (more ? 'Fewer details' : 'More details') + ic('down', 16) + '</button>' +
    (more ? '<div class="field"><label for="ts">Kind</label><input type="text" id="ts" value="' + esc(t.sub) + '" placeholder="e.g. hoodie, jeans, sneakers" autocomplete="off" maxlength="40"></div>' +
      '<div class="field"><label>Pattern</label>' + chips('pattern', PATTERNS, cap) + '</div>' +
      '<div class="field"><label>Warmth</label>' + dots('warmth', 4) + '</div>' +
      '<div class="field"><label>How dressy</label>' + dots('formality', 5) + '</div>' +
      '<div class="field"><label>Style</label>' + chips('styles', STYLES, cap, true) + '</div>' : '');
  const foot = '<button class="btn accent block" data-done="1">' + ic('check', 18) + (single ? (t.owned ? 'Save to closet' : 'Add to wishlist') : 'Looks good') + '</button>';
  const sc = $('.sheet .sc');
  if (!first && sc && $('#tn', sc)) { sc.classList.add('still'); const y = sc.scrollTop; sc.innerHTML = body; sc.scrollTop = y; animateSegs(sheet); return; }
  if (onSheetClose === cleanupBatch) onSheetClose = null;
  openSheet(single ? 'Check your piece' : 'Piece ' + (B.drafts.indexOf(d) + 1) + ' of ' + B.drafts.length, body, sh => bindEditor(sh, d), { tall: true, foot, back: single ? null : () => { readEditor(d); B.view = 'grid'; drawBatch(true); } });
  onSheetClose = cleanupBatch;
}
const DEFAULT_SUB = { top: 't-shirt', layer: 'jacket', bottom: 'pants', shoes: 'sneakers', extra: 'cap' };
/** Keep the suggested name in step with type and colour until the user types their own. */
function renameDraft(d) { if (!d.touched.name && !B.existing) { const n = $('#tn'); if (n && n.value !== d.t.name) d.touched.name = 1; else { d.t.name = autoName(d.t.colours, d.t.sub, d.t.pattern); if (n) n.value = d.t.name; } } }
function readEditor(d) { const n = $('#tn'), s = $('#ts'); if (n) d.t.name = n.value.slice(0, 60); if (s) d.t.sub = s.value.slice(0, 40); }
function bindEditor(sh, d) {
  const t = d.t;
  sh.onfocusout = () => { if (redrawLater) { redrawLater = false; setTimeout(() => { if (B && B.view === d.id && !(document.activeElement && sheet.contains(document.activeElement) && document.activeElement.tagName === 'INPUT')) { readEditor(d); drawEditor(d, false); } }, 0); } };
  const redraw = () => { readEditor(d); drawEditor(d, false); };
  sh.oninput = e => { if (e.target.id === 'tn') d.touched.name = 1; if (e.target.id === 'ts') { d.touched.sub = 1; const g2 = guessFromText(e.target.value); if (g2.category && !d.touched.category) { t.category = g2.category; t.warmth = g2.warmth; t.formality = g2.formality; t.styles = g2.styles; } } };
  sh.onclick = async e => {
    if (!B) return;
    if (e.target.closest('[data-done]')) { readEditor(d); return B.drafts.length === 1 ? saveBatch() : (B.view = 'grid', drawBatch(true)); }
    if (e.target.closest('[data-more]')) { d.more = !d.more; return redraw(); }
    if (e.target.closest('[data-rot1]')) { readEditor(d); return rotateDraft(d, 90); }
    const bg = e.target.closest('[data-bg]'); if (bg) { d.useCut = bg.dataset.v === 'cut'; resetUrl(d); return redraw(); }
    const own = e.target.closest('[data-own]'); if (own) { t.owned = own.dataset.v === '1'; d.touched.owned = 1; return redraw(); }
    const sb = e.target.closest('[data-k]');
    if (sb && sb.closest('.seg')) {
      const k = sb.dataset.k; d.touched[k] = 1; t[k] = sb.dataset.v;
      if (k === 'category' && !d.touched.sub) { const g2 = guessFromText(DEFAULT_SUB[t.category]); t.sub = DEFAULT_SUB[t.category]; if (g2.warmth) { t.warmth = g2.warmth; t.formality = g2.formality; t.styles = g2.styles; } }
      renameDraft(d); return redraw();
    }
    const cb = e.target.closest('.chips[data-key] [data-v]');
    if (cb) {
      const g2 = cb.parentNode, key = g2.dataset.key, v = cb.dataset.v; d.touched[key] = 1;
      if (g2.dataset.multi) { const arr = t[key], i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); else if (arr.length < 3) arr.push(v); else { arr.pop(); arr.push(v); } }
      else t[key] = v;
      if (key === 'colours' || key === 'pattern') renameDraft(d);
      return redraw();
    }
    const db = e.target.closest('.dotsel [data-n]');
    if (db) { const key = db.parentNode.dataset.key; d.touched[key] = 1; t[key] = +db.dataset.n; return redraw(); }
  };
}
let saving = false;
async function saveBatch() {
  if (!B || saving) return;
  saving = true;
  try { await saveBatchNow(); } finally { saving = false; }
}
async function saveBatchNow() {
  const btn = $('.sheet [data-save], .sheet [data-done]'); if (btn) btn.disabled = true;
  if (B.view !== 'grid') { const cur = B.drafts.filter(x => x.id === B.view)[0]; if (cur) readEditor(cur); }
  const ready = batchDone(), meta = B.meta, added = [];
  for (const d of ready) {
    const t = d.t;
    t.name = (t.name || '').trim().slice(0, 60) || (cap(t.colours[0] || '') + ' ' + (t.sub || ONE[t.category].toLowerCase())).trim();
    t.sub = (t.sub || '').trim().slice(0, 40) || (guessFromText(t.name).sub || t.category);
    if (!t.colours.length) t.colours = ['black'];
    if (t.category === 'extra') t.fit = 'regular';
    const it = normItem(Object.assign({}, t, { id: uid(), fav: false, added: iso(new Date()) }));
    if (meta.url && /^https?:\/\//.test(meta.url)) { it.url = String(meta.url).slice(0, 500); it.shop = String(meta.shop || '').slice(0, 60); it.currency = meta.currency || null; }
    const blob = d.useCut && d.cut ? d.cut : d.orig;
    it.img = (await saveBlob(it.id, blob)) ? 'idb' : await blobToDataUrl(blob);
    S.items.push(it); added.push(it);
  }
  const failed = B.drafts.filter(x => x.status === 'err').length, left = B.drafts.length - ready.length - failed;
  persist(); refresh(); closeSheet(); haptic();
  if (added.length === 1 && !added[0].owned) { S.closetView = 'wish'; render(); toast('On your wishlist', 'Here’s how it works with your closet'); setTimeout(() => itemSheet(added[0].id), 380); return; }
  S.closetView = added.some(i => i.owned) ? 'owned' : 'wish'; S.closetCat = 'all';
  go('closet');
  toast(added.length === 1 ? 'Added ' + added[0].name : 'Added ' + added.length + ' pieces', left ? left + ' still processing ' + (left === 1 ? 'was' : 'were') + ' left out. Add ' + (left === 1 ? 'it' : 'them') + ' again.' : failed ? failed + ' couldn’t be read and ' + (failed === 1 ? 'was' : 'were') + ' skipped' : 'Tap any piece to fine-tune it');
}
async function editExisting(ex) {
  const t = clone(ex);
  let orig = null;
  try { orig = await (await fetch(src(ex))).blob(); } catch (e) {}
  B = { meta: { fromShop: !ex.owned }, view: 'x', existing: ex, drafts: [] };
  const png = !!orig && orig.type === 'image/png';
  const d = { id: 'x', status: 'done', t, touched: {}, cut: png ? orig : null, orig, useCut: png, url: orig ? null : src(ex), method: 'none', ai: '' };
  B.drafts.push(d);
  drawEditor(d, true);
  const saveBtn = $('.sheet [data-done]'); if (saveBtn) saveBtn.innerHTML = ic('check', 18) + 'Save changes';
  function once(e) {
    if (!e.target.closest('[data-done]') || !B || B.existing !== ex) return;
    e.stopImmediatePropagation(); sheet.removeEventListener('click', once, true);
    readEditor(d); normItem(t); t.name = t.name.trim() || ex.name;
    const keep = { id: ex.id, img: ex.img, added: ex.added, fav: ex.fav, url: ex.url, shop: ex.shop, currency: ex.currency };
    Object.assign(ex, t, keep);
    const done = async () => {
      const nb = (d.useCut && d.cut) || d.orig;
      if (d.touched.rot && nb) ex.img = (await saveBlob(ex.id, nb)) ? 'idb' : await blobToDataUrl(nb);
      persist(); refresh(); closeSheet(); render(); toast('Saved', ex.name);
    };
    done();
  }
  sheet.addEventListener('click', once, true);
  onSheetClose = () => { sheet.removeEventListener('click', once, true); if (d.url && orig) URL.revokeObjectURL(d.url); B = null; };
}

/* ---------- toast ---------- */
let toastT = null;
function toast(ttl, sub, undo) {
  const el = $('#toast');
  el.innerHTML = '<i>' + ic('check', 18) + '</i><div><b>' + esc(ttl) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (undo ? '<button type="button">Undo</button>' : '');
  if (undo) $('button', el).onclick = () => { undo(); el.classList.remove('on'); render(); };
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3000);
}

/* ---------- clicks ---------- */
function go(tab) { S.tab = tab; render(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || !$('#app').contains(b) || b.closest('.sheet')) return;
  const a = b.dataset.act, tc = S.today[S.todayIdx];
  if (a === 'tab') { if (b.dataset.tab === S.tab) { const s = $('#scr'); if (s) s.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; } haptic(); return go(b.dataset.tab); }
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
  if (a === 'vibe') { if (S.vibe === b.dataset.v) return; S.vibe = b.dataset.v; S.todayIdx = 0; refresh(); return render(); }
  if (a === 'today-skip') return flyCard(-1);
  if (a === 'deck-again') { S.todayIdx = 0; S.lastCard = null; return render(); }
  if (a === 'today-save') { burst(b); return flyCard(1); }
  if (a === 'today-wear' && tc) { logWorn(tc.items); return render(); }
  if (a === 'wear-today') return wearSheet();
  if (a === 'slot') { const k = b.dataset.k; return pickSheet('Choose ' + ONE[k].toLowerCase(), k, S.build[k], id => { S.build[k] = id; S.rating = null; render(); }, true); }
  if (a === 'strip') { const it = E.byId(b.dataset.id); S.build[it.category] = S.build[it.category] === it.id ? null : it.id; S.rating = null; haptic(); return render(); }
  if (a === 'bwish') { S.buildWish = b.dataset.v === '1'; return render(); }
  if (a === 'build-clear') { S.build = EMPTY_BUILD(); S.rating = null; return render(); }
  if (a === 'complete') return completeIt();
  if (a === 'rate') return rateIt();
  if (a === 'build-save') return saveBuild();
});
document.addEventListener('input', e => {
  if (e.target.id !== 'cq') return;
  S.closetQ = e.target.value.slice(0, 60); $('#cgrid').innerHTML = closetGrid();
});

/* ---------- today card: swipe ---------- */
function flyCard(dir) {
  const card = $('#topcard'), c = S.today[S.todayIdx]; if (!card || !c) return;
  card.style.transition = 'transform .45s cubic-bezier(.3,.6,.4,1), opacity .4s';
  card.style.transform = 'translateX(' + dir * 540 + 'px) rotate(' + dir * 18 + 'deg)'; card.style.opacity = '0';
  if (dir > 0) saveOutfit(c); else skipFeedback(c);
  setTimeout(() => { S.todayIdx = Math.min(S.todayIdx + 1, S.today.length); render(); }, 300);
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
    card.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 22 + 'deg)';
    keep.style.opacity = Math.max(0, Math.min(1, dx / 90)); skip.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  }
  function up(ev, scrolling) {
    if (done) return; done = true;
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
    if (!scrolling && Math.abs(dx) > 100) return flyCard(dx > 0 ? 1 : -1);
    card.style.transition = 'transform .5s var(--spring)'; card.style.transform = ''; keep.style.opacity = 0; skip.style.opacity = 0;
    if (!moved && !scrolling && ev && ev.type === 'pointerup') { const pc = e.target.closest('.pc'); if (pc) swapPiece(pc.dataset.k); }
  }
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
});
function swapPiece(k) {
  const c = S.today[S.todayIdx]; if (!c) return;
  pickSheet('Swap ' + ONE[k].toLowerCase(), k, c.items[k], id => {
    if (id) c.items[k] = id; else delete c.items[k];
    E.decorate(c); S.lastCard = null; render();
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
  render(); animateRing(); toast(n ? 'Filled ' + n + ' slot' + (n > 1 ? 's' : '') : 'Already complete', c.colour.label + (c.shape.label ? ' · ' + c.shape.label : ''));
}
function rateIt() {
  const b = S.build; if (!(b.top && b.bottom && b.shoes)) return toast('Add a top, bottoms and shoes', 'Then Fitted can rate the fit.');
  S.rating = E.rate(b, wxFor(0), 'Casual'); render(); animateRing();
  setTimeout(() => { const r = $('.rating'), sc = r && r.closest('.screen'); if (sc) sc.scrollTo({ top: sc.scrollTop + r.getBoundingClientRect().top - sc.getBoundingClientRect().top - (sc.clientHeight - r.offsetHeight) / 2, behavior: reduce ? 'auto' : 'smooth' }); }, 60);
}
function animateRing() { const r = $('.ring'); if (!r) return; requestAnimationFrame(() => requestAnimationFrame(() => r.style.setProperty('--v', r.dataset.v))); }
function saveBuild() {
  const items = {}; CATS.forEach(k => { if (S.build[k]) items[k] = S.build[k]; });
  const c = E.decorate({ items, vibe: 'Casual', w: wxFor(0), by: 'user' });
  openSheet('Name this fit', plate(items, 'drop') + '<div class="field"><input type="text" id="fn" value="' + esc(c.name) + '" autocomplete="off" maxlength="40"></div><button class="btn accent block" id="fnok">' + ic('heart', 18) + 'Save fit</button>', sh => {
    $('#fnok', sh).onclick = ev => { burst(ev.currentTarget); saveOutfit(c, $('#fn', sh).value.trim().slice(0, 40) || c.name); closeSheet(); render(); };
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
  if (chatOpen) return; chatOpen = true; haptic();
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
    if (!d.on) { if (dy < -10 && Math.abs(dy) > Math.abs(dx) * 1.2) { d.on = true; bar.classList.add('pull'); chat.classList.add('dragging'); } else return; }
    const now = performance.now(); d.v = (e.clientY - d.ly) / Math.max(1, now - d.lt); d.lt = now; d.ly = e.clientY; d.dy = dy;
    chatTo(Math.max(0, H() + dy), false);
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const x = d; d = null; bar.classList.remove('pull'); if (!x.on) return;
    chat.classList.remove('dragging'); swallow = true; setTimeout(() => { swallow = false; }, 120);
    if (-x.dy > 90 || x.v < -0.45) return openChat();
    chatTo(H(), true);
    setTimeout(() => { if (!chatOpen) { chat.style.transform = ''; dim.style.opacity = ''; } }, 500);
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

const CH = { hist: [], current: null, busy: false, cards: {}, plan: null, last: null, shown: {}, voice: false };
function chatReset() { cbody.innerHTML = ''; CH.current = null; CH.hist = []; CH.cards = {}; CH.plan = null; CH.last = null; CH.shown = {}; CH.names = {}; if (chatOpen) hello(); }
const nextSatOffset = () => (6 - new Date().getDay() + 7) % 7;
function hello() {
  const least = owned().slice().sort((a, b) => E.lastWornDays(b.id) - E.lastWornDays(a.id))[0], wl = wishes()[0], sat = nextSatOffset();
  const sugs = [['sparkle', 'What should I wear today?', wxFor(0).max + '° and ' + cond(wxFor(0)).toLowerCase() + ' · two quick taps, then 3 looks', 'What should I wear today?'],
    ['sun', 'Tomorrow, I have work', wxFor(1).max + '° and ' + cond(wxFor(1)).toLowerCase(), 'What should I wear tomorrow? I have work']];
  if (least) sugs.push(['palette', 'What goes with my ' + nm(least) + '?', 'Colours and pieces that match', 'What goes with my ' + least.name + '?']);
  if (wl) sugs.push(['bag', 'Should I buy the ' + nm(wl) + '?', 'Checked against your closet', 'Should I buy the ' + wl.name + '?']);
  else sugs.push(['grid', sat === 0 ? 'Braai today' : 'Braai on Saturday', 'Relaxed, weather-ready', 'What should I wear to a braai on Saturday?']);

  cbody.innerHTML = '<div class="hello"><div class="orb"></div><h5>What are we<br><em>wearing?</em></h5><p>I know your ' + owned().length + ' pieces' + (wishes().length ? ', your wishlist' : '') + ' and this week’s weather. Type, tap or hit the mic and just talk.</p>' +
    sugs.map((s, i) => '<button type="button" class="sug" style="--i:' + i + '" data-q="' + esc(s[3]) + '"><span class="th">' + ic(s[0], 20) + '</span><span><b>' + esc(s[1]) + '</b><small>' + esc(s[2]) + '</small></span><span class="chev">' + ic('chev', 18) + '</span></button>').join('') + '</div>';
}
cbody.addEventListener('click', e => {
  const s = e.target.closest('[data-q]'); if (s) return ask(s.dataset.q);
  const sv = e.target.closest('[data-savefit]'); if (sv && CH.cards[sv.dataset.savefit]) { burst(sv); saveOutfit(CH.cards[sv.dataset.savefit]); sv.classList.add('saved'); sv.innerHTML = ic('check', 20); render(); }
  const ob = e.target.closest('[data-openbuild]'); if (ob && CH.cards[ob.dataset.openbuild]) { S.build = Object.assign(EMPTY_BUILD(), clone(CH.cards[ob.dataset.openbuild].items)); S.buildWish = true; S.rating = null; closeChat(); go('build'); }
});

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function parseDay(q) {
  if (/tomorrow/.test(q)) return 1;
  if (/weekend|saturday|sat\b/.test(q)) return nextSatOffset();
  for (let i = 0; i < 7; i++) if (q.indexOf(DAYS[i]) > -1) return (i - new Date().getDay() + 7) % 7;
  return 0;
}
const parseVibe = q => (/braai|bbq/.test(q) ? 'Braai' : /work|office|meeting|interview/.test(q) ? 'Work' : /date|dinner|night out|club|party/.test(q) ? 'Date night' : /gym|workout|run\b|training/.test(q) ? 'Gym' : /casual|chill|relax|errand|nothing special|hang ?out|mall|normal|day off/.test(q) ? 'Casual' : null);
const parseLegs = q => (/\b(shorts?|jorts|short pants)\b/.test(q) ? 'short' : /\b(long pants|longs|pants|jeans|trousers|chinos|joggers|trackies|cargos?|long)\b/.test(q) ? 'long' : /you pick|surprise|don.?t mind|whatever|either|any|up to you|you choose/.test(q) ? 'any' : null);
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
  if (CH.last && !parseSlot(q) && /\b(more|another|others?|regenerate|again|next|new ones|different ones|different)\b/.test(q)) return { intent: 'more' };
  if (/different plan|other plan|change (the )?plan/.test(q)) return { intent: 'replan' };
  if (/swap|change|different|another/.test(q)) return { intent: 'swap', slot: parseSlot(q) };
  if (/week/.test(q)) return { intent: 'week' };
  if (it && /colou?r/.test(q)) return { intent: 'colour', item: it };
  if (it && /build|style|fit with|outfit with|wear with my/.test(q)) return { intent: 'build', item: it };
  if (it && /go with|goes with|pair|match/.test(q)) return { intent: 'pair', item: it };
  if (/wear|outfit|fit\b|fit for|what should|dress|suggest|braai|work|date|gym|today|tomorrow|weekend|party|look/.test(q)) return { intent: 'suggest', day: parseDay(q), vibe: parseVibe(q), legs: parseLegs(q) };
  if (it) return { intent: 'pair', item: it };
  return { intent: 'other' };
}
const dayWord = off => (off === 0 ? 'Today' : off === 1 ? 'Tomorrow' : cap(DAYS[new Date(today0().getTime() + off * DAY).getDay()]));
function cardHtml(c) {
  const k = uid(); CH.cards[k] = c;
  const wish = c.wish && c.wish.length;
  return '<div class="fitc">' + (c.n ? '<span class="lookno">Look ' + c.n + '</span>' : '') + plate(c.items, 'drop') + '<div class="cap"><div><b>' + esc(c.name) + '</b><small>' + esc(c.reason || itemNames(c.items)) + '</small></div>' +
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
    return { t: cap(main) + ' goes with ' + pw.safe.slice(0, 3).join(', ') + ' as a safe base, and ' + pw.accent.slice(0, 2).join(' or ') + ' if you want an accent. From your closet:', x: matches.length ? '<div class="irow">' + matches.slice(0, 8).map((i, n) => '<div style="--i:' + n + '"><img src="' + esc(src(i)) + '" alt="">' + esc(i.name) + '</div>').join('') + '</div>' : '', q: ['Build a fit with my ' + it.name] };
  }
  if (r.intent === 'pair' || r.intent === 'build') {
    const it = r.item, lock = {}; lock[it.category] = it.id;
    cs = E.candidates({ weather: wxFor(0), vibe: 'Casual', lock });
    if (!cs.length) return { t: 'I need more pieces to pair with your ' + nm(it) + '. Add bottoms and shoes first.' };
    if (r.intent === 'build') { c = cs[0]; CH.current = c; return { t: 'Built around your ' + nm(it) + '. ' + c.reason, x: cardHtml(c), q: quickFor(c) }; }
    const seen = {}, row = [];
    cs.forEach(x => CATS.forEach(k => { const id = x.items[k]; if (id && id !== it.id && !seen[id]) { seen[id] = 1; row.push(E.byId(id)); } }));
    const tone = it.pattern !== 'solid' ? 'is the loud piece, so keep the rest plain' : it.colours.some(cc => !NEUTRAL[cc]) ? 'brings the colour, so build on neutrals' : 'is easy to pair';
    return { t: 'Your ' + nm(it) + ' ' + tone + '. These all work with it:', x: '<div class="irow">' + row.slice(0, 8).map((i, n) => '<div style="--i:' + n + '"><img src="' + esc(src(i)) + '" alt="">' + esc(i.name) + '</div>').join('') + '</div>', q: ['Build a fit with my ' + it.name] };
  }
  if (r.intent === 'week') {
    const used = {}; let out = '';
    for (let d = 1; d <= 5; d++) {
      w = wxFor(Math.min(d, S.forecast.length - 1));
      cs = E.candidates({ weather: w, vibe: 'Casual' }); if (!cs.length) break;
      const pick = cs.filter(x => !used[x.items.top])[0] || cs[d % cs.length];
      used[pick.items.top] = 1; CH.current = pick;
      out += '<div>' + plate(pick.items, 'sm drop') + '<b>' + dayWord(d) + ' · ' + w.max + '°</b></div>';
    }
    if (!out) return { t: 'Add a top, bottoms and shoes first, then I can plan your week.' };
    const tops = owned().filter(i => i.category === 'top').length;
    return { t: 'Here are the next five days' + (tops < 5 ? '. You have ' + tops + ' tops, so some repeat; add more and I’ll spread them out.' : ', no repeats.'), x: '<div class="week">' + out + '</div>', q: ['What should I wear today?', 'Start over'] };
  }
  return { t: 'I can suggest fits for any day or occasion, swap pieces, match colours, plan your week and tell you if a wishlist piece is worth buying.' + (S.ai.on ? '' : ' Open questions work once your PC’s AI is connected (see Settings).'), q: ['What should I wear today?', 'Plan my week'] };
}
/* ---------- the "what should I wear?" conversation: ask a little, then show three looks ---------- */
const LEGWORD = { short: 'shorts', long: 'long pants' };
const VIBE_ASK = ['Work', 'Casual', 'Date night', 'Braai', 'Gym'];
const dayPhrase = d => (d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'on ' + dayWord(d));
const vibeWord = v => (v === 'Date night' ? 'date night' : v === 'Braai' ? 'braai' : v.toLowerCase());
/** The next thing worth asking, or null once the plan is clear. Asks at most two quick questions. */
function nextAsk(p) {
  const w = wxFor(p.day);
  if (!p.vibe) return { key: 'vibe', t: 'What’s the plan ' + dayPhrase(p.day) + '? ' + (p.day ? cap(dayPhrase(p.day)) : 'Today') + ' is ' + w.max + '° and ' + cond(w).toLowerCase() + '.', q: VIBE_ASK };
  if (!p.legs) {
    const bottoms = owned().filter(i => i.category === 'bottom'), hasShort = bottoms.some(isShort), hasLong = bottoms.some(i => !isShort(i));
    if (!hasShort || !hasLong) p.legs = 'any';
    else if (w.max < 17) { p.legs = 'long'; p.why = 'Only ' + w.max + '°, so long pants. '; }
    else if (w.max >= 30) { p.legs = 'short'; p.why = w.max + '° is shorts weather. '; }
    else if (p.vibe === 'Work' || p.vibe === 'Date night') { p.legs = 'long'; p.why = ''; }
    else if (p.vibe === 'Gym') p.legs = 'any';
    else return { key: 'legs', t: 'Shorts or long pants? It’ll be ' + w.max + '°' + (w.min <= w.max - 7 ? ', cooling to ' + w.min + '° later' : '') + '.', q: ['Shorts', 'Long pants', 'You pick'] };
  }
  return null;
}
const lookOf = c => c.colour.label + (c.shape && c.shape.label ? ' · ' + c.shape.label : '');
function planKey(p) { return [p.day, p.vibe, p.legs].join('|'); }
function planCands(p) {
  const w = wxFor(p.day), shown = CH.shown[planKey(p)] = CH.shown[planKey(p)] || {}, legs = p.legs === 'any' ? undefined : p.legs;
  let cs = E.candidates({ weather: w, vibe: p.vibe, bottoms: legs, goodOnly: true, byLook: true, exclude: shown, limit: 12 }), note = '';
  if (!cs.length && legs && !Object.keys(shown).length && !owned().some(i => i.category === 'bottom' && (legs === 'short') === isShort(i))) {
    note = 'No ' + LEGWORD[legs] + ' in your closet yet, so these use what you have. ';
    p.legs = 'any'; const r2 = planCands(p); r2.note = note; return r2;
  }
  return { cs, w, shown, note };
}
function exhausted(p, shown) {
  const n = Object.keys(shown).length, need = E.shortOf(p.legs === 'any' ? undefined : p.legs), other = p.legs === 'short' ? 'long' : p.legs === 'long' ? 'short' : null;
  const q = []; if (other) q.push('Try ' + LEGWORD[other] + ' instead'); q.push('Different plan', 'Add clothes');
  return { t: (n ? 'That’s every ' + vibeWord(p.vibe) + ' look I’d stand behind ' + dayPhrase(p.day) + (p.legs !== 'any' ? ' with ' + LEGWORD[p.legs] : '') + ': ' + n + ' in total. ' : 'I can’t make a ' + vibeWord(p.vibe) + ' fit I’d stand behind from your closet yet. ') +
    'One more ' + SLOTWORD[need] + ' would give me new combinations.', q };
}
async function planStep(q) {
  const p = CH.plan, a = nextAsk(p);
  if (a) { p.waiting = a.key; await wait(reduce ? 60 : 350); return { t: a.t, q: a.q }; }
  CH.plan = null; CH.last = { day: p.day, vibe: p.vibe, legs: p.legs, q: p.q };
  const { cs, w, shown, note } = planCands(p);
  if (!cs.length) return exhausted(p, shown);
  let cards = null, reply = '', quick = null, aiNote = '';
  if (S.ai.on) {
    try {
      const ai = await askAI(p.q + (p.more ? ' (show me different looks)' : ''), { cands: cs.slice(0, 8), need: 3, plan: { day: dayWord(p.day), vibe: p.vibe, legs: p.legs === 'any' ? '' : LEGWORD[p.legs] }, day: p.day, vibe: p.vibe });
      if (ai.cards.length) { cards = ai.cards; reply = ai.t; quick = ai.q; }
    } catch (e) { aiNote = aiFail(e); }
  } else await wait(reduce ? 60 : 450);
  if (!cards) {
    cards = cs.slice(0, 3);
    const n = cards.length;
    reply = (p.why || '') + cap(dayPhrase(p.day)) + ' is ' + w.max + '° and ' + cond(w).toLowerCase() + (w.rain >= 50 ? ' with a ' + w.rain + '% chance of rain' : '') + '. ' +
      (n === 1 ? 'Here’s a ' : 'Here are ' + n + ' ') + vibeWord(p.vibe) + ' look' + (n === 1 ? '' : 's') + (p.legs && p.legs !== 'any' ? ' with ' + LEGWORD[p.legs] : '') + '.';
  }
  cards.forEach((c, i) => { shown[E.lookKey(c.items)] = 1; c.n = cards.length > 1 ? i + 1 : 0; if (!S.ai.on || !c.fromAI) c.reason = c.reason.replace(/\s*Good for [^.]*\.$/, '') || c.reason; uniqueName(c); });
  CH.current = cards[0];
  const left = E.candidates({ weather: w, vibe: p.vibe, bottoms: p.legs === 'any' ? undefined : p.legs, goodOnly: true, byLook: true, exclude: shown, limit: 3 }).length;
  if (!left) reply += ' That’s all ' + Object.keys(shown).length + ' good looks I have for this.';
  const other = p.legs === 'short' ? 'long' : p.legs === 'long' ? 'short' : null;
  if (!quick || !quick.length) quick = left ? ['Show me ' + Math.min(3, left) + ' more', 'Swap the shoes', 'Different plan'] : [other ? 'Try ' + LEGWORD[other] + ' instead' : 'Different plan', 'Add clothes'];
  else if (!left) quick = quick.filter(x => !/more|another|other/i.test(x)).concat(['Different plan']).slice(0, 3);
  return { t: note + reply, x: cards.map(cardHtml).join(''), q: quick, note: aiNote };
}
/** Names stay unique within the chat, so three looks never read as the same one. */
function uniqueName(c) {
  const used = CH.names || (CH.names = {});
  if (used[c.name]) {
    const p = E.resolve(c.items), a = p.top && p.top.colours[0], b = p.bottom && (p.bottom.colours[0] === 'denim' ? 'denim' : p.bottom.colours[0]);
    const alt = cap(a || 'easy') + ' on ' + (b || 'neutral');
    c.name = used[alt] ? alt + ' · ' + (p.shoes ? nm(p.shoes) : 'fresh') : alt;
  }
  used[c.name] = 1;
}
const aiFail = e => (e.status === 401 ? 'Add your access code in Settings to use the AI stylist.' : S.ai.provider === 'local' ? 'Your PC’s AI didn’t answer (' + (e.message || 'no reply') + '), so these come from my style rules.' : '');
/** Candidates that help the AI answer non-plan questions (pairing, buying, open questions). */
function helperCands(r) {
  if ((r.intent === 'pair' || r.intent === 'build') && r.item) { const lock = {}; lock[r.item.category] = r.item.id; return { cands: E.candidates({ weather: wxFor(0), vibe: 'Casual', lock, goodOnly: true, limit: 6 }), need: r.intent === 'build' ? 1 : 2 }; }
  if (r.intent === 'wish') { const it = r.item || wishes()[0]; if (it) { const lock = {}; lock[it.category] = it.id; return { cands: E.candidates({ weather: wxFor(0), vibe: 'Casual', lock, withWish: true, goodOnly: true, limit: 6 }), need: 2 }; } }
  if (r.intent === 'colour') return { cands: [], need: 0 };
  return { cands: E.candidates({ weather: wxFor(0), vibe: 'Casual', goodOnly: true, limit: 6 }), need: 1 };
}
async function askAI(q, o) {
  o = o || {};
  const closet = S.items.map(i => ({ id: i.id, name: i.name, category: i.category, kind: i.sub, colours: i.colours, pattern: i.pattern, fit: i.fit, warmth: i.warmth, dressiness: i.formality, styles: i.styles, lastWornDays: E.lastWornDays(i.id) === Infinity ? null : E.lastWornDays(i.id), owned: i.owned, price: i.price || null }));
  const cands = o.cands || [];
  const r = await fetch('/api/stylist', { method: 'POST', headers: aiHeaders(), body: JSON.stringify({
    messages: CH.hist.concat([{ role: 'user', text: q }]).slice(-12), closet, profile: S.profile, plan: o.plan || null,
    candidates: cands.map(c => ({ items: c.items, look: lookOf(c) })), need: o.need || 0,
    today: new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
    weather: S.forecast.map((w, i) => ({ day: dayWord(i), max: w.max, min: w.min, conditions: cond(w), rainChance: w.rain }))
  }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'The stylist is unavailable'); e.status = r.status; throw e; }
  const day = o.day != null ? o.day : parseDay(q.toLowerCase()), vibe = o.vibe || parseVibe(q.toLowerCase()) || 'Casual';
  const cards = (j.outfits || []).filter(x => x && x.items && CATS.every(k => !x.items[k] || E.byId(x.items[k]))).map(x => {
    const c = E.decorate({ items: x.items, w: wxFor(day), vibe }); c.fromAI = true; if (x.name) c.name = String(x.name).slice(0, 40); if (x.why) c.reason = String(x.why).slice(0, 240); return c;
  });
  return { t: String(j.reply || 'Here you go.').slice(0, 900), cards, x: cards.map(cardHtml).join(''), q: j.quick && j.quick.length ? j.quick.slice(0, 3).map(x => String(x).slice(0, 60)) : null };
}
/** Work out the answer: plan questions first (instant), then the AI or the style rules. */
async function think(q) {
  const lq = q.toLowerCase();
  if (CH.plan && CH.plan.waiting) {
    const p = CH.plan, k = p.waiting, v = k === 'vibe' ? parseVibe(lq) : parseLegs(lq);
    if (v) { p[k] = v; p.waiting = null; if (!p.legs) p.legs = parseLegs(lq); if (!p.vibe) p.vibe = parseVibe(lq); return planStep(q); }
    CH.plan = null; // not an answer to our question, so treat it as a new one
  }
  const r = route(q);
  if (r.intent === 'suggest') { CH.plan = { day: r.day, vibe: r.vibe, legs: r.legs, q }; return planStep(q); }
  if (r.intent === 'more' && CH.last) { CH.plan = Object.assign({}, CH.last, { more: true }); return planStep(q); }
  if (r.intent === 'replan') { CH.plan = { day: CH.last ? CH.last.day : 0, q: CH.last ? CH.last.q : q }; return planStep(q); }
  if (/^try (shorts|long pants) instead/.test(lq) && CH.last) { CH.plan = Object.assign({}, CH.last, { legs: /shorts/.test(lq) ? 'short' : 'long', why: '' }); return planStep(q); }
  if (/^add (clothes|a piece|pieces)/.test(lq)) { setTimeout(() => { closeChat(); addSheet(); }, 400); return { t: 'Opening your closet. Add a few pieces and ask me again.' }; }
  if (S.ai.on && ['save', 'swap', 'reset'].indexOf(r.intent) < 0) {
    try { const h = helperCands(r); const a = await askAI(q, { cands: h.cands, need: h.need }); if (a.cards[0]) CH.current = a.cards[0]; return a; }
    catch (e) { const res = respond(q); res.note = aiFail(e); if (e.status >= 500) checkAI(); return res; }
  }
  await wait(reduce ? 60 : 450);
  return respond(q);
}
const scrollEnd = () => cbody.scrollTo({ top: cbody.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
async function ask(q, opt) {
  opt = opt || {};
  q = String(q || '').trim().slice(0, 500);
  if (CH.busy || !q) return;
  if (route(q).intent === 'reset') return chatReset();
  CH.busy = true;
  const hl = $('.hello', cbody); if (hl) hl.remove();
  $$('.qrs', cbody).forEach(n => n.remove());
  const me = document.createElement('div'); me.className = 'msg me' + (opt.voice ? ' said' : ''); me.innerHTML = '<div></div>'; me.firstChild.textContent = q; cbody.appendChild(me);
  const ai = document.createElement('div'); ai.className = 'msg ai';
  ai.innerHTML = '<span class="mini"></span><div class="txt"><span class="dots"><i></i><i></i><i></i></span></div>';
  cbody.appendChild(ai); scrollEnd();
  let r;
  try { r = await think(q); } catch (e) { r = { t: 'Something went wrong on my side. Try that again?' }; }
  const txt = $('.txt', ai); txt.textContent = '';
  if (r.note) { const n = document.createElement('span'); n.className = 'note'; n.textContent = r.note; txt.appendChild(n); }
  const body = document.createElement('span'); txt.appendChild(body);
  if (opt.voice || CH.voice) speak(r.t);
  const words = r.t.split(' ');
  for (let i = 0; i < words.length; i++) { body.textContent += (i ? ' ' : '') + words[i]; if (i % 8 === 0) scrollEnd(); if (!reduce) await wait(22); }
  if (r.x) { const d = document.createElement('div'); d.innerHTML = r.x; while (d.firstChild) txt.appendChild(d.firstChild); }
  if (r.q) { const qs = document.createElement('div'); qs.className = 'qrs'; r.q.forEach((l, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.style.setProperty('--i', i); b.textContent = l; b.onclick = () => ask(l); qs.appendChild(b); }); cbody.appendChild(qs); }
  CH.hist.push({ role: 'user', text: q }, { role: 'assistant', text: r.t });
  CH.busy = false; scrollEnd();
}
/* ---------- voice: talk to the stylist, and it talks back when you do ---------- */
function speak(t) {
  try {
    if (!window.speechSynthesis || !t) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t.replace(/°/g, ' degrees'));
    const vs = speechSynthesis.getVoices(), v = vs.filter(x => /en-ZA/i.test(x.lang))[0] || vs.filter(x => /^en-GB/i.test(x.lang))[0] || vs.filter(x => /^en/i.test(x.lang))[0];
    if (v) u.voice = v; u.rate = 1.03;
    speechSynthesis.speak(u);
  } catch (e) {}
}
$('#comp').addEventListener('submit', e => { e.preventDefault(); const v = $('#q').value.trim(); if (!v) return; $('#q').value = ''; ask(v); });
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fix = () => { const off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); $('#comp').style.transform = off > 60 ? 'translateY(' + (-off + 8) + 'px)' : ''; };
  vv.addEventListener('resize', fix); vv.addEventListener('scroll', fix);
}
/* Tap the mic and talk. Safari's speech recognition is used when it works; inside the Home Screen
   app iOS sometimes blocks it, so we fall back to the keyboard's own dictation mic. */
function keyboardDictation() {
  const q = $('#q'); q.focus();
  toast('Tap the mic on your keyboard', 'iPhone dictation works everywhere. I’ll read my answer out loud.');
  CH.voice = true;
}
$('#mic').addEventListener('click', () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return keyboardDictation();
  try { speechSynthesis && speechSynthesis.cancel(); } catch (e) {}
  const v = document.createElement('div'); v.className = 'voice';
  let bars = ''; for (let i = 0; i < 11; i++) bars += '<i style="animation-delay:' + (i * 0.07).toFixed(2) + 's"></i>';
  v.innerHTML = '<div class="wave">' + bars + '</div><b>Listening…</b><small>Try “What should I wear tomorrow? I have work.”</small><div class="acts2"><button class="btn ghost" type="button" data-v="cancel">Cancel</button><button class="btn accent" type="button" data-v="done">Done</button></div>';
  chat.appendChild(v);
  let rec, fin = '', heard = false; const sm = $('small', v);
  try { rec = new SR(); } catch (e) { v.remove(); return keyboardDictation(); }
  rec.lang = 'en-ZA'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  rec.onresult = ev => { let t = ''; for (let j = 0; j < ev.results.length; j++) t += ev.results[j][0].transcript; fin = t; heard = true; sm.textContent = '“' + t + '”'; };
  rec.onerror = ev => { v.remove(); if (ev && /not-allowed|service-not-allowed|audio-capture/.test(ev.error)) return keyboardDictation(); if (ev && ev.error === 'no-speech') return toast('I didn’t catch that', 'Tap the mic and try again.'); keyboardDictation(); };
  rec.onend = () => { if (!v.parentNode) return; v.remove(); if (fin.trim()) ask(fin.trim(), { voice: true }); else if (!heard) toast('I didn’t catch that', 'Tap the mic and try again.'); };
  v.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; if (b.dataset.v === 'cancel') { fin = ''; try { rec.abort(); } catch (x) {} v.remove(); } else { try { rec.stop(); } catch (x) {} } };
  try { rec.start(); haptic(); } catch (e) { v.remove(); keyboardDictation(); }
});
$('#q').addEventListener('keydown', e => { if (e.key !== 'Enter') CH.voice = CH.voice && e.key === 'Unidentified'; });

/* ---------- onboarding ---------- */
function onboarding() {
  if (S.seen) return;
  let step = 0; const pr = S.profile;
  const host = $('#onbHost');
  const sample = (S.outfits[0] && S.outfits[0].items) || (S.today[0] && S.today[0].items) || {};
  const how = (icon, t, s, i) => '<div class="how" style="--i:' + i + '"><span class="dot">' + icon + '</span><span><b>' + t + '</b><small>' + s + '</small></span></div>';
  const kids = el => Array.prototype.forEach.call(el.children, (c, i) => c.style.setProperty('--i', i));
  function draw() {
    let body;
    if (step === 0) body = '<div class="brand">' + LOGO + 'Fitted</div><div class="onbart">' + plate(sample, 'drop') + '<span class="sticker">styled</span></div><h1>Your closet,<br><em>styled daily.</em></h1><p>Outfits built from what you own, for the weather, your colours and your fit.</p>';
    else if (step === 1) body = '<span class="kick">Step 2 of 3</span><h1 style="margin-top:10px">How do you<br>like your <em>fit?</em></h1><p>Fitted balances every outfit around it. Change it any time in Settings.</p>' +
      '<div class="fitpick">' + FITS.map(f => '<button class="' + (pr.fit === f ? 'on' : '') + '" data-f="' + f + '">' + tee(f) + cap(f) + '</button>').join('') + '</div>' +
      '<p class="lbl">Colours you love <small>optional</small></p><div class="chips">' + Object.keys(COLOURS).map(c => '<button class="pill' + (pr.love.indexOf(c) > -1 ? ' on' : '') + '" data-c="' + c + '"><i style="background:' + COLOURS[c] + '"></i>' + cap(c) + '</button>').join('') + '</div>';
    else body = '<span class="kick">Step 3 of 3</span><h1 style="margin-top:10px">Three things<br>to <em>know</em></h1><div class="hows">' +
      how('<span class="addmini">' + ic('plus', 18) + '</span>', 'Add clothes in one go', 'Pick lots of photos at once. Fitted cuts out each piece, straightens it and names it.', 0) +
      how(SWIPE, 'Swipe up on the bar', 'Your stylist lives in the bottom bar. Ask it anything about your closet.', 1) +
      how(ic('heart', 22), 'Swipe right to save', 'Swipe Today’s fit right to keep it, left for the next one. Tap a piece to swap it.', 2) + '</div>';
    host.innerHTML = '<div class="onb" id="onb"><div class="onbbody">' + body + '</div><div class="onbfoot"><div class="dots3">' + [0, 1, 2].map(i => '<i class="' + (i === step ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<button class="btn ' + (step < 2 ? 'ink' : 'accent') + ' block" data-o="next">' + (step < 2 ? 'Next' : 'Start styling') + '</button>' + (step === 1 ? '<button class="linkbtn" data-o="skip">Skip for now</button>' : '<span class="linkbtn"></span>') + '</div></div>';
    kids($('.onbbody', host));
  }
  host.onclick = e => {
    const f = e.target.closest('[data-f]'), c = e.target.closest('[data-c]'), o = e.target.closest('[data-o]');
    if (f) { pr.fit = pr.fit === f.dataset.f ? '' : f.dataset.f; persist(); $$('[data-f]', host).forEach(x => x.classList.toggle('on', x.dataset.f === pr.fit)); haptic(); return; }
    if (c) { const i = pr.love.indexOf(c.dataset.c); if (i > -1) pr.love.splice(i, 1); else if (pr.love.length < 5) pr.love.push(c.dataset.c); persist(); c.classList.toggle('on', pr.love.indexOf(c.dataset.c) > -1); return; }
    if (!o) return;
    if (step < 2) { step++; return draw(); }
    S.seen = true; store.set('seen3', true); refresh(); render(); warmUp();
    const el = $('#onb'); el.classList.add('bye'); setTimeout(() => { host.innerHTML = ''; host.onclick = null; }, 450);
  };
  draw();
}

/* ---------- boot ---------- */
async function boot() {
  $('#barhint').insertAdjacentHTML('afterbegin', SWIPE);
  const blobs = await imgs.all();
  Object.keys(blobs).forEach(id => { IMG[id] = URL.createObjectURL(blobs[id]); });
  refresh(); render(); onboarding(); loadWeather(); checkAI();
  if ('serviceWorker' in navigator) { const reg = () => navigator.serviceWorker.register('sw.js').catch(() => {}); if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg); }
}
boot();
