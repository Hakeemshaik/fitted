/* Fitted style engine: pure functions, no DOM. Scores outfits on colour harmony,
   silhouette (fit balance), weather, occasion and wear history. */

export const CATS = ['top', 'layer', 'bottom', 'shoes', 'extra'];
export const CATLABEL = { top: 'Tops', layer: 'Layers', bottom: 'Bottoms', shoes: 'Shoes', extra: 'Extras' };
export const ONE = { top: 'Top', layer: 'Layer', bottom: 'Bottoms', shoes: 'Shoes', extra: 'Extra' };
export const VIBES = ['Casual', 'Work', 'Date night', 'Braai', 'Gym'];
export const STYLES = ['casual', 'sport', 'street', 'smart', 'formal', 'lounge'];
export const PATTERNS = ['solid', 'striped', 'graphic', 'print', 'check'];
export const FITS = ['slim', 'regular', 'relaxed', 'oversized'];
const FV = { slim: 1, regular: 2, relaxed: 3, oversized: 4 };

export const COLOURS = {
  black: '#1b1b1f', white: '#f4f4f2', grey: '#9a97a0', silver: '#C9CCD2', navy: '#2B3A67', denim: '#4C6FA8',
  beige: '#D9C7B0', cream: '#EFE6D2', brown: '#6B4A33', olive: '#6B7045', green: '#5E9C6A', blue: '#3D6BD6',
  purple: '#7B4DD6', pink: '#F29BB8', red: '#D6252C', burgundy: '#7A1F32', orange: '#F28C28', yellow: '#FFC53D'
};
export const NEUTRAL = { black: 1, white: 1, grey: 1, silver: 1, navy: 1, denim: 1, beige: 1, cream: 1, brown: 1 };
const MUTED = { olive: 1, burgundy: 1 };
// Positions on the painter's (RYB) colour wheel, which is what stylists mean by complementary.
const HUE = { red: 0, orange: 60, yellow: 120, olive: 150, green: 180, blue: 240, purple: 290, pink: 330, burgundy: 350 };

export const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const DAY = 86400000;
export const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const iso = d => { const z = new Date(d); return z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); };
export const daysAgo = n => iso(today0().getTime() - n * DAY);

const LOWERS = { light: 1, dark: 1, plain: 1, striped: 1 };
/** Item name for use mid-sentence: "black runners", but "Milan jersey". */
export const nm = it => { const n = it.name, f = n.split(' ')[0].toLowerCase(); return COLOURS[f] || LOWERS[f] ? n.charAt(0).toLowerCase() + n.slice(1) : n; };

/** Fill defaults so older saved items and imports score correctly. */
export function normItem(it) {
  it.colours = (it.colours && it.colours.length ? it.colours : ['black']).filter(c => COLOURS[c]);
  if (!it.colours.length) it.colours = ['black'];
  if (PATTERNS.indexOf(it.pattern) < 0) it.pattern = 'solid';
  if (!FV[it.fit]) it.fit = 'regular';
  it.warmth = clamp(+it.warmth || 2, 1, 4);
  it.formality = clamp(+it.formality || 2, 1, 5);
  it.styles = (it.styles && it.styles.length ? it.styles : ['casual']).filter(s => STYLES.indexOf(s) > -1);
  if (!it.styles.length) it.styles = ['casual'];
  if (it.owned === undefined) it.owned = true;
  if (CATS.indexOf(it.category) < 0) it.category = 'top';
  it.sub = it.sub || it.category;
  return it;
}

/* ---------- weather ---------- */
export const WMO = c => {
  if (c === 0) return ['Sunny', 'sun']; if (c <= 2) return ['Partly cloudy', 'partly']; if (c === 3) return ['Cloudy', 'cloud'];
  if (c === 45 || c === 48) return ['Foggy', 'cloud']; if (c >= 51 && c <= 67) return ['Rainy', 'rain']; if (c >= 71 && c <= 77) return ['Snow', 'cloud'];
  if (c >= 80 && c <= 82) return ['Showers', 'rain']; if (c >= 95) return ['Stormy', 'rain']; return ['Cloudy', 'cloud'];
};
export const cond = w => WMO(w.code)[0];
export const band = w => (w.max < 12 ? 'cold' : w.max < 18 ? 'cool' : w.max <= 26 ? 'mild' : 'hot');
export const isShort = it => /short|jort|skirt/i.test(it.sub + ' ' + it.name);

/* ---------- colour harmony ---------- */
const SLOT_W = { top: 3, layer: 3, bottom: 2.5, shoes: 1.1, extra: 0.6 };
const SHARE = [1, 0.5, 0.3];

