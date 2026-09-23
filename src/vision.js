/* On-device photo work: load (EXIF-aware), cut out the item with a small AI model (U²-Net-p,
   run in the browser with onnxruntime-web), straighten it, crop it, read its colours and make a
   first guess at what it is. Falls back to a flat-background flood fill if the model can't load. */
import { nameRGB, cap, guessFromText } from './engine.js';

const VENDOR = new URL('../vendor/', import.meta.url).href;

export function loadImage(src) {
  return new Promise((res, rej) => {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { if (typeof src !== 'string') setTimeout(() => URL.revokeObjectURL(url), 0); res(im); };
    im.onerror = () => rej(new Error('Couldn’t read that photo'));
    im.src = url; // <img> applies the photo's EXIF rotation, so sideways iPhone shots come out upright
  });
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const ctx2d = cv => cv.getContext('2d', { willReadFrequently: true });
export function scaled(im, max) {
  const w0 = im.naturalWidth || im.width, h0 = im.naturalHeight || im.height, s = Math.min(1, max / Math.max(w0, h0));
  const cv = mk(w0 * s, h0 * s), c = cv.getContext('2d', { willReadFrequently: true });
  c.imageSmoothingQuality = 'high'; c.drawImage(im, 0, 0, cv.width, cv.height);
  return cv;
}
export const toBlob = (cv, type, q) => new Promise(res => cv.toBlob(b => res(b), type, q));

/* ---------- AI cut-out ---------- */
let sessP = null;
function session() {
  if (!sessP) sessP = (async () => {
    const ort = await import(VENDOR + 'ort/ort.wasm.min.mjs');
    ort.env.wasm.wasmPaths = VENDOR + 'ort/';
    ort.env.logLevel = 'error';
    ort.env.wasm.numThreads = 1; // no SharedArrayBuffer without cross-origin isolation
    const s = await ort.InferenceSession.create(VENDOR + 'models/u2netp.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all', logSeverityLevel: 3 });
    return { ort, s };
  })().catch(e => { sessP = null; throw e; });
  return sessP;
}
let clsP = null;
function classifier() {
  if (!clsP) clsP = session().then(({ ort }) => ort.InferenceSession.create(VENDOR + 'models/effnet-lite4-int8.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all', logSeverityLevel: 3 }).then(s => ({ ort, s })))
    .catch(e => { clsP = null; throw e; });
  return clsP;
}
/** Start downloading the models early (e.g. when the add sheet opens) so the first photo is quick. */
let ready = false;
export const warmUp = () => session().then(() => classifier()).then(() => (ready = true), () => false);
/** True once both models are downloaded and loaded. */
export const modelsReady = () => ready;

const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225], S = 320;
/** Soft foreground mask (0..1) at the canvas's size. */
async function aiMask(cv) {
  const { ort, s } = await session();
  const small = mk(S, S), sc = ctx2d(small);
  sc.fillStyle = '#fff'; sc.fillRect(0, 0, S, S); sc.drawImage(cv, 0, 0, S, S);
  const d = sc.getImageData(0, 0, S, S).data, n = S * S, x = new Float32Array(3 * n);
  let mx = 1; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, d[i], d[i + 1], d[i + 2]);
  for (let p = 0; p < n; p++) for (let ch = 0; ch < 3; ch++) x[ch * n + p] = (d[p * 4 + ch] / mx - MEAN[ch]) / STD[ch];
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', x, [1, 3, S, S]) });
  const m = out[s.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < n; i++) { if (m[i] < lo) lo = m[i]; if (m[i] > hi) hi = m[i]; }
  const mc = mk(S, S), mctx = ctx2d(mc), md = mctx.createImageData(S, S);
  for (let i = 0; i < n; i++) { const v = Math.round(255 * (m[i] - lo) / Math.max(1e-6, hi - lo)); md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = v; md.data[i * 4 + 3] = 255; }
  mctx.putImageData(md, 0, 0);
  const up = mk(cv.width, cv.height), uc = ctx2d(up);
  uc.imageSmoothingQuality = 'high'; uc.drawImage(mc, 0, 0, up.width, up.height);
  const ud = uc.getImageData(0, 0, up.width, up.height).data, mask = new Float32Array(up.width * up.height);
  for (let i = 0; i < mask.length; i++) mask[i] = ud[i * 4] / 255;
  return mask;
}

