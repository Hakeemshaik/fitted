/* On-device photo work: load (EXIF-aware), cut out the item with a small AI model (U²-Net-p,
   run in the browser with onnxruntime-web), straighten it, crop it, read its colours and make a
   first guess at what it is. Falls back to a flat-background flood fill if the model can't load. */
import { nameRGB, cap } from './engine.js';

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
    ort.env.wasm.numThreads = 1; // no SharedArrayBuffer without cross-origin isolation
    const s = await ort.InferenceSession.create(VENDOR + 'models/u2netp.onnx', { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    return { ort, s };
  })().catch(e => { sessP = null; throw e; });
  return sessP;
}
/** Start downloading the model early (e.g. when the add sheet opens) so the first photo is quick. */
export const warmUp = () => session().then(() => true, () => false);

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
/** Keep the main object (and anything of similar size, e.g. the second shoe), drop specks. */
function keepMain(mask, w, h) {
  const lab = new Int32Array(w * h), sizes = [0], q = new Int32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (lab[p] || mask[p] < 0.5) continue;
    const id = sizes.length; let qh = 0, qt = 0, n = 0; lab[p] = id; q[qt++] = p;
    while (qh < qt) {
      const c = q[qh++], x = c % w; n++;
      const nb = [x > 0 ? c - 1 : -1, x < w - 1 ? c + 1 : -1, c >= w ? c - w : -1, c < w * (h - 1) ? c + w : -1];
      for (const v of nb) if (v >= 0 && !lab[v] && mask[v] >= 0.5) { lab[v] = id; q[qt++] = v; }
    }
    sizes.push(n);
  }
  const big = Math.max(...sizes), keep = sizes.map(s => s >= big * 0.18), comps = sizes.filter((s, i) => i && keep[i]).length;
  for (let p = 0; p < w * h; p++) if (mask[p] >= 0.5 ? !keep[lab[p]] : false) mask[p] = 0;
  // soft pixels far from a kept object are halo, not garment
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
  return { category: 'top', sub: 't-shirt', warmth: 1, formality: 1, styles: ['casual'] };
}
export const autoName = (colours, sub) => (cap(colours[0] || '') + ' ' + (sub || 'top')).trim();

/**
 * Photo -> { cut, orig, colours, guess, method, angle }.
 * cut: transparent PNG of just the item (null if it couldn't be separated); orig: cropped JPEG.
 */
export async function processPhoto(src, opt = {}) {
  const im = await loadImage(src);
  let base = scaled(im, 1100);
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
      comps = keepMain(mask, base.width, base.height);
      const cover = mask.reduce((s, v) => s + (v > 0.5 ? 1 : 0), 0) / mask.length;
      if (cover > 0.03 && cover < 0.97) cv = applyMask(base, mask);
    }
    if (cv) {
      angle = straightenAngle(cv);
      cut = cropToContent(rotate(cv, angle));
      cut = scaled(cut, 820);
    }
  }
  const orig = scaled(rotate(base, angle), 820);
  const colours = cut ? detectColours(cut, true) : detectColours(orig, false);
  const guess = guessKind(cut || orig, comps);
  guess.colours = colours;
  guess.name = autoName(colours, guess.sub);
  const flat = mk(orig.width, orig.height), fc = flat.getContext('2d');
  fc.fillStyle = '#fff'; fc.fillRect(0, 0, flat.width, flat.height); fc.drawImage(orig, 0, 0);
  return { cut: cut ? await toBlob(cut, 'image/png') : null, orig: await toBlob(flat, 'image/jpeg', 0.86), colours, guess, method, angle };
}

/** Turn a stored photo 90° (the user's manual fix for sideways shots). */
export async function rotateBlob(blob, deg) {
  const im = await loadImage(blob), cv = scaled(im, 1400), out = rotate(cv, deg);
  return toBlob(out, blob.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
}

/** Small JPEG (white behind transparency) for the AI tagger. */
export async function forTagging(blob) {
  const im = await loadImage(blob), cv = scaled(im, 512), out = mk(cv.width, cv.height);
  const c = out.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height); c.drawImage(cv, 0, 0);
  return out.toDataURL('image/jpeg', 0.82);
}