function paletteOf(p) {
  const w = {};
  CATS.forEach(k => { const it = p[k]; if (it) it.colours.forEach((c, i) => { w[c] = (w[c] || 0) + SLOT_W[k] * (SHARE[i] || 0.3); }); });
  return Object.keys(w).map(c => [c, w[c]]).sort((a, b) => b[1] - a[1]);
}
const carriers = (p, test) => CATS.filter(k => p[k] && p[k].colours.some(test));

/** How well an outfit's colours work together. p maps slot -> item. */
export function harmony(p, profile) {
  profile = profile || {};
  const pal = paletteOf(p), total = pal.reduce((a, x) => a + x[1], 0) || 1;
  let fam = [];
  pal.forEach(([c, wt]) => {
    if (NEUTRAL[c]) return;
    const f = fam.filter(x => hueDist(x.h, HUE[c]) <= 25)[0];
    if (f) { f.w += wt; f.cols.push(c); } else fam.push({ name: c, h: HUE[c], w: wt, cols: [c] });
  });
  fam.sort((a, b) => b.w - a.w);
  // A trim colour on one piece (under ~1 unit of weight) is a detail, not an accent.
  const hints = fam.filter(f => f.w < 1);
  fam = fam.filter(f => f.w >= 1);
  let s = 0, label, story, clash = null, echo = null;
  if (!fam.length) {
    const main = pal[0] ? pal[0][0] : 'black', hint = hints.length ? ' with a hint of ' + hints[0].name : '';
    if (pal[0] && pal[0][1] / total > 0.62) { s = 2; label = 'Tonal ' + main; story = 'Tonal ' + main + ' head to toe' + hint + ', clean and easy.'; }
    else { s = 1.5; label = 'Neutral palette'; story = 'An all-neutral palette' + hint + ', so everything goes together.'; }
  } else if (fam.length === 1) {
    const f = fam[0], ks = carriers(p, c => f.cols.indexOf(c) > -1);
    s = 2.5; label = cap(f.name) + ' pop';
    if (ks.length >= 2) {
      s += 1; echo = { colour: f.name, slots: ks.slice(0, 2) };
      story = cap(f.name) + ' runs through the ' + nm(p[ks[0]]) + ' and the ' + nm(p[ks[1]]) + ', tying the fit together.';
    } else story = cap(f.name) + ' from the ' + nm(p[ks[0]]) + ' is the one pop; everything else stays neutral.';
  } else {
    const a = fam[0], b = fam[1], d = hueDist(a.h, b.h);
    if (fam.length >= 3) { s -= 2.5; label = 'Too many colours'; clash = [a.name, b.name]; story = cap(a.name) + ', ' + b.name + ' and ' + fam[2].name + ' are competing. Swap one piece for a neutral.'; }
    else if (d <= 60) { s += 1.5; label = 'Analogous'; story = cap(a.name) + ' and ' + b.name + ' sit next to each other on the colour wheel, so they blend.'; }
    else if (d >= 150) {
      if (b.w <= 1.3) { s += 1; label = 'Complementary accent'; story = 'The ' + b.name + ' accent makes the ' + a.name + ' pop.'; }
      else { s -= 0.5; label = 'Bold complementary'; story = cap(a.name) + ' and ' + b.name + ' are opposites. Bold, so keep the rest plain.'; }
    } else if (MUTED[a.name] || MUTED[b.name]) { s += 0.3; label = 'Earthy mix'; story = cap(a.name) + ' and ' + b.name + ' make a muted, earthy mix.'; }
    else if (b.w <= 0.8) { s -= 0.5; label = cap(a.name) + ' pop'; story = cap(a.name) + ' leads; the small ' + b.name + ' detail is fine.'; }
    else { s -= 2.5; label = 'Colour clash'; clash = [a.name, b.name]; story = cap(a.name) + ' and ' + b.name + ' clash. Swap one for a neutral.'; }
  }
  const tb = [p.top, p.bottom]; let nb = false;
  if (tb[0] && tb[1] && ((tb[0].colours[0] === 'navy' && tb[1].colours[0] === 'black') || (tb[0].colours[0] === 'black' && tb[1].colours[0] === 'navy'))) { s -= 1; nb = true; story += ' Navy right next to black can look like a mismatch.'; }
  const busy = ['top', 'layer', 'bottom'].filter(k => p[k] && p[k].pattern !== 'solid');
  const patternClash = busy.length > 1;
  if (patternClash) { s -= 3; story = 'Two patterns (the ' + nm(p[busy[0]]) + ' and the ' + nm(p[busy[1]]) + ') are fighting. Keep one and go plain on the other.'; label = 'Pattern clash'; }
  let tie = null;
  if (p.shoes && !echo) {
    const cl = {}; ['top', 'layer', 'bottom'].forEach(k => { if (p[k]) p[k].colours.forEach(c => { cl[c] = k; }); });
    const hit = p.shoes.colours.filter(c => cl[c])[0];
    if (hit) { s += 0.5; tie = { colour: hit, slot: cl[hit] }; }
  }
  const love = profile.love || [], avoid = profile.avoid || [];
  CATS.forEach(k => { const it = p[k]; if (!it) return; if (it.colours.some(c => avoid.indexOf(c) > -1)) s -= 3; if (it.colours.some(c => love.indexOf(c) > -1)) s += 0.4; });
  return { score: s, label, story, clash, echo, tie, patternClash, navyBlack: nb, swatches: pal.slice(0, 5).map(x => x[0]) };
}

