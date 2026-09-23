(function () {
'use strict';
/* =========================================================
   Fitted — demo build (rules engine, no LLM yet)
   ========================================================= */
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var cap = function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var DAY = 86400000;
var today0 = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
var iso = function (d) { var z = new Date(d); return z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); };
var daysAgo = function (n) { return iso(today0().getTime() - n * DAY); };
var LOWERS = { white:1, black:1, grey:1, denim:1, navy:1, beige:1, brown:1, red:1, orange:1, yellow:1, green:1, blue:1, pink:1, purple:1, silver:1, cream:1, light:1, dark:1, plain:1, striped:1 };
var nm = function (it) { var n = it.name, f = n.split(' ')[0].toLowerCase(); return LOWERS[f] ? n.charAt(0).toLowerCase() + n.slice(1) : n; };
var uid = function () { return Math.random().toString(36).slice(2, 9); };

/* ---------- icons ---------- */
var P = {
  hanger: '<path d="M10 6.2a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.6v1.2M12 10.7 3.6 16.3c-.9.6-.5 1.7.5 1.7h15.8c1 0 1.4-1.1.5-1.7L12 10.7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  sparkle: '<path d="M12 3.5l1.7 5.4 5.3 1.7-5.3 1.7L12 17.7l-1.7-5.4L5 10.6l5.3-1.7Z" fill="currentColor"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z" fill="currentColor"/>',
  create: '<rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  grid: '<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="2.2"/><rect x="13" y="4" width="7" height="7" rx="2.2"/><rect x="4" y="13" width="7" height="7" rx="2.2"/><rect x="13" y="13" width="7" height="7" rx="2.2"/></g>',
  camera: '<path d="M4 9a2.5 2.5 0 0 1 2.5-2.5h1.7L9.6 4.5h4.8l1.4 2h1.7A2.5 2.5 0 0 1 20 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
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
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z" fill="#FFC53D"/>',
  chev: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  down: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  photo: '<rect x="4" y="5" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5L19 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
};
var ic = function (n, s) { s = s || 22; return '<svg class="ico" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>'; };

/* ---------- data ---------- */
var CATS = ['top', 'layer', 'bottom', 'shoes', 'extra'];
var CATLABEL = { top: 'Tops', layer: 'Layers', bottom: 'Bottoms', shoes: 'Shoes', extra: 'Extras' };
var SLOTLABEL = { top: 'top', layer: 'layer', bottom: 'bottoms', shoes: 'shoes', extra: 'extra' };
var VIBES = ['Casual', 'Work', 'Date night', 'Braai', 'Gym'];
var STYLES = ['casual', 'sport', 'street', 'smart', 'formal', 'lounge'];
var PATTERNS = ['solid', 'striped', 'graphic', 'print', 'check'];
var COLOURS = { black: '#1b1b1f', white: '#f4f4f2', grey: '#9a97a0', denim: '#4C6FA8', navy: '#2B3A67', beige: '#D9C7B0', brown: '#6B4A33', red: '#D6252C', orange: '#F28C28', yellow: '#FFC53D', green: '#5E9C6A', blue: '#3D6BD6', pink: '#F29BB8', purple: '#7B4DD6', silver: '#C9CCD2', cream: '#EFE6D2' };
var NEUTRAL = { black: 1, white: 1, grey: 1, denim: 1, navy: 1, beige: 1, cream: 1, silver: 1, brown: 1 };

var SEED_ITEMS = [
  { id: 'm1', img: 'img/milan.webp', name: 'Milan jersey', category: 'top', sub: 'football jersey', colours: ['red', 'black'], pattern: 'striped', warmth: 1, formality: 1, styles: ['sport', 'street'], fav: true, added: daysAgo(120) },
  { id: 'g1', img: 'img/germany.webp', name: 'Germany jersey', category: 'top', sub: 'football jersey', colours: ['white', 'black', 'orange'], pattern: 'graphic', warmth: 1, formality: 1, styles: ['sport', 'street'], fav: false, added: daysAgo(90) },
  { id: 'j1', img: 'img/jorts.webp', name: 'Denim jorts', category: 'bottom', sub: 'denim shorts', colours: ['denim'], pattern: 'solid', warmth: 1, formality: 2, styles: ['casual', 'street'], fav: true, added: daysAgo(200) },
  { id: 's1', img: 'img/black.webp', name: 'Black runners', category: 'shoes', sub: 'sneakers', colours: ['black'], pattern: 'solid', warmth: 2, formality: 2, styles: ['street', 'sport'], fav: false, added: daysAgo(150) },
  { id: 's2', img: 'img/shox.webp', name: 'White Shox', category: 'shoes', sub: 'sneakers', colours: ['white', 'silver'], pattern: 'solid', warmth: 2, formality: 2, styles: ['street', 'casual'], fav: true, added: daysAgo(60) }
];
var SEED_OUTFITS = [
  { id: 'o1', name: 'Matchday red', items: { top: 'm1', bottom: 'j1', shoes: 's1' }, vibe: 'Casual', reason: 'Red and black kit with black runners keeps it all one story.', by: 'ai', saved: daysAgo(20) },
  { id: 'o2', name: 'Clean whites', items: { top: 'g1', bottom: 'j1', shoes: 's2' }, vibe: 'Braai', reason: 'White jersey and white Shox, easy in the sun.', by: 'ai', saved: daysAgo(40) }
];
var SEED_WEAR = [
  { date: daysAgo(3), items: { top: 'm1', bottom: 'j1', shoes: 's1' } },
  { date: daysAgo(10), items: { top: 'm1', bottom: 'j1', shoes: 's1' } },
  { date: daysAgo(36), items: { top: 'g1', bottom: 'j1', shoes: 's2' } }
];

var store = {
  get: function (k, d) { try { var v = localStorage.getItem('fitted:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('fitted:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
var S = {
  items: store.get('items', SEED_ITEMS),
  outfits: store.get('outfits', SEED_OUTFITS),
  wear: store.get('wear', SEED_WEAR),
  fb: store.get('fb', { like: {}, skip: {} }),
  seen: store.get('seen', false),
  hintOff: store.get('hintOff', false),
  tab: 'closet', vibe: 'Casual', forecast: null, wxLive: false,
  todayList: [], todayIdx: 0,
  suggestList: [], suggestIdx: 0,
  create: { top: null, layer: null, bottom: null, shoes: null, extra: null }, rating: null
};
function persist() {
  var ok = store.set('items', S.items) && store.set('outfits', S.outfits) && store.set('wear', S.wear) && store.set('fb', S.fb);
  if (!ok) toast('Storage is full', 'Remove a few photos to save more.');
}
var byId = function (id) { for (var i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i]; return null; };

/* ---------- weather ---------- */
var WMO = function (c) {
  if (c === 0) return ['Sunny', 'sun']; if (c <= 2) return ['Partly cloudy', 'partly']; if (c === 3) return ['Cloudy', 'cloud'];
  if (c === 45 || c === 48) return ['Foggy', 'cloud']; if (c >= 51 && c <= 67) return ['Rainy', 'rain']; if (c >= 71 && c <= 77) return ['Snow', 'cloud'];
  if (c >= 80 && c <= 82) return ['Showers', 'rain']; if (c >= 95) return ['Stormy', 'rain']; return ['Cloudy', 'cloud'];
};
function sampleForecast() {
  var out = [], base = today0();
  var pat = [[22, 12, 2, 10], [19, 10, 3, 20], [24, 14, 0, 0], [18, 9, 61, 70], [21, 11, 1, 10], [24, 16, 0, 5], [23, 14, 2, 10]];
  for (var i = 0; i < 7; i++) {
    var d = new Date(base.getTime() + i * DAY), p = pat[(d.getDay() + 7) % 7];
    out.push({ date: iso(d), max: p[0], min: p[1], code: p[2], rain: p[3] });
  }
  return out;
}
S.forecast = sampleForecast();
function loadWeather() {
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=-26.2041&longitude=28.0473&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=7';
  var ctl = window.AbortController ? new AbortController() : null;
  var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
  fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
    clearTimeout(t);
    if (!j.daily || !j.daily.time) return;
    S.forecast = j.daily.time.map(function (d, i) {
      return { date: d, max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]), code: j.daily.weather_code[i], rain: j.daily.precipitation_probability_max[i] || 0 };
    });
    S.wxLive = true; refreshToday(); render();
  }).catch(function () { clearTimeout(t); });
}
var wxFor = function (offset) { return S.forecast[Math.min(Math.max(offset, 0), S.forecast.length - 1)]; };
var cond = function (w) { return WMO(w.code)[0]; };

/* ---------- rules engine ---------- */
function lastWornDays(id) {
  var best = Infinity, now = today0().getTime();
  S.wear.forEach(function (w) { for (var k in w.items) if (w.items[k] === id) { var d = Math.round((now - new Date(w.date + 'T00:00').getTime()) / DAY); if (d >= 0 && d < best) best = d; } });
  return best;
}
var isLoud = function (it) { return it.pattern !== 'solid' || it.colours.some(function (c) { return !NEUTRAL[c]; }); };
var isShort = function (it) { return /short|jort|skirt/i.test(it.sub + ' ' + it.name); };
var band = function (w) { return w.max < 12 ? 'cold' : w.max < 18 ? 'cool' : w.max <= 26 ? 'mild' : 'hot'; };
function vibeOk(it, vibe) {
  if (vibe === 'Work') return it.formality >= 3 || it.category === 'shoes' && it.formality >= 2;
  if (vibe === 'Date night') return it.formality >= 2 || it.styles.indexOf('street') > -1;
  if (vibe === 'Gym') return it.styles.indexOf('sport') > -1 || it.category === 'bottom' && isShort(it);
  return true;
}
function comboKey(c) { return CATS.map(function (k) { return c[k] || '-'; }).join('|'); }
function scoreCombo(c, w, vibe, strict) {
  var s = 0, notes = [], t = byId(c.top), b = byId(c.bottom), sh = byId(c.shoes), l = c.layer ? byId(c.layer) : null, x = c.extra ? byId(c.extra) : null;
  var all = [t, b, sh, l, x].filter(Boolean), bd = band(w);
  if (bd === 'cold') { if (!(l && l.warmth >= 3) && t.warmth < 3) { if (strict) return null; s -= 6; notes.push('nolayer'); } if (isShort(b)) { if (strict) return null; s -= 6; notes.push('shorts'); } }
  if (bd === 'cool') { if (isShort(b)) { s -= 2; notes.push('shortscool'); } if (w.min < 12 && !l) s -= 2; if (l) s += 1; }
  if (bd === 'mild') { if (l && w.min >= 14) s -= 1; if (isShort(b)) s += 1; }
  if (bd === 'hot') { if (l) { if (strict) return null; s -= 5; } if (t.warmth > 2) s -= 3; if (isShort(b)) s += 2; }
  if (w.rain >= 50) { if (sh.colours.indexOf('white') > -1) { s -= 2; notes.push('wetwhite'); } if (l) s += 1; }
  var vOk = all.every(function (it) { return vibeOk(it, vibe); });
  if (!vOk) { if (strict) return null; s -= 3; notes.push('vibe'); }
  var loud = all.filter(isLoud).length;
  if (loud > 1) { if (strict) return null; s -= 4; }
  all.forEach(function (it) {
    var d = lastWornDays(it.id);
    if (d <= 2) s -= 3; else if (d >= 30) s += 2;
    if (it.fav) s += 1;
    s += (S.fb.like[it.id] || 0) * 0.5 - (S.fb.skip[it.id] || 0) * 0.6;
  });
  var key = comboKey(c);
  S.wear.forEach(function (wr) { var dd = (today0() - new Date(wr.date + 'T00:00')) / DAY; if (dd <= 14 && comboKey(wr.items) === key) s -= 2; });
  if (loud === 1 && sh && !isLoud(sh)) s += 1;
  return { score: s, notes: notes };
}
function candidates(opt) {
  opt = opt || {};
  var w = opt.weather || wxFor(0), vibe = opt.vibe || 'Casual', lock = opt.lock || {};
  var pools = {};
  CATS.forEach(function (k) {
    pools[k] = lock[k] !== undefined ? [lock[k]] : S.items.filter(function (i) { return i.category === k; }).map(function (i) { return i.id; });
    if ((k === 'layer' || k === 'extra') && lock[k] === undefined) pools[k] = [null].concat(pools[k]);
  });
  if (!pools.top.length || !pools.bottom.length || !pools.shoes.length) return [];
  function run(strict) {
    var res = [], n = 0;
    pools.top.forEach(function (t) { pools.bottom.forEach(function (b) { pools.shoes.forEach(function (sh) { pools.layer.forEach(function (l) { pools.extra.forEach(function (x) {
      if (n++ > 2000) return;
      var c = { top: t, bottom: b, shoes: sh, layer: l, extra: x };
      var r = scoreCombo(c, w, vibe, strict); if (r) res.push({ items: c, score: r.score, notes: r.notes, relaxed: !strict });
    }); }); }); }); });
    return res;
  }
  var res = run(true); if (!res.length) res = run(false);
  res.sort(function (a, b) { return b.score - a.score; });
  return res.slice(0, 12).map(function (r) { r.w = w; r.vibe = vibe; r.name = nameFor(r); r.reason = reasonFor(r); return r; });
}
function nameFor(c) {
  var key = comboKey(c.items);
  for (var i = 0; i < S.outfits.length; i++) if (comboKey(S.outfits[i].items) === key) return S.outfits[i].name;
  var t = byId(c.items.top), sh = byId(c.items.shoes), col = t.colours[0];
  if (c.vibe === 'Braai') return 'Braai ' + (col === 'white' ? 'whites' : col);
  if (t.styles.indexOf('sport') > -1 && col === 'red') return 'Matchday red';
  if (col === 'white' && sh.colours.indexOf('white') > -1) return 'Clean whites';
  var v = { Casual: 'easy', Work: 'desk day', 'Date night': 'night out', Gym: 'gym run' }[c.vibe] || 'easy';
  return cap(col) + ' ' + v;
}
function reasonFor(c) {
  var w = c.w, t = byId(c.items.top), b = byId(c.items.bottom), sh = byId(c.items.shoes), l = c.items.layer ? byId(c.items.layer) : null, bd = band(w);
  if (c.notes.indexOf('shorts') > -1 || c.notes.indexOf('shortscool') > -1) {
    var longs = S.items.some(function (i) { return i.category === 'bottom' && !isShort(i); });
    if (!longs) return 'No long pants in your closet yet, so the ' + nm(b) + ' it is.';
  }
  if (c.notes.indexOf('vibe') > -1) return 'Closest match in your closet for ' + c.vibe.toLowerCase() + '. Add a smarter piece for more options.';
  if (bd === 'cold' && l) return 'Only ' + w.max + '° today, so the ' + nm(l) + ' goes on top.';
  if (w.rain >= 50) return sh.colours.indexOf('white') > -1 ? w.rain + '% chance of rain. The ' + nm(sh) + ' are your only pick, so dodge the puddles.' : w.rain + '% chance of rain, so darker shoes: the ' + nm(sh) + '.';
  if (isLoud(t) && !isLoud(sh)) return 'The ' + nm(t) + ' carries the fit; the ' + nm(sh) + ' keep it clean.';
  if (isShort(b) && bd !== 'cool') return w.max + '° and ' + cond(w).toLowerCase() + ', so the ' + nm(b) + ' work all day.';
  return 'Good for ' + w.max + '° and ' + cond(w).toLowerCase() + '.';
}
function refreshToday() { S.todayList = candidates({ weather: wxFor(0), vibe: new Date().getDay() % 6 === 0 ? 'Casual' : 'Casual' }); S.todayIdx = 0; }

/* ---------- common renderers ---------- */
function layout(items) {
  var has = function (k) { return !!items[k]; }, L = {};
  if (has('layer')) { L.top = [2, 2, 50]; L.layer = [50, 2, 48]; L.bottom = [6, 50, 44]; L.shoes = [56, 56, 40]; L.extra = [64, 36, 26]; }
  else { L.top = [3, 2, 56]; L.bottom = [8, 49, 45]; L.shoes = [57, 44, 40]; L.extra = [62, 6, 32]; }
  return L;
}
function plate(items, cls) {
  var L = layout(items), h = '';
  ['layer', 'top', 'bottom', 'extra', 'shoes'].forEach(function (k) {
    var it = items[k] && byId(items[k]); if (!it) return;
    var p = L[k];
    h += '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" style="left:' + p[0] + '%;top:' + p[1] + '%;width:' + p[2] + '%">';
  });
  return '<div class="plate ' + (cls || '') + '">' + h + '</div>';
}
function itemNames(items) { return ['top', 'layer', 'bottom', 'shoes', 'extra'].filter(function (k) { return items[k]; }).map(function (k) { return byId(items[k]).name; }).join(', '); }
function itemCard(it) {
  var d = lastWornDays(it.id);
  var meta = cap(it.sub || it.category) + (d === Infinity ? ' · Never worn' : d >= 30 ? ' · ' + d + 'd unworn' : '');
  return '<button class="item" data-act="item" data-id="' + it.id + '"><div class="ph"><img src="' + esc(it.img) + '" alt=""></div>' +
    (it.fav ? '<span class="fav">' + ic('heart', 16) + '</span>' : '') + '<b>' + esc(it.name) + '</b><small>' + esc(meta) + '</small></button>';
}
function wxPill(w, label) {
  return '<span class="wx glass">' + ic(WMO(w.code)[1], 24) + '<b>' + w.max + '°</b><small>' + esc(cond(w)) + ' · ' + esc(label) + '</small></span>';
}
function fitCard(c, opts) {
  opts = opts || {};
  return '<div class="fit' + (opts.cls ? ' ' + opts.cls : '') + '"' + (opts.attr || '') + '><div class="pos">' + plate(c.items) +
    '<span class="vibe glass"><i></i>' + esc(c.vibe) + '</span>' + (opts.stamps ? '<span class="stamp keep">SAVE</span><span class="stamp skip">SKIP</span>' : '') + '</div>' +
    '<div class="body"><h3>' + esc(c.name) + '</h3><div class="why">' + ic('sparkle', 16) + '<span>' + esc(c.reason) + '</span></div></div>' +
    (opts.acts ? '<div class="acts"><button class="circ glass" data-act="' + opts.acts + '-skip" aria-label="Skip">' + ic('x') + '</button><button class="circ glass" data-act="' + opts.acts + '-shuffle" aria-label="Shuffle">' + ic('shuffle') + '</button><button class="circ love" data-act="' + opts.acts + '-save" aria-label="Save fit">' + ic('heart') + '</button></div>' : '') + '</div>';
}
function saveOutfit(c, name) {
  var key = comboKey(c.items);
  var ex = S.outfits.filter(function (o) { return comboKey(o.items) === key; })[0];
  if (ex) { toast('Already in your Fits', ex.name); return ex; }
  var o = { id: uid(), name: name || c.name, items: JSON.parse(JSON.stringify(c.items)), vibe: c.vibe || 'Casual', reason: c.reason || '', by: c.by || 'ai', saved: iso(new Date()) };
  S.outfits.unshift(o);
  CATS.forEach(function (k) { if (c.items[k]) S.fb.like[c.items[k]] = (S.fb.like[c.items[k]] || 0) + 1; });
  persist();
  toast('Fit saved', 'Added to your Fits as “' + o.name + '”', function () { S.outfits = S.outfits.filter(function (x) { return x.id !== o.id; }); persist(); render(); });
  return o;
}
function skipFeedback(c) { CATS.forEach(function (k) { if (c.items[k]) S.fb.skip[c.items[k]] = (S.fb.skip[c.items[k]] || 0) + 1; }); persist(); }
function logWorn(items) {
  var d = iso(new Date());
  S.wear = S.wear.filter(function (w) { return w.date !== d; });
  S.wear.push({ date: d, items: JSON.parse(JSON.stringify(items)) });
  persist(); toast('Logged for today', itemNames(items));
}

/* ---------- screens ---------- */
var screens = $('#screens');
function render() {
  var h = { closet: rCloset, suggest: rSuggest, create: rCreate, fits: rFits }[S.tab]();
  var prev = $('#scr'), top = prev && prev.dataset.tab === S.tab ? prev.scrollTop : 0;
  screens.innerHTML = '<div class="screen" id="scr" data-tab="' + S.tab + '">' + h + '</div>';
  $('#scr').scrollTop = top;
  rTabs();
}
function rCloset() {
  var w = wxFor(0), dow = new Date().getDay(), dayType = dow === 0 || dow === 6 ? 'weekend' : 'work day';
  var h = '<div class="hero"><h1>Style what<span>you own</span></h1><button class="circ glass" data-act="search" aria-label="Search your closet">' + ic('search') + '</button></div>';
  if (!S.hintOff && !isStandalone()) h += '<div class="hint glass">' + ic('share', 26) + '<div><b>Add Fitted to your Home Screen</b>In Safari tap Share, then “Add to Home Screen”.</div><button class="x" data-act="hintoff" aria-label="Dismiss">' + ic('x', 18) + '</button></div>';
  h += wxPill(w, dayType);
  if (!S.items.length) return h + '<div class="empty"><b>Your closet is empty</b><p class="muted">Snap your first item to get started.</p><button class="btn primary" data-act="capture">' + ic('camera') + 'Scan item</button></div>';
  var c = S.todayList[S.todayIdx];
  h += '<div class="sec"><h2>Today’s fit</h2><button data-act="today-shuffle">Shuffle</button></div>';
  h += c ? fitCard(c, { acts: 'today' }) : '<div class="fit"><div class="body"><h3>Add a top, bottoms and shoes</h3><div class="why">Fitted needs at least one of each to build a fit.</div></div></div>';
  var counts = {}; CATS.forEach(function (k) { counts[k] = S.items.filter(function (i) { return i.category === k; }); });
  var tops = counts.top, unworn = tops.filter(function (i) { return lastWornDays(i.id) >= 30; }).length;
  h += '<div class="sec"><h2>Your closet</h2><button data-act="cat" data-cat="all">' + S.items.length + ' items</button></div>';
  h += '<div class="deck">' +
    '<button class="card" data-act="cat" data-cat="shoes" style="top:0;background:#FFE3A3;transform:rotate(-7deg)">Shoes · ' + counts.shoes.length + '</button>' +
    '<button class="card" data-act="cat" data-cat="bottom" style="top:42px;background:#D8CCFF;transform:rotate(-4deg)">Bottoms · ' + counts.bottom.length + '</button>' +
    '<button class="card" data-act="cat" data-cat="layer" style="top:84px;background:#FFD0DE;transform:rotate(-2deg)">Layers · ' + counts.layer.length + '</button>' +
    '<button class="card front" data-act="cat" data-cat="top"><div class="pics">' + tops.slice(0, 2).map(function (t) { return '<img src="' + esc(t.img) + '" alt="">'; }).join('') + '</div>' +
    '<div class="foot"><div><b>Tops</b><small>' + tops.length + ' items · ' + unworn + ' unworn</small></div><span>' + ic('chev', 20) + '</span></div></button></div>';
  var old = S.items.filter(function (i) { return lastWornDays(i.id) >= 30; });
  if (old.length) h += '<div class="sec"><h2>Not worn in 30 days</h2><button data-act="style-these">Style these</button></div><div class="hscroll">' + old.map(itemCard).join('') + '</div>';
  if (S.outfits.length) h += '<div class="sec"><h2>Recent fits</h2><button data-act="tab" data-tab="fits">All fits</button></div><div class="tiles">' + S.outfits.slice(0, 4).map(tileHtml).join('') + '</div>';
  return h;
}
function tileHtml(o) {
  var n = S.wear.filter(function (w) { return comboKey(w.items) === comboKey(o.items); }).length;
  return '<button class="tile" data-act="fit" data-id="' + o.id + '">' + plate(o.items, 'sm') + '<b>' + esc(o.name) + '</b><small>Worn ' + n + '× · ' + esc(o.vibe) + '</small></button>';
}
function rSuggest() {
  var h = '<h1 class="pagetitle">Suggest</h1><p class="muted" style="font-weight:600;margin:8px 0 16px">Pick a vibe. Swipe right to save, left to skip. Tap a piece to swap it.</p>';
  h += '<div class="chips">' + VIBES.map(function (v) { return '<button class="pill' + (S.vibe === v ? ' on' : '') + '" data-act="vibe" data-v="' + v + '">' + v + '</button>'; }).join('') + '</div>';
  if (!S.suggestList.length) S.suggestList = candidates({ weather: wxFor(0), vibe: S.vibe });
  var c = S.suggestList[S.suggestIdx], n = S.suggestList[S.suggestIdx + 1];
  if (!c) return h + '<div class="empty"><b>That’s every combo</b><p class="muted">You’ve been through them all for ' + esc(S.vibe.toLowerCase()) + '.</p><button class="btn ghost" data-act="sug-restart">Start again</button></div>';
  h += '<div class="stack" id="stack">' + (n ? fitCard(n, { cls: 'back' }) : '') + fitCard(c, { acts: 'sug', stamps: true, attr: ' id="topcard"' }) + '</div>';
  return h;
}
function rCreate() {
  var cr = S.create, filled = CATS.filter(function (k) { return cr[k]; }).length;
  var slot = function (k, lbl, small) {
    var it = cr[k] && byId(cr[k]);
    if (it) return '<button class="slot' + (small ? ' small' : '') + '" data-act="slot" data-k="' + k + '"><span class="over">' + lbl + '</span><img src="' + esc(it.img) + '" alt="' + esc(it.name) + '"></button>';
    return '<button class="slot empty' + (small ? ' small' : '') + '" data-act="slot" data-k="' + k + '">' + (small ? ic('plus', 18) + 'Add ' + lbl.toLowerCase() : '<div><div class="plus">' + ic('plus', 20) + '</div>Add ' + lbl.toLowerCase() + '</div>') + '</button>';
  };
  var h = '<h1 class="pagetitle">Create</h1><p class="muted" style="font-weight:600;margin:8px 0 16px">Build your own fit. Tap a slot or a piece below.</p>';
  h += '<div class="canvas"><div class="grid">' + slot('top', 'Top') + slot('layer', 'Layer') + slot('bottom', 'Bottom') + slot('shoes', 'Shoes') + slot('extra', 'Extra', true) + '</div>' +
    '<div class="foot"><span>' + filled + ' of 5 slots filled</span><button data-act="create-clear">Clear</button></div></div>';
  h += '<div class="strip glass">' + S.items.map(function (i) { return '<button data-act="strip" data-id="' + i.id + '" class="' + (cr[i.category] === i.id ? 'on' : '') + '" aria-label="' + esc(i.name) + '"><img src="' + esc(i.img) + '" alt=""></button>'; }).join('') + '</div>';
  h += '<div class="acts2"><button class="btn primary" data-act="complete">' + ic('sparkle') + 'Complete it</button><button class="btn ghost" data-act="rate">' + ic('star') + 'Rate my fit</button></div>';
  if (S.rating) h += '<div class="rating glass"><div class="orbx sm" style="width:40px;height:40px"></div><div><span class="over">Fit check</span><div class="sc">' + S.rating.score + '<small>/10</small></div><p>' + esc(S.rating.verdict) + '</p></div></div>';
  if (cr.top && cr.bottom && cr.shoes) h += '<button class="btn ink block" style="margin-top:14px" data-act="create-save">' + ic('heart') + 'Save this fit</button>';
  return h;
}
function rFits() {
  var c = S.todayList[S.todayIdx], w = wxFor(0);
  var h = '<h1 class="pagetitle">Fits</h1><div style="height:16px"></div>';
  if (c) h += '<div class="today">' + plate(c.items) + '<div><div class="over">Today · ' + w.max + '° ' + esc(cond(w)) + '</div><h3>' + esc(c.name) + '</h3><p>' + esc(itemNames(c.items)) + '</p><button data-act="wear-today">' + ic('check', 14) + ' Wear this today</button></div></div>';
  var start = today0(); start = new Date(start.getTime() - ((start.getDay() + 6) % 7) * DAY);
  var logged = 0, days = '';
  for (var i = 0; i < 7; i++) {
    var d = iso(start.getTime() + i * DAY), isT = d === iso(new Date()), wr = S.wear.filter(function (x) { return x.date === d; })[0];
    if (wr) logged++;
    var top = wr && byId(wr.items.top);
    days += '<button class="' + (isT ? 'today' : '') + '" data-act="' + (isT ? 'wear-today' : 'noop') + '">' + 'MTWTFSS'[i] + (top ? '<img src="' + esc(top.img) + '" alt="">' : isT ? ic('plus', 18) : '') + '</button>';
  }
  h += '<div class="wk glass"><div class="row" style="justify-content:space-between"><b style="font-size:14px">This week</b><small class="muted" style="font-weight:650">' + logged + ' of 7 logged</small></div><div class="days">' + days + '</div></div>';
  h += '<div class="sec"><h2>Saved fits</h2><button data-act="tab" data-tab="create">New fit</button></div>';
  h += S.outfits.length ? '<div class="tiles">' + S.outfits.map(tileHtml).join('') + '</div>' : '<div class="empty"><b>No saved fits yet</b><p class="muted">Tap ♥ on any suggestion to keep it here.</p></div>';
  h += '<div class="foot2"><button data-act="reset">Reset demo data</button></div>';
  return h;
}
function rTabs() {
  var t = [['closet', 'hanger', 'Closet'], ['suggest', 'sparkle', 'Suggest'], ['create', 'create', 'Create'], ['fits', 'grid', 'Fits']];
  $('#tabbar').innerHTML = '<div class="tabs glass">' + t.map(function (x) { return '<button class="tab' + (S.tab === x[0] ? ' on' : '') + '" data-act="tab" data-tab="' + x[0] + '"' + (S.tab === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[1]) + x[2] + '</button>'; }).join('') + '</div>' +
    '<button class="circ glass cam' + (menuOpen ? ' open' : '') + '" data-act="menu" aria-label="' + (menuOpen ? 'Close menu' : 'Add') + '">' + ic(menuOpen ? 'x' : 'camera', 28) + '</button>';
}
var isStandalone = function () { return window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); };

