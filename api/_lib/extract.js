/* Pull product details out of a shop page: JSON-LD first, then Open Graph / meta tags. */

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', trade: '™', reg: '®', copy: '©', hellip: '…' };
export function decode(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(+d))
    .replace(/&([a-z]+);/gi, (m, n) => (ENT[n.toLowerCase()] !== undefined ? ENT[n.toLowerCase()] : m))
    .replace(/\s+/g, ' ').trim();
}
const safeChar = n => { try { return String.fromCodePoint(n); } catch { return ''; } };
const stripTags = s => decode(String(s || '').replace(/<[^>]*>/g, ' '));

function attrs(tag) {
  const out = {}, re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m; while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  return out;
}

function metaMap(html) {
  const map = {}, re = /<meta\b[^>]*>/gi; let m;
  while ((m = re.exec(html))) {
    const a = attrs(m[0]), key = (a.property || a.name || a.itemprop || '').toLowerCase(), val = a.content;
    if (!key || val == null) continue;
    (map[key] = map[key] || []).push(decode(val));
  }
  return map;
}

function jsonLdBlocks(html) {
  const out = [], re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    let raw = m[1].trim().replace(/^<!--|-->$/g, '').replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, '');
    try { out.push(JSON.parse(raw)); } catch {
      try { out.push(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' ').replace(/,\s*([}\]])/g, '$1'))); } catch {}
    }
  }
  return out;
}

const hasType = (n, t) => { const x = n && n['@type']; return Array.isArray(x) ? x.some(y => String(y).toLowerCase() === t) : String(x || '').toLowerCase() === t; };
function findProduct(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 8) return null;
  if (Array.isArray(node)) { for (const n of node) { const f = findProduct(n, depth + 1); if (f) return f; } return null; }
  if (hasType(node, 'product') || hasType(node, 'productgroup')) return node;
  for (const k of ['@graph', 'mainEntity', 'itemListElement', 'item']) if (node[k]) { const f = findProduct(node[k], depth + 1); if (f) return f; }
  return null;
}

function imagesOf(v) {
  const out = [];
  const add = x => { if (!x) return; if (typeof x === 'string') out.push(x); else if (Array.isArray(x)) x.forEach(add); else if (typeof x === 'object') add(x.contentUrl || x.url || x.image); };
  add(v); return out;
}
function offerOf(o) {
  if (!o) return {};
  if (Array.isArray(o)) { for (const x of o) { const r = offerOf(x); if (r.price != null) return r; } return {}; }
  if (o.offers) { const r = offerOf(o.offers); if (r.price != null) return r; }
  const ps = Array.isArray(o.priceSpecification) ? o.priceSpecification[0] : o.priceSpecification;
  const price = o.price != null ? o.price : o.lowPrice != null ? o.lowPrice : ps && ps.price;
  return { price, currency: o.priceCurrency || (ps && ps.priceCurrency) };
}
const toPrice = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/[^\d.,]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };

function absolutise(list, base) {
  const seen = {}, out = [];
  for (let u of list) {
    if (!u || typeof u !== 'string') continue;
    u = decode(u).trim();
    if (/^data:|\.svg(\?|$)/i.test(u)) continue;
    if (u.startsWith('//')) u = 'https:' + u;
    let abs; try { abs = new URL(u, base).href; } catch { continue; }
    if (!/^https?:/.test(abs)) continue;
    const key = abs.replace(/[?#].*$/, '');
    if (seen[key]) continue; seen[key] = 1; out.push(abs);
    if (out.length >= 8) break;
  }
  return out;
}

export function extractProduct(html, pageUrl) {
  const meta = metaMap(html), m1 = k => (meta[k] ? meta[k][0] : '');
  let p = null;
  for (const b of jsonLdBlocks(html)) { p = findProduct(b); if (p) break; }
  const variant = p && hasType(p, 'productgroup') && Array.isArray(p.hasVariant) ? p.hasVariant[0] : null;
  const offer = offerOf(p && p.offers ? p : variant);
  const brand = p && (typeof p.brand === 'string' ? p.brand : p.brand && p.brand.name);
  const titleTag = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1];
  const name = decode((p && p.name) || m1('og:title') || m1('twitter:title') || stripTags(titleTag));
  const images = absolutise(
    imagesOf(p && p.image).concat(imagesOf(variant && variant.image), meta['og:image:secure_url'] || [], meta['og:image'] || [], meta['twitter:image'] || []),
    pageUrl);
  const price = toPrice(offer.price) ?? toPrice(m1('product:price:amount') || m1('og:price:amount'));
  const currency = (offer.currency || m1('product:price:currency') || m1('og:price:currency') || '').toUpperCase() || null;
  let site = m1('og:site_name');
  if (!site) { try { site = new URL(pageUrl).hostname.replace(/^www\./, ''); } catch { site = ''; } }
  return {
    name: name.slice(0, 140),
    brand: decode(brand || m1('product:brand') || '').slice(0, 60) || null,
    price, currency,
    colour: decode((p && (p.color || (variant && variant.color))) || m1('product:color') || '').slice(0, 40) || null,
    description: decode(stripTags((p && p.description) || m1('og:description') || m1('description'))).slice(0, 300) || null,
    images, site: decode(site).slice(0, 60), url: pageUrl
  };
}

/** Shopify's /products/<handle>.js JSON. Price is in cents. */
export function fromShopifyJs(j, pageUrl) {
  if (!j || !j.title) return null;
  const imgs = (j.images || []).concat(j.featured_image ? [j.featured_image] : []);
  return {
    name: decode(j.title).slice(0, 140), brand: j.vendor ? decode(j.vendor).slice(0, 60) : null,
    price: j.price != null ? Math.round(j.price) / 100 : null,
    images: absolutise(imgs.map(x => (typeof x === 'string' ? x : x && x.src)), pageUrl),
    colour: null, description: j.description ? stripTags(j.description).slice(0, 300) : null
  };
}