/* ---------- silhouette ---------- */
const FITWORD = { 1: 'slim', 2: 'regular', 3: 'relaxed', 4: 'oversized' };
/** How the fits of the pieces balance each other. */
export function silhouette(p, vibe, profile) {
  profile = profile || {};
  if (!p.top || !p.bottom) return { score: 0, label: '', story: '' };
  const t = FV[p.top.fit] || 2, b = FV[p.bottom.fit] || 2, l = p.layer ? FV[p.layer.fit] || 2 : 0, up = Math.max(t, l);
  const all = CATS.map(k => p[k]).filter(Boolean), street = all.some(i => i.styles.indexOf('street') > -1 || i.styles.indexOf('sport') > -1);
  const dressy = vibe === 'Work' || vibe === 'Date night';
  let s = 0, label, story, bad = false;
  if (up >= 3 && b <= 2) { s += 1.5; label = 'Loose top, neat bottoms'; story = 'The ' + FITWORD[up] + ' top over ' + FITWORD[b] + ' bottoms keeps the shape balanced.'; }
  else if (up <= 2 && b >= 3) { s += street ? 1 : 0.6; label = 'Neat top, wide bottoms'; story = 'A neat top over ' + FITWORD[b] + ' bottoms gives a clean, modern shape.'; }
  else if (up >= 3 && b >= 3) {
    if (street && !dressy) { s += 0.5; label = 'Relaxed streetwear'; story = 'Relaxed on relaxed for an easy streetwear shape.'; }
    else { s -= dressy ? 2 : 1.2; bad = true; label = 'Baggy on baggy'; story = 'Baggy on baggy can swamp you. Try slimmer bottoms.'; }
  } else { s += dressy ? 1.5 : 0.8; label = 'Clean lines'; story = 'Fitted pieces keep the lines sharp.'; }
  if (p.layer && l < t - 1) { s -= 1.5; bad = true; story = 'The ' + nm(p.layer) + ' is slimmer than the ' + nm(p.top) + ', so it won’t sit well over it.'; label = 'Tight layer'; }
  if (FV[profile.fit]) { const pv = FV[profile.fit]; s -= 0.4 * Math.abs(up - pv) + 0.2 * Math.abs(b - pv); }
  return { score: s, label, story, bad };
}