/* ---------- add menu ---------- */
var menuOpen = false;
$('#addmenu').innerHTML =
  '<button data-act="capture"><span class="dot" style="background:#6A3CF4">' + ic('camera') + '</span><span><b>Scan an item</b><small>Photo → closet</small></span></button>' +
  '<button data-act="menu-create"><span class="dot" style="background:#FFC53D;color:#17141C">' + ic('create') + '</span><span><b>Build a fit</b><small>Put pieces on a canvas</small></span></button>' +
  '<button data-act="menu-suggest"><span class="dot" style="background:#3D5BFF">' + ic('sparkle') + '</span><span><b>Suggest a fit</b><small>Uses today’s weather</small></span></button>';
function setMenu(on) { menuOpen = on; $('#addmenu').classList.toggle('on', on); $('#scrim').classList.toggle('on', on); rTabs(); }
$('#scrim').addEventListener('click', function () { setMenu(false); });

/* ---------- sheets ---------- */
var sheetWrap = $('#sheetwrap'), sheet = $('#sheet'), onSheetClose = null;
function openSheet(title, html, after) {
  sheet.innerHTML = '<div class="sh"><h3>' + esc(title) + '</h3></div><div class="sc">' + html + '</div>';
  sheetWrap.classList.add('on'); onSheetClose = null;
  if (after) after(sheet);
  var sh = $('.sh', sheet), y0 = null;
  sh.addEventListener('pointerdown', function (e) { y0 = e.clientY; sh.setPointerCapture(e.pointerId); });
  sh.addEventListener('pointermove', function (e) { if (y0 == null) return; var d = Math.max(0, e.clientY - y0); sheet.style.transition = 'none'; sheet.style.transform = 'translateY(' + d + 'px)'; });
  sh.addEventListener('pointerup', function (e) { var d = y0 == null ? 0 : e.clientY - y0; y0 = null; sheet.style.transition = ''; sheet.style.transform = ''; if (d > 90) closeSheet(); });
}
function closeSheet() { sheetWrap.classList.remove('on'); if (onSheetClose) { var f = onSheetClose; onSheetClose = null; f(); } }
$('#sheetbd').addEventListener('click', closeSheet);

