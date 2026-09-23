import { safeFetch, send, queryParam, HttpError } from './_lib/http.js';
import { extractProduct, fromShopifyJs } from './_lib/extract.js';

/** GET /api/product?url=<shop link> -> { name, brand, price, currency, images, colour, site, url } */
export default async function handler(req, res) {
  const link = (queryParam(req, 'url') || '').trim();
  if (!link) return send(res, 400, { error: 'Paste a link to a product page' });
  try {
    const { res: r, url, buf } = await safeFetch(link, { accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', maxBytes: 4_000_000, timeout: 9000 });
    if (r.status === 403 || r.status === 429 || r.status === 503) throw new HttpError(422, 'That shop blocks link imports. Save a screenshot of the item and add it from Photos instead.');
    if (r.status === 404) throw new HttpError(422, 'That page doesn’t exist any more.');
    if (!r.ok) throw new HttpError(422, 'The shop answered with an error (' + r.status + ').');
    const p = extractProduct(buf.toString('utf8'), url.href);
    if (/\/products\/[^/?#]+/.test(url.pathname) && (!p.images.length || !p.price || !p.name)) {
      try {
        const js = new URL(url.href); js.pathname = js.pathname.replace(/\/$/, '') + '.js'; js.search = '';
        const s = await safeFetch(js.href, { accept: 'application/json', maxBytes: 2_000_000, timeout: 5000 });
        if (s.res.ok) {
          const sp = fromShopifyJs(JSON.parse(s.buf.toString('utf8')), url.href);
          if (sp) { p.name = p.name || sp.name; p.brand = p.brand || sp.brand; p.price = p.price || sp.price; p.images = p.images.concat(sp.images.filter(i => p.images.indexOf(i) < 0)).slice(0, 8); p.description = p.description || sp.description; }
        }
      } catch {}
    }
    if (!p.images.length && !p.name) throw new HttpError(422, 'Couldn’t find a product on that page. Try the link to the item itself.');
    send(res, 200, p, { 'cache-control': 'public, s-maxage=3600, max-age=0' });
  } catch (e) {
    send(res, e.status || 502, { error: e.expose ? e.message : 'Couldn’t read that shop page' });
  }
}