/* ---------- engine bound to app state ---------- */
export function createEngine(S) {
  const byId = id => { for (let i = 0; i < S.items.length; i++) if (S.items[i].id === id) return S.items[i]; return null; };
  const resolve = ids => { const p = {}; CATS.forEach(k => { if (ids[k]) { const it = byId(ids[k]); if (it) p[k] = it; } }); return p; };
  const comboKey = c => CATS.map(k => c[k] || '-').join('|');
  const coreKey = c => [c.top, c.bottom, c.shoes].join('|');
  // a "look" is the top and bottoms together: the same pair with other shoes reads as the same style
  const lookKey = c => [c.top, c.bottom].join('|');

  function lastWornDays(id) {
    let best = Infinity; const now = today0().getTime();
    S.wear.forEach(w => { for (const k in w.items) if (w.items[k] === id) { const d = Math.round((now - new Date(w.date + 'T00:00').getTime()) / DAY); if (d >= 0 && d < best) best = d; } });
    return best;
  }
  function vibeOk(it, vibe) {
    if (vibe === 'Work') return it.formality >= 3 || (it.category === 'shoes' && it.formality >= 2) || it.category === 'extra';
    if (vibe === 'Date night') return it.formality >= 2 || it.styles.indexOf('street') > -1;
    if (vibe === 'Gym') return it.styles.indexOf('sport') > -1 || (it.category === 'bottom' && isShort(it)) || it.category === 'extra';
    return true;
  }

  /** Score a (possibly partial) combo of ids. partial=true skips rules that need every slot filled. */
  function score(ids, w, vibe, partial) {
    const p = resolve(ids), t = p.top, b = p.bottom, sh = p.shoes, l = p.layer, all = CATS.map(k => p[k]).filter(Boolean);
    let wx = 0, hard = 0; const notes = [], bd = band(w);
    if (bd === 'cold') {
      if (!partial && t && !(l && l.warmth >= 3) && t.warmth < 3) { hard++; wx -= 6; notes.push('nolayer'); }
      if (b && isShort(b)) { hard++; wx -= 6; notes.push('shorts'); }
    }
    if (bd === 'cool') { if (b && isShort(b)) { wx -= 2; notes.push('shortscool'); } if (!partial && w.min < 12 && !l) wx -= 2; if (l) wx += 1; }
    if (bd === 'mild') { if (l && w.min >= 14 && l.warmth >= 3) wx -= 1; if (b && isShort(b)) wx += 1; }
    if (bd === 'hot') { if (l) { hard++; wx -= 5; notes.push('hotlayer'); } if (t && t.warmth > 2) wx -= 3; if (b && isShort(b)) wx += 2; }
    if (w.rain >= 50 && sh) { if (sh.colours[0] === 'white' || sh.colours[0] === 'cream') { wx -= 2; notes.push('wetwhite'); } if (l) wx += 1; }
    const vOk = all.every(it => vibeOk(it, vibe));
    if (!vOk) { hard++; notes.push('vibe'); }
    const col = harmony(p, S.profile), shp = silhouette(p, vibe, S.profile);
    if (col.clash || col.patternClash) notes.push('colour');
    let s = wx + col.score * 1.2 + shp.score + (vOk ? 0 : -3) - hard * 8;
    all.forEach(it => {
      const d = lastWornDays(it.id);
      if (d <= 2) s -= 3; else if (d >= 30) s += 1.5;
      if (it.fav) s += 0.8;
      if (!it.owned) s -= 0.4;
      s += (S.fb.like[it.id] || 0) * 0.5 - (S.fb.skip[it.id] || 0) * 0.6;
    });
    if (!partial) {
      const key = comboKey(ids);
      S.wear.forEach(wr => { const dd = (today0() - new Date(wr.date + 'T00:00')) / DAY; if (dd <= 14 && comboKey(wr.items) === key) s -= 2; });
    }
    return { score: s, hard, notes, colour: col, shape: shp, wx };
  }

  /** Best outfits for a day and vibe. Beam search keeps it fast on big closets. */
  function candidates(opt) {
    opt = opt || {};
    const w = opt.weather, vibe = opt.vibe || 'Casual', lock = opt.lock || {}, withWish = !!opt.withWish, limit = opt.limit || 12;
    const exclude = opt.exclude || {}, legs = opt.bottoms; // legs: 'short' | 'long' | undefined
    const pool = k => {
      if (lock[k] !== undefined) return [lock[k]];
      const ids = S.items.filter(i => i.category === k && (i.owned || withWish) && !(k === 'bottom' && legs && (legs === 'short') !== isShort(i))).map(i => i.id);
      return k === 'layer' || k === 'extra' ? [null].concat(ids) : ids;
    };
    const P = {}; CATS.forEach(k => { P[k] = pool(k); });
    if (!P.top.length || !P.bottom.length || !P.shoes.length) return [];
    const BEAM = 60, PER_TOP = 8;
    // Keep the beam varied: one entry per core combo, and no single top hogging it.
    const grow = (beam, k, partial) => {
      const out = [];
      beam.forEach(c => P[k].forEach(id => { const n = Object.assign({}, c); n[k] = id; out.push({ ids: n, r: score(n, w, vibe, partial) }); }));
      out.sort((a, b) => b.r.score - a.r.score);
      const seen = {}, perTop = {}, keep = [];
      for (const x of out) {
        const ck = coreKey(x.ids), t = x.ids.top;
        if (seen[ck] || (perTop[t] || 0) >= PER_TOP) continue;
        seen[ck] = 1; perTop[t] = (perTop[t] || 0) + 1; keep.push(x.ids);
        if (keep.length >= BEAM) break;
      }
      return keep;
    };
    let beam = [{}];
    beam = grow(beam, 'top', true); beam = grow(beam, 'bottom', true); beam = grow(beam, 'shoes', true);
    beam = grow(beam, 'layer', false);
    const fin = [];
    beam.forEach(c => P.extra.forEach(x => { const n = Object.assign({}, c); n.extra = x; fin.push({ ids: n, r: score(n, w, vibe, false) }); }));
    fin.sort((a, b) => b.r.score - a.r.score);
    const best = {}, list = [];
    const key = opt.byLook ? lookKey : coreKey;
    fin.forEach(f => { const k = key(f.ids); if (!best[k] && !exclude[k]) { best[k] = 1; list.push(f); } });
    const anyClean = list.some(f => !f.r.hard);
    let pool2 = anyClean ? list.filter(f => !f.r.hard) : list;
    // "good only": no clashes and not far below the best look, so we never pad the list with weak fits
    if (opt.goodOnly && pool2.length) { const top = pool2[0].r.score; pool2 = pool2.filter(f => !f.r.hard && !f.r.colour.clash && !f.r.colour.patternClash && !f.r.colour.navyBlack && f.r.score >= top - 4); }
    const picked = [], seenTop = {}, seenBottom = {}, seenShoe = {};
    const rest = pool2.slice();
    while (picked.length < limit && rest.length) {
      let bi = 0, bv = -Infinity;
      rest.forEach((f, i) => { const v = f.r.score - (seenTop[f.ids.top] || 0) * 2.5 - (seenBottom[f.ids.bottom] || 0) * 1.2 - (seenShoe[f.ids.shoes] || 0) * 0.6; if (v > bv) { bv = v; bi = i; } });
      const f = rest.splice(bi, 1)[0];
      seenTop[f.ids.top] = (seenTop[f.ids.top] || 0) + 1; seenBottom[f.ids.bottom] = (seenBottom[f.ids.bottom] || 0) + 1; seenShoe[f.ids.shoes] = (seenShoe[f.ids.shoes] || 0) + 1;
      picked.push(f);
    }
    return picked.map(f => decorate({ items: stripNull(f.ids), score: f.r.score, notes: f.r.notes, relaxed: !!f.r.hard, w, vibe }, f.r));
  }
  const stripNull = ids => { const o = {}; CATS.forEach(k => { if (ids[k]) o[k] = ids[k]; }); return o; };

  function decorate(c, r) {
    r = r || score(c.items, c.w, c.vibe, false);
    c.notes = r.notes; c.colour = r.colour; c.shape = r.shape; c.score = r.score;
    c.wish = CATS.map(k => c.items[k]).filter(id => { const it = id && byId(id); return it && !it.owned; });
    c.name = nameFor(c); c.reason = reasonFor(c);
    return c;
  }

  function nameFor(c) {
    const key = comboKey(c.items);
    for (let i = 0; i < S.outfits.length; i++) if (comboKey(S.outfits[i].items) === key) return S.outfits[i].name;
    const p = resolve(c.items), t = p.top, col = t ? t.colours[0] : 'black', h = c.colour || harmony(p, S.profile);
    if (c.vibe === 'Braai') return 'Braai ' + (col === 'white' ? 'whites' : col);
    if (t && t.styles.indexOf('sport') > -1 && /jersey/i.test(t.sub + t.name)) return 'Matchday ' + col;
    if (/^Tonal/.test(h.label)) return h.label;
    if (col === 'white' && p.shoes && p.shoes.colours[0] === 'white') return 'Clean whites';
    if (/pop$/.test(h.label)) return h.label;
    const v = { Casual: 'easy', Work: 'desk day', 'Date night': 'night out', Gym: 'gym run' }[c.vibe] || 'easy';
    return cap(col) + ' ' + v;
  }

  function reasonFor(c) {
    const w = c.w, p = resolve(c.items), b = p.bottom, sh = p.shoes, l = p.layer, bd = band(w), n = c.notes || [];
    const col = c.colour || harmony(p, S.profile), shp = c.shape || silhouette(p, c.vibe, S.profile);
    if ((n.indexOf('shorts') > -1 || n.indexOf('shortscool') > -1) && !S.items.some(i => i.category === 'bottom' && i.owned && !isShort(i)))
      return 'Only ' + w.max + '° and no long pants in your closet yet, so the ' + nm(b) + ' it is. Worth adding jeans or chinos.';
    if (n.indexOf('vibe') > -1) return 'Closest match in your closet for ' + c.vibe.toLowerCase() + '. Add a smarter piece for more options.';
    let lead = '';
    if (bd === 'cold' && l) lead = 'Only ' + w.max + '°, so the ' + nm(l) + ' goes on top.';
    else if (w.rain >= 50 && sh) lead = w.rain + '% chance of rain' + (sh.colours[0] === 'white' ? ', so mind the puddles in the ' + nm(sh) + '.' : ', so darker shoes: the ' + nm(sh) + '.');
    else if (b && isShort(b) && (bd === 'mild' || bd === 'hot')) lead = w.max + '° and ' + cond(w).toLowerCase() + ', so the ' + nm(b) + ' work all day.';
    let colourLine = col.story;
    if (!lead && !col.echo && col.tie && sh && /pop$/.test(col.label) && !col.clash) {
      const acc = col.label.replace(/ pop$/, '').toLowerCase(), src = p[col.tie.slot];
      if (src.colours.indexOf(acc) > -1) colourLine = cap(acc) + ' from the ' + nm(src) + ' is the one pop, and the ' + nm(sh) + ' pick up its ' + col.tie.colour + '.';
    }
    const parts = [lead, colourLine];
    if (!lead && shp.story && (Math.abs(shp.score) >= 1.2 || shp.bad)) parts.push(shp.story);
    if (!lead && parts.length < 3 && !shp.bad) parts.push('Good for ' + w.max + '° and ' + cond(w).toLowerCase() + '.');
    return parts.filter(Boolean).slice(0, 2).join(' ');
  }

  /** Fit check for the Build screen: overall /10 plus colour, fit and weather bars. */
  function rate(ids, w, vibe) {
    const r = score(ids, w, vibe || 'Casual', false), p = resolve(ids);
    const colour = Math.round(clamp(6.2 + r.colour.score * 1.1, 1, 10));
    const fit = Math.round(clamp(6.5 + r.shape.score * 1.3, 1, 10));
    const weather = Math.round(clamp(9 + r.wx * 0.7, 1, 10));
    let overall = Math.round(colour * 0.4 + fit * 0.3 + weather * 0.3);
    if (r.notes.indexOf('vibe') > -1) overall = Math.min(overall, 6);
    let verdict;
    if (r.colour.patternClash || r.colour.clash) verdict = r.colour.story;
    else if (r.notes.indexOf('shorts') > -1) verdict = 'Only ' + w.max + '° today. Shorts will feel cold.';
    else if (r.notes.indexOf('nolayer') > -1) verdict = 'Only ' + w.max + '° today. Add a warm layer.';
    else if (r.notes.indexOf('hotlayer') > -1) verdict = w.max + '° is too hot for a layer. Lose the ' + nm(p.layer) + '.';
    else if (r.notes.indexOf('wetwhite') > -1) verdict = 'Rain is likely, so the white shoes might not survive. Try darker ones.';
    else if (r.shape.bad) verdict = r.shape.story;
    else if (overall >= 8) verdict = r.colour.story + ' ' + (r.shape.story || '');
    else verdict = r.colour.story + ' Tap Complete it for a stronger match.';
    return { overall: clamp(overall, 1, 10), colour, fit, weather, colourLabel: r.colour.label, fitLabel: r.shape.label, swatches: r.colour.swatches, verdict: verdict.trim() };
  }

  /** How well a (wishlist) item works with what you already own. */
  function compat(id, w) {
    const it = byId(id); if (!it) return null;
    const lock = {}; lock[it.category] = id;
    const cs = candidates({ weather: w, vibe: 'Casual', lock, limit: 20 });
    const good = cs.filter(c => !c.relaxed && !(c.notes.indexOf('colour') > -1));
    const partners = {};
    good.forEach(c => CATS.forEach(k => { const x = c.items[k]; if (x && x !== id) partners[x] = 1; }));
    const owned = S.items.filter(i => i.owned && i.category !== it.category && ['top', 'bottom', 'shoes', 'layer'].indexOf(i.category) > -1).length;
    const n = Object.keys(partners).length, fits = good.length;
    let verdict, level;
    if (!fits) { level = 'low'; verdict = 'Hard to wear with your closet right now. ' + (cs[0] && cs[0].colour.clash ? cap(cs[0].colour.story) : 'Add more basics first.'); }
    else if (fits >= 4 && n >= Math.min(4, owned)) { level = 'high'; verdict = 'Great buy: ' + fits + ' fits with ' + n + ' of your pieces.'; }
    else { level = 'mid'; verdict = 'Works in ' + fits + ' fit' + (fits > 1 ? 's' : '') + ' with ' + n + ' of your pieces.'; }
    return { fits, partners: n, level, verdict, best: good.slice(0, 3).length ? good.slice(0, 3) : cs.slice(0, 1) };
  }

  /** Which slot is holding the closet back: the one with the fewest pieces (for the given leg length). */
  function shortOf(legs) {
    const n = k => S.items.filter(i => i.owned && i.category === k && !(k === 'bottom' && legs && (legs === 'short') !== isShort(i))).length;
    return ['top', 'bottom', 'shoes'].map(k => [k, n(k)]).sort((a, b) => a[1] - b[1])[0][0];
  }

  return { byId, resolve, comboKey, coreKey, lookKey, lastWornDays, score, candidates, decorate, nameFor, reasonFor, rate, compat, shortOf };
}