/* ---------- plain-background fallback ---------- */
function floodMask(cv) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data, px = [];
  for (let x = 0; x < w; x += 2) px.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 2) px.push(y * w, y * w + w - 1);
  const bins = {};
  px.forEach(p => { const i = p * 4, k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4); bins[k] = (bins[k] || 0) + 1; });
  const top = Object.keys(bins).sort((a, b) => bins[b] - bins[a])[0].split(',').map(v => +v * 16 + 8);
  const dist = i => Math.hypot(d[i] - top[0], d[i + 1] - top[1], d[i + 2] - top[2]);
  if (px.filter(p => dist(p * 4) < 42).length / px.length < 0.7) return null;
  const T = 38, bg = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0;
  const push = p => { if (!bg[p] && dist(p * 4) < T) { bg[p] = 1; q[qt++] = p; } };
  px.forEach(push);
  while (qh < qt) { const p = q[qh++], x = p % w; if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w); }
  const share = qt / (w * h);
  if (share < 0.08 || share > 0.93) return null;
  const mask = new Float32Array(w * h); for (let i = 0; i < mask.length; i++) mask[i] = bg[i] ? 0 : 1;
  return mask;
}

/* ---------- mask clean-up ---------- */
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
/* ---------- screenshots: keep the product photo, drop the app around it ---------- */
const PHONE_W = [640, 750, 828, 1080, 1125, 1170, 1179, 1242, 1284, 1290, 1320, 1440];
export function looksLikeScreenshot(im, type) {
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, r = h / w;
  return (r > 1.7 && (type === 'image/png' || PHONE_W.indexOf(w) > -1)) || (r > 2 && r < 2.35 && w >= 600);
}
/** Split the screen into horizontal bands at hard edges and return the most photo-like one. */
export function photoBand(cv) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data, step = Math.max(1, Math.round(w / 240));
  const px = (x, y) => (y * w + x) * 4;
  const edge = new Float32Array(h);
  for (let y = 1; y < h; y++) {
    let n = 0, c = 0;
    for (let x = 0; x < w; x += step) { const a = px(x, y), b = px(x, y - 1); c++; if (Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]) > 36) n++; }
    edge[y] = n / c;
  }
  const cuts = [0];
  for (let y = 2; y < h - 2; y++) if (edge[y] > 0.55 && edge[y] >= edge[y - 1] && edge[y] >= edge[y + 1] && y - cuts[cuts.length - 1] > h * 0.02) cuts.push(y);
  cuts.push(h);
  let best = null;
  for (let i = 0; i < cuts.length - 1; i++) {
    const y0 = cuts[i] + 2, y1 = cuts[i + 1] - 2, bh = y1 - y0;
    if (bh < h * 0.18) continue;
    // photos are colourful and busy; app chrome is one flat colour with a little text
    const bins = {}; let n = 0, sat = 0;
    for (let y = y0; y < y1; y += step * 2) for (let x = 0; x < w; x += step * 2) {
      const i4 = px(x, y), r = d[i4], g = d[i4 + 1], b = d[i4 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const k = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); bins[k] = (bins[k] || 0) + 1; n++; sat += mx ? (mx - mn) / mx : 0;
    }
    const flat = Math.max(...Object.values(bins)) / n, score = bh * (1.05 - flat) * (0.4 + sat / n);
    if (!best || score > best.score) best = { y0, y1, score, flat };
  }
  if (!best || best.flat > 0.9 || (best.y0 < h * 0.02 && best.y1 > h * 0.98)) return null;
  const out = mk(w, best.y1 - best.y0);
  out.getContext('2d').drawImage(cv, 0, best.y0, w, out.height, 0, 0, w, out.height);
  return out;
}

/** Remove UI cards and text blocks the cut-out picked up: bands of rows with dead-straight
    sides, filled edge to edge, mostly one flat colour. Garments never have those. */