function catSheet(cat) {
  var cur = cat;
  function body() {
    var list = S.items.filter(function (i) { return cur === 'all' || i.category === cur; });
    return '<div class="chips" style="margin-bottom:14px">' + ['all'].concat(CATS).map(function (k) { return '<button class="pill' + (cur === k ? ' on' : '') + '" data-c="' + k + '">' + (k === 'all' ? 'All' : CATLABEL[k]) + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="items">' + list.map(itemCard).join('') + '</div>' : '<div class="empty"><b>Nothing here yet</b><p class="muted">Add ' + (CATLABEL[cur] || 'items').toLowerCase() + ' with the camera button.</p><button class="btn primary" data-act="capture">' + ic('camera') + 'Scan item</button></div>');
  }
  openSheet(cur === 'all' ? 'Your closet' : CATLABEL[cur], body(), function (sh) {
    sh.addEventListener('click', function f(e) { var b = e.target.closest('[data-c]'); if (!b) return; cur = b.dataset.c; $('.sc', sh).innerHTML = body(); $('.sh h3', sh).textContent = cur === 'all' ? 'Your closet' : CATLABEL[cur]; });
  });
}
function itemSheet(id) {
  var it = byId(id); if (!it) return;
  var d = lastWornDays(id), n = S.wear.filter(function (w) { for (var k in w.items) if (w.items[k] === id) return true; return false; }).length;
  var h = '<div class="bigph"><img src="' + esc(it.img) + '" alt="' + esc(it.name) + '"></div>' +
    '<div style="height:14px"></div>' +
    '<div class="kv"><span>Type</span><b>' + esc(cap(it.sub || it.category)) + '</b></div>' +
    '<div class="kv"><span>Colour</span><b>' + it.colours.map(function (c) { return '<i style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;background:' + (COLOURS[c] || '#ccc') + '"></i>' + esc(c); }).join(', ') + '</b></div>' +
    '<div class="kv"><span>Warmth</span><b>' + '●'.repeat(it.warmth) + '<span style="color:#D8D1E0">' + '●'.repeat(4 - it.warmth) + '</span></b></div>' +
    '<div class="kv"><span>Style</span><b>' + esc(it.styles.map(cap).join(' · ')) + '</b></div>' +
    '<div class="kv"><span>Worn</span><b>' + n + '× · ' + (d === Infinity ? 'never' : d === 0 ? 'today' : d + ' days ago') + '</b></div>' +
    '<div class="acts2"><button class="btn ghost" data-a="fav">' + ic(it.fav ? 'heart' : 'hearto') + (it.fav ? 'Favourite' : 'Add to favourites') + '</button><button class="btn primary" data-a="style">' + ic('sparkle') + 'Style it</button></div>' +
    '<div class="acts2"><button class="btn ghost" data-a="edit">Edit tags</button><button class="btn ghost" data-a="del" style="color:#C23">' + ic('trash') + 'Delete</button></div>';
  openSheet(it.name, h, function (sh) {
    sh.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'fav') { it.fav = !it.fav; persist(); itemSheet(id); render(); }
      if (a === 'style') { closeSheet(); openChat(); setTimeout(function () { ask('Build a fit with my ' + it.name); }, 750); }
      if (a === 'edit') tagSheet({ img: it.img, existing: it });
      if (a === 'del') {
        if (b.dataset.sure) { S.items = S.items.filter(function (x) { return x.id !== id; }); S.outfits = S.outfits.filter(function (o) { return CATS.every(function (k) { return o.items[k] !== id; }); }); persist(); refreshToday(); S.suggestList = []; closeSheet(); render(); toast('Deleted', it.name + ' was removed'); }
        else { b.dataset.sure = '1'; b.innerHTML = ic('trash') + 'Tap again to delete'; }
      }
    });
  });
}
function fitSheet(oid) {
  var o = S.outfits.filter(function (x) { return x.id === oid; })[0]; if (!o) return;
  openSheet(o.name, plate(o.items) + '<div class="why" style="display:flex;gap:8px;margin:14px 4px;color:var(--muted);font-weight:600;font-size:14px">' + ic('sparkle', 16) + '<span>' + esc(o.reason || itemNames(o.items)) + '</span></div>' +
    '<p class="muted" style="font-weight:600;font-size:13px;margin:0 4px 14px">' + esc(itemNames(o.items)) + '</p>' +
    '<div class="acts2"><button class="btn primary" data-a="wear">' + ic('check') + 'Wear today</button><button class="btn ghost" data-a="edit">Open in Create</button></div>' +
    '<div class="acts2"><button class="btn ghost" data-a="del" style="color:#C23;grid-column:span 2">' + ic('trash') + 'Delete fit</button></div>', function (sh) {
    sh.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'wear') { logWorn(o.items); closeSheet(); refreshToday(); render(); }
      if (b.dataset.a === 'edit') { S.create = JSON.parse(JSON.stringify(o.items)); CATS.forEach(function (k) { if (!(k in S.create)) S.create[k] = null; }); S.rating = null; closeSheet(); go('create'); }
      if (b.dataset.a === 'del') { S.outfits = S.outfits.filter(function (x) { return x.id !== oid; }); persist(); closeSheet(); render(); toast('Fit deleted', o.name); }
    });
  });
}
function searchSheet() {
  openSheet('Search your closet', '<div class="field"><input type="text" id="sq" placeholder="Try “white”, “shoes” or “jersey”" autocomplete="off"></div><div id="sres" class="items"></div>', function (sh) {
    var inp = $('#sq', sh), out = $('#sres', sh);
    var run = function () {
      var q = inp.value.trim().toLowerCase();
      var list = S.items.filter(function (i) { return !q || (i.name + ' ' + i.sub + ' ' + i.category + ' ' + i.colours.join(' ') + ' ' + i.styles.join(' ')).toLowerCase().indexOf(q) > -1; });
      out.innerHTML = list.length ? list.map(itemCard).join('') : '<p class="muted" style="grid-column:span 2;font-weight:600">Nothing matches “' + esc(q) + '”.</p>';
    };
    inp.addEventListener('input', run); run(); setTimeout(function () { try { inp.focus(); } catch (e) {} }, 350);
  });
}
function slotSheet(k) {
  var list = S.items.filter(function (i) { return i.category === k; });
  openSheet('Choose ' + SLOTLABEL[k], (list.length ? '<div class="pick">' + list.map(function (i) { return '<button data-id="' + i.id + '" class="' + (S.create[k] === i.id ? 'on' : '') + '"><img src="' + esc(i.img) + '" alt="">' + esc(i.name) + '</button>'; }).join('') + '</div>' : '<div class="empty"><b>No ' + CATLABEL[k].toLowerCase() + ' yet</b><p class="muted">Scan one with the camera button.</p></div>') +
    (S.create[k] ? '<button class="btn ghost block" style="margin-top:14px" data-clear="1">Empty this slot</button>' : ''), function (sh) {
    sh.addEventListener('click', function (e) {
      var b = e.target.closest('[data-id]'), c = e.target.closest('[data-clear]');
      if (b) { S.create[k] = b.dataset.id; S.rating = null; closeSheet(); render(); }
      if (c) { S.create[k] = null; S.rating = null; closeSheet(); render(); }
    });
  });
}
function swapSheet(c, k, done) {
  var list = S.items.filter(function (i) { return i.category === k; });
  openSheet('Swap ' + SLOTLABEL[k], '<div class="pick">' + list.map(function (i) { return '<button data-id="' + i.id + '" class="' + (c.items[k] === i.id ? 'on' : '') + '"><img src="' + esc(i.img) + '" alt="">' + esc(i.name) + '</button>'; }).join('') + '</div>' +
    (list.length < 2 ? '<p class="muted" style="font-weight:600;font-size:13px;margin-top:14px">That’s your only ' + SLOTLABEL[k] + ' so far. Scan more to get swaps.</p>' : ''), function (sh) {
    sh.addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (!b) return; closeSheet(); done(b.dataset.id); });
  });
}

