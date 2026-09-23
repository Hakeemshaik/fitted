import { safeFetch, queryParam, HttpError } from './_lib/http.js';

const OK = /^image\/(jpeg|jpg|png|webp|gif|avif)$/;
const sniff = b =>
  b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' :
  b[0] === 0x89 && b[1] === 0x50 ? 'image/png' :
  b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' ? 'image/webp' :
  b.slice(0, 3).toString() === 'GIF' ? 'image/gif' :
  b.slice(4, 12).toString().startsWith('ftypavi') ? 'image/avif' : null;

/** GET /api/img?url=<image> — same-origin copy of a shop image so the app can read its pixels. */
export default async function handler(req, res) {
  try {
    const link = queryParam(req, 'url');
    if (!link) throw new HttpError(400, 'Missing image link');
    const { res: r, buf } = await safeFetch(link, { accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.5', maxBytes: 8_000_000, timeout: 9000 });
    if (!r.ok) throw new HttpError(502, 'Image not available');
    const type = sniff(buf) || (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!OK.test(type)) throw new HttpError(415, 'That link isn’t a photo');
    res.statusCode = 200;
    res.setHeader('content-type', type);
    res.setHeader('cache-control', 'public, max-age=86400, s-maxage=604800');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('content-security-policy', "default-src 'none'");
    res.end(buf);
  } catch (e) {
    res.statusCode = e.status || 502;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(e.expose ? e.message : 'Image not available');
  }
}