export function dropBlocks(mask, cv) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data;
  const L = new Int32Array(h).fill(-1), R = new Int32Array(h).fill(-1), fill = new Float32Array(h);
  let rowsOn = 0;
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1, n = 0;
    for (let x = 0; x < w; x++) if (mask[y * w + x] >= 0.5) { if (l < 0) l = x; r = x; n++; }
    L[y] = l; R[y] = r; fill[y] = l < 0 ? 0 : n / (r - l + 1); if (l >= 0) rowsOn++;
  }
  const flatShare = (y0, y1, l, r) => {
    const bins = {}; let n = 0;
    for (let y = y0; y <= y1; y += 2) for (let x = l; x <= r; x += 3) { const i = (y * w + x) * 4, k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4); bins[k] = (bins[k] || 0) + 1; n++; }
    return n ? Math.max(...Object.values(bins)) / n : 0;
  };
  let removed = 0;
  for (let y = 0; y < h;) {
    if (L[y] < 0 || fill[y] < 0.96 || R[y] - L[y] < w * 0.2) { y++; continue; }
    let e = y;
    while (e + 1 < h && L[e + 1] >= 0 && fill[e + 1] >= 0.96 && Math.abs(L[e + 1] - L[y]) <= 2 && Math.abs(R[e + 1] - R[y]) <= 2) e++;
    const bh = e - y + 1;
    if (bh >= Math.max(10, h * 0.03) && bh < rowsOn * 0.7 && flatShare(y, e, L[y], R[y]) > 0.55) {
      // take the rounded corners with it
      let a = y, b = e;
      while (a > 0 && L[a - 1] >= L[y] - 1 && R[a - 1] <= R[y] + 1 && L[a - 1] >= 0 && y - a < h * 0.03) a--;
      while (b < h - 1 && L[b + 1] >= L[y] - 1 && R[b + 1] <= R[y] + 1 && L[b + 1] >= 0 && b - e < h * 0.03) b++;
      for (let yy = a; yy <= b; yy++) for (let x = L[y]; x <= R[y]; x++) mask[yy * w + x] = 0;
      removed += b - a + 1; y = b + 1;
    } else y = e + 1;
  }
  return removed;
}
/* Square min (grow=false) or max (grow=true) filter of radius r on a 0/1 image; outside counts as 0. */
function morph(src, w, h, r, grow) {
  const t = new Uint8Array(w * h), o = new Uint8Array(w * h), full = 2 * r + 1;
  const run = (get, set, n) => {
    const ps = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) ps[i + 1] = ps[i] + get(i);
    for (let i = 0; i < n; i++) { const c = ps[Math.min(n, i + r + 1)] - ps[Math.max(0, i - r)]; set(i, grow ? c > 0 : c === full); }
  };
  for (let y = 0; y < h; y++) run(x => src[y * w + x], (x, v) => { t[y * w + x] = v ? 1 : 0; }, w);
  for (let x = 0; x < w; x++) run(y => t[y * w + x], (y, v) => { o[y * w + x] = v ? 1 : 0; }, h);
  return o;
}
/** Label 4-connected blobs of a 0/1 image. */
function label(bin, w, h) {
  const lab = new Int32Array(w * h), sizes = [0], q = new Int32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (lab[p] || !bin[p]) continue;
    const id = sizes.length; let qh = 0, qt = 0; lab[p] = id; q[qt++] = p;
    while (qh < qt) {
      const c = q[qh++], x = c % w;
      if (x > 0 && bin[c - 1] && !lab[c - 1]) { lab[c - 1] = id; q[qt++] = c - 1; }
      if (x < w - 1 && bin[c + 1] && !lab[c + 1]) { lab[c + 1] = id; q[qt++] = c + 1; }
      if (c >= w && bin[c - w] && !lab[c - w]) { lab[c - w] = id; q[qt++] = c - w; }
      if (c < w * (h - 1) && bin[c + w] && !lab[c + w]) { lab[c + w] = id; q[qt++] = c + w; }
    }
    sizes.push(qt);
  }
  return { lab, sizes };
}
/**
 * Keep the garment (and a twin of similar size, like the second shoe); drop specks, text and
 * anything joined on by a hair-thin bridge. Returns how many pieces were kept.
 */