/* ---------- capture ---------- */
function downscale(file, max, cb) {
  var fr = new FileReader();
  fr.onload = function () {
    var im = new Image();
    im.onload = function () {
      var s = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
      cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s);
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL('image/jpeg', 0.8));
    };
    im.onerror = function () { toast('Couldn’t read that photo', 'Try a JPG or PNG.'); };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}
function captureSheet() {
  setMenu(false);
  openSheet('Scan an item', '<div class="view"><span class="tip">Lay it flat · good light · one item</span><span class="br a"></span><span class="br b"></span><span class="br c"></span><span class="br d"></span>' + ic('camera', 44) + '</div>' +
    '<div class="acts2"><label class="btn primary filebtn">' + ic('camera') + 'Take photo<input type="file" accept="image/*" capture="environment" id="fcam"></label><label class="btn ghost filebtn">' + ic('photo') + 'From Photos<input type="file" accept="image/*" id="flib"></label></div>' +
    '<p class="muted" style="font-size:12px;font-weight:600;line-height:1.5;margin:14px 4px 0">In this demo your photo is saved as it is. Automatic background removal and AI tags switch on when your PC is connected.</p>', function (sh) {
    var h = function (e) { var f = e.target.files && e.target.files[0]; if (!f) return; downscale(f, 700, function (url) { cutting(url); }); };
    $('#fcam', sh).addEventListener('change', h); $('#flib', sh).addEventListener('change', h);
  });
}
function cutting(url) {
  openSheet('Cutting it out…', '<div class="cut"><span class="ants"></span><img src="' + url + '" alt=""></div><p class="muted" style="text-align:center;font-weight:600;font-size:13px">Getting your item ready</p>');
  setTimeout(function () { tagSheet({ img: url }); }, reduce ? 200 : 1300);
}
function tagSheet(o) {
  var ex = o.existing, t = ex ? JSON.parse(JSON.stringify(ex)) : { name: '', category: 'top', sub: '', colours: [], pattern: 'solid', warmth: 2, formality: 2, styles: ['casual'] };
  var opts = function (list, cur, key, multi) { return '<div class="opts" data-key="' + key + '"' + (multi ? ' data-multi="1"' : '') + '>' + list.map(function (v) { var on = multi ? cur.indexOf(v) > -1 : cur === v; return '<button class="pill' + (on ? ' on' : '') + '" data-v="' + v + '">' + (COLOURS[v] && key === 'colours' ? '<i style="background:' + COLOURS[v] + '"></i>' : '') + esc(key === 'category' ? CATLABEL[v].replace(/s$/, '') : cap(v)) + '</button>'; }).join('') + '</div>'; };
  var h = '<div class="bigph" style="height:200px"><img src="' + esc(o.img) + '" alt=""></div>' +
    '<div class="field"><label for="tn">Name</label><input type="text" id="tn" value="' + esc(t.name) + '" placeholder="e.g. Black hoodie"></div>' +
    '<div class="field"><label>Type</label>' + opts(CATS, t.category, 'category') + '</div>' +
    '<div class="field"><label for="ts">Kind</label><input type="text" id="ts" value="' + esc(t.sub) + '" placeholder="e.g. hoodie, jeans, sneakers"></div>' +
    '<div class="field"><label>Colours</label>' + opts(Object.keys(COLOURS), t.colours, 'colours', true) + '</div>' +
    '<div class="field"><label>Pattern</label>' + opts(PATTERNS, t.pattern, 'pattern') + '</div>' +
    '<div class="field"><label>Warmth</label><div class="dotsel" data-key="warmth">' + [1, 2, 3, 4].map(function (n) { return '<button class="' + (n <= t.warmth ? 'on' : '') + '" data-n="' + n + '" aria-label="Warmth ' + n + '"></button>'; }).join('') + '</div></div>' +
    '<div class="field"><label>Style</label>' + opts(STYLES, t.styles, 'styles', true) + '</div>' +
    '<div class="field"><label>How dressy</label><div class="dotsel" data-key="formality">' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="' + (n <= t.formality ? 'on' : '') + '" data-n="' + n + '" aria-label="Dressy ' + n + '"></button>'; }).join('') + '</div></div>' +
    '<button class="btn primary block" data-save="1" style="margin-top:8px">' + (ex ? 'Save changes' : 'Save to closet') + '</button>';
  openSheet(ex ? 'Edit ' + ex.name : 'Tag your item', h, function (sh) {
    sh.addEventListener('click', function (e) {
      var b = e.target.closest('.opts [data-v]');
      if (b) { var g = b.parentNode, key = g.dataset.key, v = b.dataset.v;
        if (g.dataset.multi) { var arr = t[key], i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); else if (arr.length < 3) arr.push(v); b.classList.toggle('on', arr.indexOf(v) > -1); }
        else { t[key] = v; $$('[data-v]', g).forEach(function (x) { x.classList.toggle('on', x === b); }); } return; }
      var d = e.target.closest('.dotsel [data-n]');
      if (d) { var k2 = d.parentNode.dataset.key; t[k2] = +d.dataset.n; $$('[data-n]', d.parentNode).forEach(function (x) { x.classList.toggle('on', +x.dataset.n <= t[k2]); }); return; }
      if (e.target.closest('[data-save]')) {
        t.name = $('#tn', sh).value.trim() || (cap(t.colours[0] || '') + ' ' + (t.sub || CATLABEL[t.category].replace(/s$/, '').toLowerCase())).trim();
        t.sub = $('#ts', sh).value.trim() || t.category;
        if (!t.colours.length) t.colours = ['black'];
        if (!t.styles.length) t.styles = ['casual'];
        if (ex) { Object.assign(ex, t); } else { t.id = uid(); t.img = o.img; t.fav = false; t.added = iso(new Date()); S.items.push(t); }
        persist(); refreshToday(); S.suggestList = []; closeSheet(); render();
        toast(ex ? 'Saved' : 'Added to your closet', t.name);
      }
    });
  });
}