/** Colours that go with a given colour, for "what goes with my red jersey?" */
export function pairsWith(c) {
  if (NEUTRAL[c]) return { safe: ['white', 'black', 'grey', 'denim', 'navy', 'beige'].filter(x => x !== c).slice(0, 4), accent: ['red', 'green', 'burgundy', 'olive'] };
  const h = HUE[c], acc = Object.keys(HUE).filter(x => x !== c);
  return {
    safe: ['black', 'white', 'grey', 'denim'].concat(h >= 180 && h < 320 ? ['navy'] : ['beige']),
    accent: acc.filter(x => { const d = hueDist(HUE[x], h); return (d <= 60 && d >= 20) || d >= 150; }).slice(0, 3)
  };
}

/* ---------- text -> tags (shop titles, typed kinds) ---------- */
const KINDS = [
  [/\b(hoodie|hoody|zip[- ]?up)\b/, 'layer', 'hoodie', 3, 1, ['casual', 'street']],
  [/\b(puffer|parka|down jacket)\b/, 'layer', 'puffer jacket', 4, 2, ['casual', 'street']],
  [/\b(blazer|sport coat|suit jacket)\b/, 'layer', 'blazer', 2, 4, ['smart', 'formal']],
  [/\b(trench|overcoat|coat)\b/, 'layer', 'coat', 4, 3, ['smart']],
  [/\b(bomber|windbreaker|track jacket|anorak|jacket|shacket|overshirt|gilet)\b/, 'layer', 'jacket', 3, 2, ['casual', 'street']],
  [/\b(cardigan)\b/, 'layer', 'cardigan', 3, 2, ['casual', 'smart']],
  [/\b(sweat ?shirt|crewneck|crew neck|jumper|sweater|knit|pullover)\b/, 'top', 'sweater', 3, 2, ['casual']],
  [/\b(jersey|football shirt|kit)\b/, 'top', 'football jersey', 1, 1, ['sport', 'street']],
  [/\b(polo)\b/, 'top', 'polo shirt', 1, 3, ['smart', 'casual']],
  [/\b(t-?shirt|tee|tank|vest|singlet|crop top)\b/, 'top', 't-shirt', 1, 1, ['casual']],
  [/\b(shirt|oxford|button[- ]?(down|up)|blouse)\b/, 'top', 'shirt', 1, 3, ['smart']],
  [/\b(shorts?|jorts)\b/, 'bottom', 'shorts', 1, 1, ['casual']],
  [/\b(jeans?|denim pants?)\b/, 'bottom', 'jeans', 2, 2, ['casual', 'street']],
  [/\b(chinos?|trousers?|slacks|suit pants?)\b/, 'bottom', 'trousers', 2, 4, ['smart']],
  [/\b(cargos?)\b/, 'bottom', 'cargo pants', 2, 1, ['street', 'casual']],
  [/\b(joggers?|sweat ?pants|track ?pants|trackies)\b/, 'bottom', 'joggers', 2, 1, ['sport', 'lounge']],
  [/\b(skirt)\b/, 'bottom', 'skirt', 1, 2, ['casual']],
  [/\b(leggings|tights)\b/, 'bottom', 'leggings', 2, 1, ['sport']],
  [/\b(pants)\b/, 'bottom', 'pants', 2, 2, ['casual']],
  [/\b(boots?|chelsea)\b/, 'shoes', 'boots', 3, 3, ['smart', 'street']],
  [/\b(loafers?|derby|brogues?|dress shoes?|heels?|pumps)\b/, 'shoes', 'dress shoes', 2, 4, ['smart', 'formal']],
  [/\b(slides?|sandals?|flip[- ]?flops?|crocs)\b/, 'shoes', 'slides', 1, 1, ['casual', 'lounge']],
  [/\b(sneakers?|trainers?|runners?|shoes?|kicks|air max|air force|jordans?|dunks?|samba|gazelle|shox)\b/, 'shoes', 'sneakers', 2, 2, ['street', 'casual']],
  [/\b(cap|hat|beanie|bucket)\b/, 'extra', 'cap', 1, 1, ['street', 'casual']],
  [/\b(bag|backpack|tote|sling|crossbody)\b/, 'extra', 'bag', 1, 2, ['casual']],
  [/\b(watch|chain|necklace|bracelet|ring|sunglasses|shades|belt|scarf|socks)\b/, 'extra', 'accessory', 1, 2, ['casual']],
  [/\b(top|bodysuit|camisole)\b/, 'top', 'top', 1, 2, ['casual']]
];
const COLOUR_WORDS = [
  [/\b(off[- ]?white|ecru|ivory|cream|bone|oat(meal)?)\b/, 'cream'],
  [/\b(olive|khaki green|military|army|sage|moss)\b/, 'olive'],
  [/\b(burgundy|maroon|wine|oxblood|bordeaux|plum)\b/, 'burgundy'],
  [/\b(navy|midnight)\b/, 'navy'],
  [/\b(denim|indigo|light wash|mid wash|dark wash|stonewash(ed)?)\b/, 'denim'],
  [/\b(white)\b/, 'white'],
  [/\b(black|jet|onyx|noir)\b/, 'black'],
  [/\b(charcoal|grey|gray|ash|heather|slate|graphite)\b/, 'grey'],
  [/\b(silver|metallic|chrome)\b/, 'silver'],
  [/\b(blue|cobalt|royal|sky|azure|teal|turquoise)\b/, 'blue'],
  [/\b(khaki|sand|stone|tan|camel|beige|taupe|nude|biscuit)\b/, 'beige'],
  [/\b(brown|chocolate|mocha|coffee|espresso|rust|cognac|chestnut)\b/, 'brown'],
  [/\b(green|emerald|forest|mint|lime)\b/, 'green'],
  [/\b(yellow|mustard|lemon|gold)\b/, 'yellow'],
  [/\b(orange|tangerine|peach|coral)\b/, 'orange'],
  [/\b(red|scarlet|crimson|cherry)\b/, 'red'],
  [/\b(pink|rose|blush|fuchsia|magenta)\b/, 'pink'],
  [/\b(purple|lilac|lavender|violet|mauve)\b/, 'purple']
];
const FIT_WORDS = [
  [/\b(oversized?|boxy|baggy|drop[- ]shoulder|wide[- ]leg|balloon)\b/, 'oversized'],
  [/\b(relaxed|loose|dad|skate|carpenter|wide)\b/, 'relaxed'],
  [/\b(slim|skinny|fitted|muscle|tapered|athletic|compression)\b/, 'slim'],
  [/\b(regular|classic|straight|standard)\b/, 'regular']
];
const PATTERN_WORDS = [
  [/\b(stripe[sd]?|pinstripe)\b/, 'striped'],
  [/\b(check(ed)?|plaid|gingham|tartan|houndstooth)\b/, 'check'],
  [/\b(floral|camo(uflage)?|leopard|animal|tie[- ]?dye|paisley|all[- ]?over print|aop)\b/, 'print'],
  [/\b(graphic|logo|printed|slogan|print)\b/, 'graphic']
];