function keepMain(mask, w, h) {
  const r = Math.max(2, Math.round(Math.max(w, h) / 220));
  const bin = new Uint8Array(w * h); for (let i = 0; i < bin.length; i++) bin[i] = mask[i] >= 0.5 ? 1 : 0;
  let core = morph(morph(bin, w, h, r, false), w, h, r, true);
  let { lab, sizes } = label(core, w, h);
  if (sizes.length < 2) ({ lab, sizes } = label(core = bin, w, h));
  // weight blobs by size and closeness to the centre: the item is what the photo is of
  const cx = new Float64Array(sizes.length), cy = new Float64Array(sizes.length);
  for (let p = 0; p < w * h; p++) if (lab[p]) { cx[lab[p]] += p % w; cy[lab[p]] += (p / w) | 0; }
  const score = sizes.map((n, i) => { if (!i) return 0; const dx = cx[i] / n / w - 0.5, dy = cy[i] / n / h - 0.5; return n * (1.25 - Math.min(1, Math.hypot(dx, dy) * 1.6)); });
  const top = score.indexOf(Math.max(...score)), big = sizes[top];
  const keep = sizes.map((n, i) => i && (i === top || n >= big * 0.3));
  const kept = new Uint8Array(w * h); let comps = 0;
  keep.forEach(k => { if (k) comps++; });
  for (let p = 0; p < w * h; p++) if (keep[lab[p]]) kept[p] = 1;
  const zone = morph(kept, w, h, r + 2, true);
  for (let p = 0; p < w * h; p++) if (!zone[p]) mask[p] = 0;
  return comps;
}
function applyMask(cv, mask) {
  const w = cv.width, h = cv.height, out = mk(w, h), oc = ctx2d(out);
  oc.drawImage(cv, 0, 0);
  const id = oc.getImageData(0, 0, w, h), d = id.data;
  for (let p = 0; p < w * h; p++) d[p * 4 + 3] = Math.round(d[p * 4 + 3] * smooth(0.3, 0.7, mask[p]));
  oc.putImageData(id, 0, 0);
  return out;
}

/* ---------- straighten + crop ---------- */
function alphaPoints(cv, step) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data, pts = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4 + 3] > 128) pts.push(x, y);
  return pts;
}
/** Rotation (degrees, clockwise) that gives the tightest upright bounding box, searched within ±25°. */
export function straightenAngle(cv) {
  const step = Math.max(1, Math.round(Math.max(cv.width, cv.height) / 160)), pts = alphaPoints(cv, step);
  if (pts.length < 40) return 0;
  const area = deg => {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) { const x = pts[i] * c - pts[i + 1] * s, y = pts[i] * s + pts[i + 1] * c; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return (x1 - x0) * (y1 - y0);
  };
  let best = 0, ba = area(0);
  for (let a = -25; a <= 25; a += 1) { const v = area(a); if (v < ba) { ba = v; best = a; } }
  for (let a = best - 0.8; a <= best + 0.8; a += 0.2) { const v = area(a); if (v < ba) { ba = v; best = a; } }
  return Math.abs(best) >= 2.5 && ba < area(0) * 0.96 ? Math.round(best * 10) / 10 : 0;
}
export function rotate(cv, deg) {
  if (!deg) return cv;
  const r = deg * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  const out = mk(cv.width * c + cv.height * s, cv.width * s + cv.height * c), oc = out.getContext('2d');
  oc.imageSmoothingQuality = 'high';
  oc.translate(out.width / 2, out.height / 2); oc.rotate(r); oc.drawImage(cv, -cv.width / 2, -cv.height / 2);
  return out;
}
export function cropToContent(cv, padPct = 0.05) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return cv;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * padPct), out = mk(x1 - x0 + 1 + pad * 2, y1 - y0 + 1 + pad * 2);
  out.getContext('2d').drawImage(cv, x0, y0, x1 - x0 + 1, y1 - y0 + 1, pad, pad, x1 - x0 + 1, y1 - y0 + 1);
  return out;
}