/* ---------- toast ---------- */
var toastT = null;
function toast(title, sub, undo) {
  var el = $('#toast');
  el.innerHTML = '<i>' + ic('check', 18) + '</i><div><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (undo ? '<button type="button">Undo</button>' : '');
  if (undo) $('button', el).onclick = function () { undo(); el.classList.remove('on'); render(); };
  el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2600);
}

/* ---------- global click delegation ---------- */
function go(tab) { S.tab = tab; setMenu(false); S.rating = S.tab === 'create' ? S.rating : null; render(); var s = $('#scr'); if (s) s.scrollTop = 0; }
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-act]'); if (!b || !$('#app').contains(b)) return;
  var a = b.dataset.act;
  if (a === 'tab') return go(b.dataset.tab);
  if (a === 'menu') return setMenu(!menuOpen);
  if (a === 'menu-create') { setMenu(false); return go('create'); }
  if (a === 'menu-suggest') { setMenu(false); openChat(); setTimeout(function () { ask('What should I wear today?'); }, 750); return; }
  if (a === 'capture') { closeSheet(); return setTimeout(captureSheet, 50); }
  if (a === 'search') return searchSheet();
  if (a === 'hintoff') { S.hintOff = true; store.set('hintOff', true); return render(); }
  if (a === 'cat') return catSheet(b.dataset.cat);
  if (a === 'item') return itemSheet(b.dataset.id);
  if (a === 'fit') return fitSheet(b.dataset.id);
  if (a === 'style-these') { openChat(); var old = S.items.filter(function (i) { return lastWornDays(i.id) >= 30; })[0]; setTimeout(function () { ask('Build a fit with my ' + (old ? old.name : 'closet')); }, 750); return; }
  var tc = S.todayList[S.todayIdx];
  if (a === 'today-skip' && tc) { skipFeedback(tc); S.todayIdx = (S.todayIdx + 1) % S.todayList.length; return render(); }
  if (a === 'today-shuffle' && S.todayList.length) { S.todayIdx = (S.todayIdx + 1 + Math.floor(Math.random() * Math.max(1, S.todayList.length - 1))) % S.todayList.length; return render(); }
  if (a === 'today-save' && tc) { saveOutfit(tc); return render(); }
  if (a === 'vibe') { S.vibe = b.dataset.v; S.suggestList = []; S.suggestIdx = 0; return render(); }
  if (a === 'sug-restart') { S.suggestList = []; S.suggestIdx = 0; return render(); }
  if (a === 'sug-skip') return flyCard(-1);
  if (a === 'sug-save') return flyCard(1);
  if (a === 'sug-shuffle') { var cur = S.suggestList[S.suggestIdx]; S.suggestList.splice(S.suggestIdx, 1); S.suggestList.push(cur); return render(); }
  if (a === 'slot') return slotSheet(b.dataset.k);
  if (a === 'strip') { var it = byId(b.dataset.id); S.create[it.category] = S.create[it.category] === it.id ? null : it.id; S.rating = null; return render(); }
  if (a === 'create-clear') { S.create = { top: null, layer: null, bottom: null, shoes: null, extra: null }; S.rating = null; return render(); }
  if (a === 'complete') return completeIt();
  if (a === 'rate') return rateIt();
  if (a === 'create-save') return saveCreate();
  if (a === 'wear-today' && tc) { logWorn(tc.items); refreshToday(); return render(); }
  if (a === 'reset') {
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tap again to reset everything'; return; }
    S.items = JSON.parse(JSON.stringify(SEED_ITEMS)); S.outfits = JSON.parse(JSON.stringify(SEED_OUTFITS)); S.wear = JSON.parse(JSON.stringify(SEED_WEAR)); S.fb = { like: {}, skip: {} };
    persist(); refreshToday(); S.suggestList = []; chatReset(); go('closet'); toast('Demo data reset', 'Back to your 5 starter items');
  }
});

