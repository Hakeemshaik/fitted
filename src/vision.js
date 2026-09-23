/* On-device photo work: load, scale, cut out a plain background, crop to the item, detect colours. */
import { nameRGB } from './engine.js';

export function loadImage(src) {
  return new Promise((res, rej) => {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const im = new Image();
    im.onload = () => { if (typeof src !== 'string') setTimeout(() => URL.revokeObjectURL(url), 0); res(im); };
    im.onerror = () => rej(new Error('Couldn’t read that photo'));
    im.src = url;
  });
}

export function scaled(im, max) {
  const w0 = im.naturalWidth || im.width, h0 = im.naturalHeight || im.height, s = Math.min(1, max / Math.max(w0, h0));
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w0 * s)); cv.height = Math.max(1, Math.round(h0 * s));
  cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  return cv;
}

const ctx2d = cv => cv.getContext('2d', { willReadFrequently: true });

function borderStats(d, w, h) {
  let n = 0, clear = 0; const px = [];
  const take = (x, y) => { const i = (y * w + x) * 4; n++; if (d[i + 3] < 16) clear++; else px.push(i); };
  for (let x = 0; x < w; x += 2) { take(x, 0); take(x, 1); take(x, h - 1); take(x, h - 2); }
  for (let y = 2; y < h - 2; y += 2) { take(0, y); take(1, y); take(w - 1, y); take(w - 2, y); }
  return { n, clear, px };
}

/** Flood-fill the background in from the edges when it is a plain colour. Returns null when it isn't. */
export function cutout(cv) {
  const w = cv.width, h = cv.height, c = ctx2d(cv), id = c.getImageData(0, 0, w, h), d = id.data;
  const b = borderStats(d, w, h);
  if (b.clear / b.n > 0.6) return { canvas: cv, already: true };
  // Most common border colour (coarse bins), then how much of the border matches it.
  const bins = {};
  b.px.forEach(i => { const k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4); bins[k] = (bins[k] || 0) + 1; });
  const top = Object.keys(bins).sort((x, y) => bins[y] - bins[x])[0].split(',').map(Number);
  let r = 0, g = 0, bl = 0, m = 0;
  b.px.forEach(i => { if (Math.abs((d[i] >> 4) - top[0]) <= 1 && Math.abs((d[i + 1] >> 4) - top[1]) <= 1 && Math.abs((d[i + 2] >> 4) - top[2]) <= 1) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; m++; } });
  if (!m) return null;
  r /= m; g /= m; bl /= m;
  let near = 0, varSum = 0;
  b.px.forEach(i => { const dd = Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - bl); if (dd < 40) { near++; varSum += dd; } });
  if (near / b.px.length < 0.7) return null;
  const T = Math.max(26, Math.min(48, 22 + (varSum / Math.max(1, near)) * 2.2));
  const dist = i => Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - bl);
  const bg = new Uint8Array(w * h), q = new Int32Array(w * h); let qh = 0, qt = 0;
  const push = p => { if (!bg[p] && dist(p * 4) < T) { bg[p] = 1; q[qt++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (qh < qt) {
    const p = q[qh++], x = p % w;
    if (x > 0) push(p - 1); if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w);
  }
  const share = qt / (w * h);
  if (share < 0.08 || share > 0.93) return null;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (bg[p]) { d[i + 3] = 0; continue; }
    const x = p % w;
    const edge = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (p >= w && bg[p - w]) || (p < w * (h - 1) && bg[p + w]);
    if (edge) d[i + 3] = Math.round(255 * Math.max(0.25, Math.min(1, (dist(i) - T * 0.5) / (T * 0.9))));
  }
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  out.getContext('2d').putImageData(id, 0, 0);
  return { canvas: out, share };
}

/** Crop to the visible item (alpha) with a little padding, so every piece lines up the same. */
export function cropToContent(cv, padPct = 0.04) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return cv;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * padPct);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Up to 3 palette names that cover at least 12% of the item. */
export function detectColours(cv, hasAlpha) {
  const w = cv.width, h = cv.height, d = ctx2d(cv).getImageData(0, 0, w, h).data, counts = {};
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 5000)));
  let n = 0;
  const x0 = hasAlpha ? 0 : Math.floor(w * 0.22), x1 = hasAlpha ? w : Math.ceil(w * 0.78), y0 = hasAlpha ? 0 : Math.floor(h * 0.2), y1 = hasAlpha ? h : Math.ceil(h * 0.8);
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const i = (y * w + x) * 4; if (d[i + 3] < 200) continue;
    const c = nameRGB(d[i], d[i + 1], d[i + 2]); counts[c] = (counts[c] || 0) + 1; n++;
  }
  if (!n) return [];
  if (counts.silver && counts.white) { counts.white += counts.silver * 0.5; }
  return Object.keys(counts).filter(c => counts[c] / n >= 0.12).sort((a, b) => counts[b] - counts[a]).slice(0, 3);
}

export const toBlob = (cv, type, q) => new Promise(res => cv.toBlob(b => res(b), type, q));

/** Photo -> cut-out (if possible) + original, both cropped and sized for storage, plus detected colours. */
export async function processPhoto(src) {
  const im = await loadImage(src);
  const base = scaled(im, 900);
  const cut = cutout(base);
  let cutCv = null;
  if (cut) cutCv = cut.already ? cropToContent(base) : cropToContent(cut.canvas);
  const orig = scaled(base, 720);
  const fin = cutCv ? scaled(cutCv, 720) : null;
  const colours = fin ? detectColours(fin, true) : detectColours(orig, false);
  const cutBlob = fin ? await toBlob(fin, 'image/png') : null;
  const flat = document.createElement('canvas'); flat.width = orig.width; flat.height = orig.height;
  const fc = flat.getContext('2d'); fc.fillStyle = '#fff'; fc.fillRect(0, 0, flat.width, flat.height); fc.drawImage(orig, 0, 0);
  const origBlob = await toBlob(flat, 'image/jpeg', 0.86);
  return { cut: cutBlob, orig: origBlob, colours, alreadyCut: !!(cut && cut.already) };
}

/** Small JPEG (white behind transparency) for the AI tagger. */
export async function forTagging(blob) {
  const im = await loadImage(blob), cv = scaled(im, 512), out = document.createElement('canvas');
  out.width = cv.width; out.height = cv.height;
  const c = out.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height); c.drawImage(cv, 0, 0);
  return out.toDataURL('image/jpeg', 0.82);
}