/* ---------- colours + first guess ---------- */
export function detectColours(cv, hasAlpha) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data, counts = {};
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 6000)));
  let n = 0;
  const x0 = hasAlpha ? 0 : Math.floor(w * 0.22), x1 = hasAlpha ? w : Math.ceil(w * 0.78), y0 = hasAlpha ? 0 : Math.floor(h * 0.2), y1 = hasAlpha ? h : Math.ceil(h * 0.8);
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const i = (y * w + x) * 4; if (d[i + 3] < 220) continue;
    const c = nameRGB(d[i], d[i + 1], d[i + 2]); counts[c] = (counts[c] || 0) + 1; n++;
  }
  if (!n) return [];
  // Shaded white fabric reads as silver; if both show up, it's a white garment.
  if (counts.silver && counts.white) { counts.white += counts.silver; delete counts.silver; }
  return Object.keys(counts).filter(c => counts[c] / n >= 0.12).sort((a, b) => counts[b] - counts[a]).slice(0, 3);
}
/** Bold stripes: two colours alternating in regular runs across (or down) the garment. */
export function detectStripes(cv) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data;
  const scan = (n, len, at) => {
    let hits = 0, lines = 0;
    for (let k = 0.3; k <= 0.7; k += 0.05) {
      const names = [];
      for (let t = 0; t < len; t += 2) { const i = at(Math.floor(n * k), t); if (d[i + 3] > 200) names.push(nameRGB(d[i], d[i + 1], d[i + 2])); else names.push(null); }
      const runs = []; let cur = null, run = 0;
      for (const c of names) { if (c === cur) run++; else { if (cur && run * 2 >= len * 0.04) runs.push(cur); cur = c; run = 1; } }
      if (cur && run * 2 >= len * 0.04) runs.push(cur);
      const merged = runs.filter((c, i) => i === 0 || c !== runs[i - 1]);
      lines++; if (merged.length >= 5 && new Set(merged).size <= 3) hits++;
    }
    return hits / lines;
  };
  const across = scan(h, w, (y, x) => (y * w + x) * 4), down = scan(w, h, (x, y) => (y * w + x) * 4);
  return Math.max(across, down) >= 0.6;
}
/** Shape-based guess when no AI is connected: two similar blobs = shoes, a gap between legs = bottoms. */
export function guessKind(cv, comps) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data, a = (x, y) => d[(y * w + x) * 4 + 3] > 128;
  const aspect = w / h;
  if (comps >= 2 && aspect > 0.9) return { category: 'shoes', sub: 'sneakers', warmth: 2, formality: 2, styles: ['street', 'casual'] };
  // leg gap: centre column empty in the lower third while both sides are filled
  let gap = 0, rows = 0;
  for (let y = Math.floor(h * 0.7); y < h * 0.95; y += 2) {
    rows++;
    const cx = Math.floor(w / 2); let centre = 0, left = 0, right = 0;
    for (let x = cx - Math.floor(w * 0.04); x <= cx + Math.floor(w * 0.04); x++) if (a(x, y)) centre++;
    for (let x = Math.floor(w * 0.1); x < w * 0.4; x++) if (a(x, y)) left++;
    for (let x = Math.floor(w * 0.6); x < w * 0.9; x++) if (a(x, y)) right++;
    if (!centre && left > w * 0.05 && right > w * 0.05) gap++;
  }
  if (rows && gap / rows > 0.5) return aspect > 0.85 ? { category: 'bottom', sub: 'shorts', warmth: 1, formality: 1, styles: ['casual'] } : { category: 'bottom', sub: 'pants', warmth: 2, formality: 2, styles: ['casual'] };
  if (aspect > 1.6) return { category: 'shoes', sub: 'sneakers', warmth: 2, formality: 2, styles: ['street', 'casual'] };
  return { category: 'top', sub: 't-shirt', warmth: 1, formality: 1, styles: ['casual'], weak: true };
}
export const autoName = (colours, sub, pattern) => {
  let c = colours[0] || '';
  if (c === 'denim' && sub === 'jeans') c = colours[1] && colours[1] !== 'denim' ? colours[1] : 'blue';
  return (cap(c) + (pattern === 'striped' ? ' striped ' : ' ') + (sub || 'top')).replace(/\s+/g, ' ').trim();
};