/* ---------- suggest: swipeable card ---------- */
function flyCard(dir) {
  var card = $('#topcard'), c = S.suggestList[S.suggestIdx]; if (!card || !c) return;
  card.style.transition = 'transform .35s cubic-bezier(.3,.6,.4,1), opacity .35s';
  card.style.transform = 'translateX(' + dir * 520 + 'px) rotate(' + dir * 18 + 'deg)'; card.style.opacity = '0';
  if (dir > 0) saveOutfit(c); else skipFeedback(c);
  setTimeout(function () { S.suggestIdx++; render(); }, 280);
}
document.addEventListener('pointerdown', function (e) {
  var card = e.target.closest('#topcard'); if (!card || e.target.closest('button')) return;
  var x0 = e.clientX, y0 = e.clientY, dx = 0, moved = false, keep = $('.stamp.keep', card), skip = $('.stamp.skip', card);
  card.style.transition = 'none';
  function mv(ev) {
    dx = ev.clientX - x0; var dy = ev.clientY - y0;
    if (!moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { up(); return; }
    if (Math.abs(dx) > 6) moved = true;
    card.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 22 + 'deg)';
    keep.style.opacity = Math.max(0, Math.min(1, dx / 90)); skip.style.opacity = Math.max(0, Math.min(1, -dx / 90));
  }
  function up() {
    document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
    if (Math.abs(dx) > 100) return flyCard(dx > 0 ? 1 : -1);
    card.style.transition = ''; card.style.transform = ''; keep.style.opacity = 0; skip.style.opacity = 0;
    if (!moved) tapPiece(e, card);
  }
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
});
function tapPiece(e, card) {
  var plateEl = $('.plate', card), r = plateEl.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
  var c = S.suggestList[S.suggestIdx], px = (e.clientX - r.left) / r.width * 100, py = (e.clientY - r.top) / r.height * 100, L = layout(c.items), hit = null;
  ['shoes', 'extra', 'bottom', 'top', 'layer'].forEach(function (k) { if (hit || !c.items[k]) return; var p = L[k]; if (px >= p[0] && px <= p[0] + p[2] && py >= p[1] && py <= p[1] + p[2] * 0.95) hit = k; });
  if (!hit) return;
  swapSheet(c, hit, function (id) {
    c.items[hit] = id; var r2 = scoreCombo(c.items, c.w, c.vibe, false); c.notes = r2.notes; c.name = nameFor(c); c.reason = reasonFor(c); render();
  });
}

/* ---------- create: complete + rate ---------- */
function completeIt() {
  var lock = {}; CATS.forEach(function (k) { if (S.create[k]) lock[k] = S.create[k]; });
  var cs = candidates({ weather: wxFor(0), vibe: 'Casual', lock: lock });
  if (!cs.length) return toast('Can’t complete yet', 'Add at least one top, bottoms and shoes to your closet.');
  var c = cs[0]; CATS.forEach(function (k) { if (!S.create[k] && c.items[k] && (k === 'top' || k === 'bottom' || k === 'shoes')) S.create[k] = c.items[k]; });
  S.rating = null; render(); toast('Filled the empty slots', c.reason);
}
function rateIt() {
  var cr = S.create; if (!(cr.top && cr.bottom && cr.shoes)) return toast('Add a top, bottoms and shoes', 'Then I can rate the fit.');
  var w = wxFor(0), r = scoreCombo(cr, w, 'Casual', false), all = CATS.filter(function (k) { return cr[k]; }).map(function (k) { return byId(cr[k]); });
  var score = Math.max(3, Math.min(10, Math.round(7 + r.score / 2))); if (r.notes.length) score = Math.min(score, 6); var loud = all.filter(isLoud).length, v;
  if (loud > 1) v = 'Two loud pieces are fighting. Keep one and swap the other for something plain.';
  else if (r.notes.indexOf('shorts') > -1) v = 'Only ' + w.max + '° today. Shorts will feel cold.';
  else if (r.notes.indexOf('wetwhite') > -1) v = 'Rain is likely, so the white shoes might not survive. Try darker ones.';
  else if (score >= 8) v = 'Clean combo that suits ' + w.max + '° and ' + cond(w).toLowerCase() + '.';
  else v = 'It works. Wear it with confidence, or tap Complete it for a stronger match.';
  S.rating = { score: score, verdict: v }; render();
}
function saveCreate() {
  var items = {}; CATS.forEach(function (k) { if (S.create[k]) items[k] = S.create[k]; });
  var c = { items: items, vibe: 'Casual', w: wxFor(0), notes: [], by: 'user' }; c.name = nameFor(c); c.reason = reasonFor(c);
  openSheet('Name this fit', '<div class="field"><input type="text" id="fn" value="' + esc(c.name) + '" autocomplete="off"></div><button class="btn primary block" id="fnok">Save fit</button>', function (sh) {
    $('#fnok', sh).onclick = function () { saveOutfit(c, $('#fn', sh).value.trim() || c.name); closeSheet(); render(); };
  });
}

/* =========================================================
   Lens → chat
   ========================================================= */
var app = $('#app'), lens = $('#lens'), lbl = $('#lensLbl'), rel = $('#lensRel'), chat = $('#chat'), cbody = $('#cbody');
$('#chatClose').innerHTML = ic('down'); $('#mic').innerHTML = ic('mic'); $('.send').innerHTML = ic('up');
var isOpen = false, drag = null, ticked = false;
function lensCenter() { var a = app.getBoundingClientRect(), l = lens.getBoundingClientRect(); return { x: l.left - a.left + l.width / 2, y: l.top - a.top + l.height / 2 }; }
function setLens(dy, anim) {
  var up = Math.max(0, -dy), sc = 1 + Math.min(up, 260) / 430;
  lens.style.transition = anim ? 'transform .5s cubic-bezier(.3,1.5,.5,1)' : 'none';
  lens.style.transform = 'translateY(' + (dy < 0 ? dy : dy * 0.2) + 'px) scale(' + sc + ')';
  lbl.style.opacity = up > 40 ? 0 : 1; rel.style.opacity = up > 90 ? 1 : 0;
  if (up > 90 && !ticked) { ticked = true; lens.classList.add('tick'); setTimeout(function () { lens.classList.remove('tick'); }, 220); }
  if (up < 80) ticked = false;
}
lens.addEventListener('pointerdown', function (e) { if (isOpen) return; setMenu(false); drag = { y: e.clientY, t: performance.now(), dy: 0, v: 0 }; try { lens.setPointerCapture(e.pointerId); } catch (x) {} });
lens.addEventListener('pointermove', function (e) { if (!drag) return; var now = performance.now(), ndy = e.clientY - drag.y; drag.v = (ndy - drag.dy) / Math.max(1, now - (drag.lt || drag.t)); drag.lt = now; drag.dy = ndy; setLens(ndy, false); });
function endDrag() { if (!drag) return; var d = drag; drag = null; if (d.dy < -90 || (d.dy < -20 && d.v < -0.6) || Math.abs(d.dy) < 6) openChat(); else setLens(0, true); }
lens.addEventListener('pointerup', endDrag); lens.addEventListener('pointercancel', endDrag);
lens.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(); } });
lens.addEventListener('click', function (e) { e.preventDefault(); });