/** Best-effort tags from a product title or typed kind. Only returns what it found. */
export function guessFromText(text) {
  const q = ' ' + String(text || '').toLowerCase().replace(/[’']/g, '') + ' ', out = {};
  for (const k of KINDS) if (k[0].test(q)) { out.category = k[1]; out.sub = k[2]; out.warmth = k[3]; out.formality = k[4]; out.styles = k[5].slice(); break; }
  const cols = []; let rest = q;
  for (const c of COLOUR_WORDS) if (c[0].test(rest)) { if (cols.indexOf(c[1]) < 0) cols.push(c[1]); rest = rest.replace(new RegExp(c[0].source, 'g'), ' '); }
  if (!cols.length && out.sub === 'jeans') cols.push('denim');
  if (cols.length) out.colours = cols.slice(0, 3);
  for (const f of FIT_WORDS) if (f[0].test(q)) { out.fit = f[1]; break; }
  for (const p of PATTERN_WORDS) if (p[0].test(q)) { out.pattern = p[1]; break; }
  return out;
}

/** Map an RGB colour to the nearest palette name (used by photo colour detection). */
export function nameRGB(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (mx + mn) / 2, d = mx - mn;
  const S = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1));
  let H = 0;
  if (d) { H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H = (H * 60 + 360) % 360; }
  if (L < 0.14) return 'black';
  if (S < 0.13 || (S < 0.2 && (L < 0.25 || L > 0.8))) return L > 0.84 ? 'white' : L > 0.6 ? 'silver' : L > 0.24 ? 'grey' : 'black';
  if (H >= 200 && H < 250) { if (L < 0.28) return 'navy'; if (S < 0.5 && L < 0.7) return 'denim'; return 'blue'; }
  if (H >= 15 && H < 50) {
    if (L > 0.82) return 'cream';
    if (S < 0.5 && L > 0.55) return 'beige';
    if (L < 0.36 || S < 0.45) return 'brown';
    return H < 40 ? 'orange' : 'yellow';
  }
  if (H >= 50 && H < 70) return L < 0.4 || S < 0.4 ? 'olive' : 'yellow';
  if (H >= 70 && H < 165) return L < 0.32 || S < 0.3 ? 'olive' : 'green';
  if (H >= 165 && H < 200) return L < 0.3 ? 'navy' : 'blue';
  if (H >= 250 && H < 295) return 'purple';
  if (H >= 295 && H < 340) return L < 0.32 ? 'burgundy' : 'pink';
  return L < 0.3 ? 'burgundy' : L > 0.72 ? 'pink' : 'red';
}