/* ---------- what is it? ImageNet classes -> closet kinds (EfficientNet-Lite4, on the phone) ---------- */
const CLS = {
  610: ['top', 't-shirt', 1], 841: ['top', 'sweater', 1], 465: ['top', 't-shirt', 0.4], 887: ['top', 'top', 0.3], 614: ['top', 'top', 0.3],
  474: ['layer', 'cardigan', 1], 869: ['layer', 'coat', 1], 568: ['layer', 'coat', 1], 617: ['layer', 'coat', 0.6], 501: ['layer', 'coat', 0.5], 399: ['layer', 'coat', 0.4], 834: ['layer', 'blazer', 1], 652: ['layer', 'jacket', 0.8], 735: ['layer', 'jacket', 0.5],
  608: ['bottom', 'jeans', 1], 842: ['bottom', 'shorts', 1], 639: ['bottom', 'shorts', 0.4], 655: ['bottom', 'skirt', 1], 689: ['bottom', 'skirt', 0.8], 601: ['bottom', 'skirt', 0.5], 775: ['bottom', 'skirt', 0.5], 697: ['bottom', 'joggers', 0.8], 638: ['bottom', 'leggings', 0.6],
  770: ['shoes', 'sneakers', 1], 630: ['shoes', 'loafers', 0.9], 774: ['shoes', 'sandals', 1], 502: ['shoes', 'slides', 0.7], 514: ['shoes', 'boots', 1], 615: ['shoes', 'sneakers', 0.6], 788: ['shoes', 'sneakers', 0.8],
  806: ['extra', 'socks', 0.8], 836: ['extra', 'sunglasses', 1], 837: ['extra', 'sunglasses', 1], 515: ['extra', 'hat', 0.8], 808: ['extra', 'hat', 0.6], 439: ['extra', 'cap', 0.8], 433: ['extra', 'cap', 0.4], 452: ['extra', 'hat', 0.4], 793: ['extra', 'cap', 0.4],
  414: ['extra', 'backpack', 1], 748: ['extra', 'bag', 1], 636: ['extra', 'bag', 0.8], 893: ['extra', 'wallet', 0.8], 531: ['extra', 'watch', 1], 826: ['extra', 'watch', 0.5], 679: ['extra', 'chain', 1],
  457: ['extra', 'tie', 0.8], 906: ['extra', 'tie', 0.8], 451: ['extra', 'tie', 0.6], 824: ['extra', 'scarf', 1], 552: ['extra', 'scarf', 0.4], 464: ['extra', 'belt', 0.8], 658: ['extra', 'gloves', 0.6]
};
const DEFAULTS = { top: [1, 1, ['casual']], layer: [3, 2, ['casual']], bottom: [2, 2, ['casual']], shoes: [2, 2, ['casual', 'street']], extra: [1, 2, ['casual']] };
async function classify(cv) {
  const { ort, s } = await classifier();
  const N = 224, c = mk(N, N), x = ctx2d(c);
  x.fillStyle = '#fff'; x.fillRect(0, 0, N, N);
  const k = (N * 0.9) / Math.max(cv.width, cv.height), w = cv.width * k, h = cv.height * k;
  x.imageSmoothingQuality = 'high'; x.drawImage(cv, (N - w) / 2, (N - h) / 2, w, h);
  const d = x.getImageData(0, 0, N, N).data, f = new Float32Array(N * N * 3);
  for (let i = 0, j = 0; i < d.length; i += 4) { f[j++] = (d[i] - 127) / 128; f[j++] = (d[i + 1] - 127) / 128; f[j++] = (d[i + 2] - 127) / 128; }
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', f, [1, N, N, 3]) });
  return out[s.outputNames[0]].data;
}
function kindFrom(p) {
  const cat = {}, sub = {};
  for (const k in CLS) { const [c, sb, wt] = CLS[k], v = p[k] * wt; cat[c] = (cat[c] || 0) + v; sub[c + '|' + sb] = (sub[c + '|' + sb] || 0) + v; }
  const best = Object.keys(cat).sort((a, b) => cat[b] - cat[a])[0];
  const bs = Object.keys(sub).filter(k => k.indexOf(best + '|') === 0).sort((a, b) => sub[b] - sub[a])[0].split('|')[1];
  return { category: best, sub: bs, conf: cat[best], denim: p[608] > 0.3 };
}
/** How upright a garment outline looks: tops are widest across the shoulders and sleeves,
    bottoms have a straight waistband on top and a gap between the legs below. */