function openChat() {
  if (isOpen) return; isOpen = true;
  var c = lensCenter(), av = $('.chead .av'), ar = app.getBoundingClientRect(), avr = av.getBoundingClientRect();
  chat.style.transition = 'none'; chat.style.clipPath = 'circle(120px at ' + c.x + 'px ' + c.y + 'px)'; void chat.offsetHeight;
  chat.style.transition = 'clip-path ' + (reduce ? '.01s' : '.62s') + ' cubic-bezier(.2,.8,.2,1)';
  chat.style.clipPath = 'circle(1400px at ' + c.x + 'px ' + c.y + 'px)';
  chat.classList.add('open'); chat.setAttribute('aria-hidden', 'false');
  var tx = (avr.left - ar.left + avr.width / 2) - c.x, ty = (avr.top - ar.top + avr.height / 2) - c.y;
  var cur = lens.style.transform || '';
  lens.style.zIndex = 40; lens.style.pointerEvents = 'none';
  lens.style.transition = 'transform .6s cubic-bezier(.5,0,.2,1), opacity .2s .45s';
  var m = /translateY\((-?[\d.]+)px\)/.exec(cur), base = m ? +m[1] : 0;
  lens.style.transform = 'translate(' + tx + 'px,' + (ty + base) + 'px) scale(' + (40 / 240) + ')';
  lens.style.opacity = 0;
  setTimeout(function () { chat.classList.add('landed'); }, reduce ? 0 : 520);
  if (!cbody.children.length) hello();
  try { history.pushState({ chat: 1 }, ''); } catch (e) {}
}
function closeChat(fromPop) {
  if (!isOpen) return; isOpen = false;
  var c = restCenter();
  chat.classList.remove('landed');
  chat.style.transition = 'clip-path .5s cubic-bezier(.6,0,.4,1)';
  chat.style.clipPath = 'circle(0px at ' + c.x + 'px ' + c.y + 'px)';
  chat.classList.remove('open'); chat.setAttribute('aria-hidden', 'true');
  lens.style.transition = 'transform .55s cubic-bezier(.3,1.3,.5,1) .15s, opacity .2s .1s';
  lens.style.transform = 'none'; lens.style.opacity = 1; lbl.style.opacity = 1; rel.style.opacity = 0;
  setTimeout(function () { lens.style.zIndex = ''; lens.style.pointerEvents = ''; }, 600);
  try { document.activeElement.blur(); } catch (e) {}
  if (!fromPop) { try { if (history.state && history.state.chat) history.back(); } catch (e) {} }
}
function restCenter() { var a = app.getBoundingClientRect(); var sab = parseFloat(getComputedStyle(app).getPropertyValue('--sab')) || 0; return { x: a.width / 2, y: a.height - 8 - sab }; }
window.addEventListener('popstate', function () { if (isOpen) closeChat(true); });
$('#chatClose').addEventListener('click', function () { closeChat(); });
(function () {
  var hd = null, ch = $('#chead');
  ch.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; hd = { y: e.clientY, d: 0 }; try { ch.setPointerCapture(e.pointerId); } catch (x) {} });
  ch.addEventListener('pointermove', function (e) { if (!hd) return; hd.d = Math.max(0, e.clientY - hd.y); chat.style.transform = 'translateY(' + hd.d * 0.5 + 'px)'; });
  function end() { if (!hd) return; var d = hd.d; hd = null; chat.style.transform = ''; if (d > 80) closeChat(); }
  ch.addEventListener('pointerup', end); ch.addEventListener('pointercancel', end);
})();