export function uprightScore(cv, category) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data, on = (x, y) => d[(y * w + x) * 4 + 3] > 128;
  const width = y => { let l = -1, r = -1; for (let x = 0; x < w; x += 2) if (on(x, y)) { if (l < 0) l = x; r = x; } return l < 0 ? 0 : (r - l) / w; };
  const band = (a, b) => { let m = 0, n = 0; for (let y = Math.floor(h * a); y < h * b; y += 3) { m += width(y); n++; } return n ? m / n : 0; };
  if (category === 'top' || category === 'layer') return band(0.1, 0.35) - band(0.7, 0.92);
  if (category === 'bottom') {
    let gap = 0, rows = 0;
    for (let y = Math.floor(h * 0.72); y < h * 0.95; y += 3) {
      rows++; let l = -1, r = -1; for (let x = 0; x < w; x += 2) if (on(x, y)) { if (l < 0) l = x; r = x; }
      if (l < 0) continue;
      let hole = false; for (let x = l + Math.floor((r - l) * 0.35); x < l + (r - l) * 0.65; x += 2) if (!on(x, y)) { hole = true; break; }
      if (hole) gap++;
    }
    let solid = 0, rt = 0;
    for (let y = Math.floor(h * 0.04); y < h * 0.16; y += 3) { rt++; let l = -1, r = -1, n = 0; for (let x = 0; x < w; x += 2) if (on(x, y)) { if (l < 0) l = x; r = x; n++; } if (l >= 0 && n * 2 >= (r - l) * 0.95) solid++; }
    return (rows ? gap / rows : 0) + (rt ? solid / rt : 0) * 0.5;
  }
  return 0;
}
/** Mirror symmetry of the outline: [left-right, top-bottom], each 0..1 (IoU with its flip). */
export function symmetry(cv) {
  const N = 64, c = mk(N, N), x = ctx2d(c);
  x.drawImage(cv, 0, 0, N, N);
  const d = x.getImageData(0, 0, N, N).data, on = (i, j) => d[(j * N + i) * 4 + 3] > 128;
  let lr = 0, tb = 0, u1 = 0, u2 = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = on(i, j), m = on(N - 1 - i, j), f = on(i, N - 1 - j);
    if (a && m) lr++; if (a || m) u1++; if (a && f) tb++; if (a || f) u2++;
  }
  return [u1 ? lr / u1 : 0, u2 ? tb / u2 : 0];
}
/** Quarter or half turn that makes a top or bottom stand upright (0 if it already does). */
export function uprightTurn(cv, category) {
  if (['top', 'layer', 'bottom'].indexOf(category) < 0) return 0;
  const [lr, tb] = symmetry(cv), bottom = category === 'bottom';
  if (tb > lr + 0.08) {
    // lying on its side: pick the quarter turn whose outline reads as upright
    const a = uprightScore(rotate(cv, 90), category), b = uprightScore(rotate(cv, -90), category);
    return Math.abs(a - b) > 0.05 ? (a > b ? 90 : -90) : 0;
  }
  const base = uprightScore(cv, category), flip = uprightScore(rotate(cv, 180), category);
  return flip - base > (bottom ? 0.35 : 0.2) ? 180 : 0;
}
/** Classifier first, the outline as a fallback and a sanity check. Also says whether the item looks sideways. */
async function identify(cv, comps) {
  const shape = guessKind(cv, comps);
  let k = null;
  try { k = kindFrom(await classify(cv)); } catch (e) { console.warn('Classifier unavailable:', e && e.message); }
  let turn = 0;
  if (k && k.conf < 0.45) {
    // a sideways photo confuses the classifier; see if a quarter turn makes it sure
    for (const deg of [90, -90]) {
      try { const r = kindFrom(await classify(rotate(cv, deg))); if (r.conf > Math.max(0.6, k.conf + 0.3)) { k = r; turn = deg; } } catch (e) {}
    }
  }
  let g;
  if (k && (k.conf >= 0.3 || (shape.weak && k.conf >= 0.12))) {
    g = { category: k.category, sub: k.sub };
    const aspect = turn ? cv.height / cv.width : cv.width / cv.height;
    if (g.sub === 'jeans' && aspect > 0.8) g.sub = 'shorts';
    if (shape.category === 'shoes' && comps >= 2 && g.category !== 'shoes' && k.conf < 0.6) g = { category: 'shoes', sub: 'sneakers' };
  } else g = { category: shape.category, sub: shape.sub };
  if (!turn && cv.width > 40) turn = uprightTurn(cv, g.category);
  const t = guessFromText(g.sub), def = DEFAULTS[g.category];
  return {
    category: g.category, sub: g.sub,
    warmth: t.category === g.category && t.warmth ? t.warmth : def[0], formality: t.category === g.category && t.formality ? t.formality : def[1],
    styles: t.category === g.category && t.styles ? t.styles : def[2].slice(), conf: k ? Math.round(k.conf * 100) / 100 : 0, turn, denim: !!(k && k.denim)
  };
}