/* ---------- chat: demo stylist ---------- */
var CH = { current: null, busy: false };
function chatReset() { cbody.innerHTML = ''; CH.current = null; if (isOpen) hello(); }
function nextSatOffset() { var d = new Date().getDay(); return (6 - d + 7) % 7; }
function hello() {
  var sat = nextSatOffset(), least = S.items.slice().sort(function (a, b) { return lastWornDays(b.id) - lastWornDays(a.id); })[0];
  var shoe = S.items.filter(function (i) { return i.category === 'shoes'; })[0] || least, top = S.items.filter(function (i) { return i.category === 'top'; })[1] || least;
  var sugs = [];
  if (shoe) sugs.push([shoe.img, sat === 0 ? 'Braai today' : 'Braai on Saturday', 'Plan a relaxed fit', 'What should I wear to a braai on Saturday?']);
  if (least) sugs.push([least.img, 'My ' + nm(least), 'What goes with it?', 'What goes with my ' + least.name + '?']);
  if (top) sugs.push([top.img, 'Plan my week', 'A fit for every day', 'Plan my week']);
  cbody.innerHTML = '<div class="hello"><h5>What are we<br><span>wearing today?</span></h5><p>I know your ' + S.items.length + ' items and this week’s forecast.</p>' +
    sugs.map(function (s) { return '<button type="button" class="sug glass" data-q="' + esc(s[3]) + '"><span class="th"><img src="' + esc(s[0]) + '" alt=""></span><span><b>' + esc(s[1]) + '</b><small>' + esc(s[2]) + '</small></span><span class="chev">' + ic('chev', 20) + '</span></button>'; }).join('') + '</div>';
}
cbody.addEventListener('click', function (e) {
  var s = e.target.closest('[data-q]'); if (s) return ask(s.dataset.q);
  var sv = e.target.closest('[data-savefit]'); if (sv && CH.cards[sv.dataset.savefit]) { saveOutfit(CH.cards[sv.dataset.savefit]); sv.classList.add('saved'); sv.innerHTML = ic('check', 20); }
});
CH.cards = {};
var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function parseDay(q) {
  if (/tomorrow/.test(q)) return 1;
  if (/weekend|saturday|sat\b/.test(q)) return nextSatOffset();
  for (var i = 0; i < 7; i++) if (q.indexOf(DAYS[i]) > -1) return (i - new Date().getDay() + 7) % 7;
  return 0;
}
function parseVibe(q) { if (/braai|bbq/.test(q)) return 'Braai'; if (/work|office|meeting/.test(q)) return 'Work'; if (/date|dinner|night out/.test(q)) return 'Date night'; if (/gym|workout|run\b/.test(q)) return 'Gym'; return null; }
function parseSlot(q) {
  if (/shoe|sneaker|kicks|runner|boot|shox/.test(q)) return 'shoes';
  if (/jersey|top|shirt|tee|t-shirt/.test(q)) return 'top';
  if (/short|jort|pant|jean|bottom|trouser|skirt/.test(q)) return 'bottom';
  if (/jacket|hoodie|layer|coat/.test(q)) return 'layer';
  return null;
}
function mentioned(q) { var best = null; S.items.forEach(function (i) { var n = i.name.toLowerCase(); if (q.indexOf(n) > -1 || n.split(' ').some(function (w) { return w.length > 3 && q.indexOf(w) > -1 && !/jersey|shoes/.test(w); })) best = best || i; }); return best; }
function route(q) {
  q = q.toLowerCase();
  if (/start over|reset|clear/.test(q)) return { intent: 'reset' };
  if (/save/.test(q)) return { intent: 'save' };
  if (/swap|change|different|another/.test(q)) return { intent: 'swap', slot: parseSlot(q) };
  if (/week/.test(q)) return { intent: 'week' };
  var it = mentioned(q);
  if (it && /build|style|fit with/.test(q)) return { intent: 'build', item: it };
  if (it && /go with|goes with|pair|match/.test(q)) return { intent: 'pair', item: it };
  if (/wear|outfit|fit\b|fit for|what should|dress|suggest|braai|work|date|gym|today|tomorrow|weekend/.test(q)) return { intent: 'suggest', day: parseDay(q), vibe: parseVibe(q) };
  if (it) return { intent: 'pair', item: it };
  return { intent: 'other' };
}
function dayWord(off) { if (off === 0) return 'Today'; if (off === 1) return 'Tomorrow'; return cap(DAYS[new Date(today0().getTime() + off * DAY).getDay()]); }
function cardHtml(c) {
  var k = uid(); CH.cards[k] = c;
  return '<div class="fitc glass">' + plate(c.items) + '<div class="cap"><div><b>' + esc(c.name) + '</b><small>' + esc(itemNames(c.items)) + '</small></div><button type="button" data-savefit="' + k + '" aria-label="Save this fit">' + ic('heart', 20) + '</button></div></div>';
}
function respond(q) {
  var r = route(q), w, cs, c;
  if (r.intent === 'reset') return { reset: true };
  if (r.intent === 'suggest') {
    w = wxFor(r.day); var vibe = r.vibe || 'Casual';
    cs = candidates({ weather: w, vibe: vibe });
    if (!cs.length) return { t: 'I need at least one top, bottoms and shoes to build a fit. Scan a few with the camera button.' };
    c = cs[0]; CH.current = c; CH.list = cs;
    var drop = w.min <= w.max - 6 ? ', dropping to ' + w.min + '° later' : '';
    return { t: dayWord(r.day) + ' is ' + w.max + '° and ' + cond(w).toLowerCase() + drop + '. ' + c.reason, x: cardHtml(c), q: quickFor(c) };
  }
  if (r.intent === 'swap') {
    if (!CH.current) { var first = respond('What should I wear today?'); first.t = 'Let’s start with a fit. ' + first.t; return first; }
    var slot = r.slot || 'shoes', cur = CH.current;
    var alts = S.items.filter(function (i) { return i.category === slot && i.id !== cur.items[slot]; });
    if (!alts.length) return { t: 'That’s the only ' + SLOTLABEL[slot] + ' in your closet so far. Add another with the camera button and I’ll swap it in.', q: ['Save this fit', 'Start over'] };
    var best = null, bs = -Infinity;
    alts.forEach(function (a) { var items = Object.assign({}, cur.items); items[slot] = a.id; var s = scoreCombo(items, cur.w, cur.vibe, false); if (s.score > bs) { bs = s.score; best = { items: items, notes: s.notes }; } });
    c = { items: best.items, notes: best.notes, w: cur.w, vibe: cur.vibe, score: bs }; c.name = nameFor(c); c.reason = reasonFor(c); CH.current = c;
    var ni = byId(best.items[slot]);
    return { t: 'Swapped in your ' + nm(ni) + '. ' + c.reason, x: cardHtml(c), q: quickFor(c, slot) };
  }
  if (r.intent === 'save') {
    if (!CH.current) return { t: 'Nothing to save yet. Ask me for a fit first.', q: ['What should I wear today?'] };
    var o = saveOutfit(CH.current); render();
    return { t: 'Saved to your Fits as “' + o.name + '”.', q: ['Plan my week', 'Start over'] };
  }
  if (r.intent === 'pair' || r.intent === 'build') {
    var it = r.item, lock = {}; lock[it.category] = it.id;
    cs = candidates({ weather: wxFor(0), vibe: 'Casual', lock: lock });
    if (!cs.length) return { t: 'I need more pieces to pair with your ' + nm(it) + '. Add bottoms and shoes first.' };
    if (r.intent === 'build') { c = cs[0]; CH.current = c; return { t: 'Built around your ' + nm(it) + '. ' + c.reason, x: cardHtml(c), q: quickFor(c) }; }
    var seen = {}, row = [];
    cs.forEach(function (x) { CATS.forEach(function (k) { var id = x.items[k]; if (id && id !== it.id && !seen[id]) { seen[id] = 1; row.push(byId(id)); } }); });
    var tone = isLoud(it) ? 'is the loud piece, so keep the rest simple' : 'is easy to pair';
    return { t: 'Your ' + nm(it) + ' ' + tone + '. These all work with it:', x: '<div class="irow">' + row.slice(0, 6).map(function (i) { return '<div><img src="' + esc(i.img) + '" alt="">' + esc(i.name) + '</div>'; }).join('') + '</div>', q: ['Build a fit with my ' + it.name] };
  }
  if (r.intent === 'week') {
    var used = {}, out = '';
    for (var d = 1; d <= 5; d++) {
      w = wxFor(Math.min(d, S.forecast.length - 1));
      cs = candidates({ weather: w, vibe: 'Casual' }); if (!cs.length) break;
      var pick = cs.filter(function (x) { return !used[x.items.top]; })[0] || cs[d % cs.length];
      used[pick.items.top] = 1; CH.current = pick;
      var k = uid(); CH.cards[k] = pick;
      out += '<div>' + plate(pick.items) + '<b>' + dayWord(d) + ' · ' + w.max + '°</b></div>';
    }
    if (!out) return { t: 'Add a top, bottoms and shoes first, then I can plan your week.' };
    var tops = S.items.filter(function (i) { return i.category === 'top'; }).length;
    return { t: 'Here are the next five days' + (tops < 5 ? '. You have ' + tops + ' tops, so some repeat; add more and I’ll spread them out.' : ', no repeats.'), x: '<div class="week">' + out + '</div>', q: ['What should I wear today?', 'Start over'] };
  }
  return { t: 'In demo mode I can suggest fits for any day or occasion, swap pieces, pair items and plan your week. Open questions come when your PC’s AI is connected.', q: ['What should I wear today?', 'Plan my week'] };
}
function quickFor(c, justSwapped) {
  var t = byId(c.items.top), q = [];
  if (justSwapped !== 'top') q.push('Swap the ' + (/jersey/i.test(t.name) ? 'jersey' : 'top'));
  if (justSwapped !== 'shoes') q.push('Swap the shoes');
  q.push('Save this fit');
  return q;
}
function scrollEnd() { cbody.scrollTo({ top: cbody.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }
function ask(q) {
  if (CH.busy || !q) return;
  var r = respond(q);
  if (r.reset) { chatReset(); return; }
  CH.busy = true;
  var h = $('.hello', cbody); if (h) h.remove();
  $$('.qrs', cbody).forEach(function (n) { n.remove(); });
  var me = document.createElement('div'); me.className = 'msg me'; me.innerHTML = '<div></div>'; me.firstChild.textContent = q; cbody.appendChild(me);
  var ai = document.createElement('div'); ai.className = 'msg ai';
  ai.innerHTML = '<span class="mini orbx sm"></span><div class="txt"><span class="dots"><i></i><i></i><i></i></span></div>';
  cbody.appendChild(ai); scrollEnd();
  setTimeout(function () {
    var txt = $('.txt', ai); txt.textContent = '';
    var words = r.t.split(' '), i = 0;
    (function tick() {
      if (i < words.length) { txt.textContent += (i ? ' ' : '') + words[i++]; if (i % 6 === 0) scrollEnd(); setTimeout(tick, reduce ? 0 : 32); return; }
      if (r.x) { var d = document.createElement('div'); d.innerHTML = r.x; while (d.firstChild) txt.appendChild(d.firstChild); }
      if (r.q) { var qs = document.createElement('div'); qs.className = 'qrs'; r.q.forEach(function (l) { var b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = l; b.onclick = function () { ask(l); }; qs.appendChild(b); }); cbody.appendChild(qs); }
      CH.busy = false; scrollEnd();
    })();
  }, reduce ? 150 : 700);
}
$('#comp').addEventListener('submit', function (e) { e.preventDefault(); var v = $('#q').value.trim(); if (!v) return; $('#q').value = ''; ask(v); });

/* keyboard: keep composer above the iOS keyboard */
if (window.visualViewport) {
  var vv = window.visualViewport;
  var fix = function () { var off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); $('#comp').style.transform = off > 60 ? 'translateY(' + (-off + 8) + 'px)' : ''; };
  vv.addEventListener('resize', fix); vv.addEventListener('scroll', fix);
}

/* voice: browser speech if available */
$('#mic').addEventListener('click', function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast('Voice isn’t available here', 'Type instead. Voice comes with your PC setup.');
  var v = document.createElement('div'); v.className = 'voice';
  var bars = ''; for (var i = 0; i < 11; i++) bars += '<i style="animation-delay:' + (i * 0.07).toFixed(2) + 's"></i>';
  v.innerHTML = '<div class="big orbx breathe"></div><div class="wave">' + bars + '</div><b>Listening…</b><small></small><button class="btn ghost" type="button">Cancel</button>';
  chat.appendChild(v);
  var rec, sm = $('small', v), final = '';
  try { rec = new SR(); } catch (e) { v.remove(); return toast('Voice isn’t available here', 'Type instead.'); }
  rec.lang = 'en-ZA'; rec.interimResults = true; rec.continuous = false;
  rec.onresult = function (ev) { var t = ''; for (var j = 0; j < ev.results.length; j++) t += ev.results[j][0].transcript; final = t; sm.textContent = '“' + t + '”'; };
  rec.onerror = function () { v.remove(); toast('Couldn’t hear you', 'Check microphone access, or type instead.'); };
  rec.onend = function () { if (!v.parentNode) return; v.remove(); if (final.trim()) ask(final.trim()); };
  $('button', v).onclick = function () { final = ''; try { rec.abort(); } catch (e) {} v.remove(); };
  try { rec.start(); } catch (e) { v.remove(); toast('Voice isn’t available here', 'Type instead.'); }
});

/* ---------- onboarding ---------- */
function onboarding() {
  if (S.seen) return;
  var host = $('#onbHost'), pics = S.items.slice(0, 5), pos = [[6, 18, 30], [36, 2, 34], [70, 20, 28], [18, 58, 26], [60, 60, 24]];
  host.innerHTML = '<div class="onb" id="onb"><div class="bubbles">' + pics.map(function (p, i) { var q = pos[i]; return '<div class="glass" style="left:' + q[0] + '%;top:' + q[1] + '%;width:' + q[2] + '%;aspect-ratio:1;animation-delay:' + (i * 0.6) + 's"><img src="' + esc(p.img) + '" alt=""></div>'; }).join('') + '</div>' +
    '<div class="orbx breathe"></div><h1>Meet Fitted.</h1><p>Snap your clothes once.<br>Get a fit every morning.</p><div class="grow"></div>' +
    '<button class="btn ink block" id="onbGo">Get started</button><small>Your closet stays on this device in the demo.</small></div>';
  $('#onbGo').onclick = function () { S.seen = true; store.set('seen', true); var o = $('#onb'); o.classList.add('bye'); setTimeout(function () { host.innerHTML = ''; }, 420); };
}

/* ---------- boot ---------- */
refreshToday(); render(); onboarding(); loadWeather();
})();