/**
 * Photo -> { cut, orig, colours, guess, method, angle }.
 * cut: transparent PNG of just the item (null if it couldn't be separated); orig: cropped JPEG.
 */
export async function processPhoto(src, opt = {}) {
  const im = await loadImage(src);
  let base = scaled(im, 1100), screenshot = false;
  if (looksLikeScreenshot(im, src && src.type)) { const band = photoBand(base); if (band) { base = band; screenshot = true; } }
  let mask = null, method = 'none';
  const alphaEdge = (() => { const d = ctx2d(base).getImageData(0, 0, base.width, 1).data; let c = 0; for (let i = 3; i < d.length; i += 4) if (d[i] < 16) c++; return c / (d.length / 4) > 0.6; })();
  if (alphaEdge) { method = 'already'; }
  else {
    if (opt.ai !== false) { try { mask = await aiMask(base); method = 'ai'; } catch (e) { mask = null; console.warn('AI cut-out unavailable:', e && e.message); } }
    if (!mask) { mask = floodMask(base); if (mask) method = 'flat'; }
  }
  let cut = null, comps = 1, angle = 0;
  if (mask || alphaEdge) {
    let cv = alphaEdge ? base : null;
    if (mask) {
      dropBlocks(mask, base);
      comps = keepMain(mask, base.width, base.height);
      const cover = mask.reduce((s, v) => s + (v > 0.5 ? 1 : 0), 0) / mask.length;
      if (cover > 0.02 && cover < 0.97) cv = applyMask(base, mask);
    }
    if (cv) {
      angle = straightenAngle(cv);
      cut = cropToContent(rotate(cv, angle));
      cut = scaled(cut, 820);
    }
  }
  let orig = scaled(rotate(base, angle), 820);
  const guess = await identify(cut || orig, comps);
  if (guess.turn) { if (cut) cut = rotate(cut, guess.turn); orig = rotate(orig, guess.turn); angle += guess.turn; }
  const colours = cut ? detectColours(cut, true) : detectColours(orig, false);
  // faded denim reads as grey or blue by pixel colour alone; the classifier knows it's denim
  if (guess.denim) { const i = colours.findIndex(c => ['grey', 'blue', 'navy', 'silver', 'denim'].indexOf(c) > -1); const rest = colours.filter(c => c !== 'denim' && ['grey', 'blue', 'navy', 'silver'].indexOf(c) < 0); colours.length = 0; colours.push('denim', ...rest.slice(0, 2)); }
  delete guess.denim;
  guess.colours = colours;
  guess.pattern = cut && (guess.category === 'top' || guess.category === 'layer' || guess.category === 'bottom') && detectStripes(cut) ? 'striped' : 'solid';
  guess.name = autoName(colours, guess.sub, guess.pattern);
  const flat = mk(orig.width, orig.height), fc = flat.getContext('2d');
  fc.fillStyle = '#fff'; fc.fillRect(0, 0, flat.width, flat.height); fc.drawImage(orig, 0, 0);
  // screenshots keep the whole screen too, so the AI stylist can read the listing title
  const context = screenshot ? await toBlob(scaled(im, 1400), 'image/jpeg', 0.8) : null;
  return { cut: cut ? await toBlob(cut, 'image/png') : null, orig: await toBlob(flat, 'image/jpeg', 0.86), colours, guess, method, angle, screenshot, context };
}

/** Turn a stored photo 90° (the user's manual fix for sideways shots). */
export async function rotateBlob(blob, deg) {
  const im = await loadImage(blob), cv = scaled(im, 1400), out = rotate(cv, deg);
  return toBlob(out, blob.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
}

/** Small JPEG (white behind transparency) for the AI tagger. */
export async function forTagging(blob, max = 512) {
  const im = await loadImage(blob), cv = scaled(im, max), out = mk(cv.width, cv.height);
  const c = out.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height); c.drawImage(cv, 0, 0);
  return out.toDataURL('image/jpeg', 0.82);
}
