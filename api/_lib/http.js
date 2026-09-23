import dns from 'node:dns/promises';
import net from 'node:net';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; this.expose = true; }
}

export function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  for (const k in headers || {}) res.setHeader(k, headers[k]);
  res.end(JSON.stringify(body));
}

export function queryParam(req, name) {
  if (req.query && typeof req.query[name] === 'string') return req.query[name];
  return new URL(req.url || '/', 'http://localhost').searchParams.get(name);
}

export async function readJson(req, limit = 2_000_000) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) throw new HttpError(413, 'That request is too big'); chunks.push(c); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

/* ---------- SSRF guard: only fetch public internet addresses ---------- */
function v4Private(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(x => !(x >= 0 && x <= 255))) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0 && p[2] === 0) || (a === 198 && (b === 18 || b === 19));
}
export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return v4Private(ip);
  if (!net.isIPv6(ip)) return true;
  const s = ip.toLowerCase();
  const mapped = /^(?:0*:)*:?ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s) || /^64:ff9b::(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (mapped) return v4Private(mapped[1]);
  return s === '::' || s === '::1' || /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || /^ff/.test(s);
}

export async function assertPublicUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new HttpError(400, 'That doesn’t look like a link'); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new HttpError(400, 'Only web links (http or https) work');
  if (url.username || url.password) throw new HttpError(400, 'Links with a login in them aren’t supported');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || /\.(local|localhost|internal|lan|home)$/.test(host)) throw new HttpError(400, 'That address isn’t on the public internet');
  let addrs;
  if (net.isIP(host)) addrs = [host];
  else {
    try { addrs = (await dns.lookup(host, { all: true, verbatim: true })).map(a => a.address); }
    catch { throw new HttpError(400, 'Couldn’t find that website'); }
  }
  if (!addrs.length || addrs.some(isPrivateIp)) throw new HttpError(400, 'That address isn’t on the public internet');
  return url;
}

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

/** fetch() that re-checks every redirect hop and caps body size and time. */
export async function safeFetch(input, opt = {}) {
  const maxBytes = opt.maxBytes || 3_000_000, deadline = Date.now() + (opt.timeout || 9000);
  let url = await assertPublicUrl(input);
  for (let hop = 0; hop < 6; hop++) {
    const left = deadline - Date.now();
    if (left <= 0) throw new HttpError(504, 'The shop took too long to answer');
    let res;
    try {
      res = await fetch(url, {
        redirect: 'manual', signal: AbortSignal.timeout(left),
        headers: { 'user-agent': UA, accept: opt.accept || '*/*', 'accept-language': 'en-ZA,en;q=0.9' }
      });
    } catch (e) {
      throw new HttpError(e && e.name === 'TimeoutError' ? 504 : 502, e && e.name === 'TimeoutError' ? 'The shop took too long to answer' : 'Couldn’t reach that shop');
    }
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc) {
      try { await res.body?.cancel(); } catch {}
      url = await assertPublicUrl(new URL(loc, url).href);
      continue;
    }
    const chunks = []; let n = 0;
    if (res.body) {
      for await (const c of res.body) {
        n += c.length;
        if (n > maxBytes) { try { await res.body.cancel(); } catch {} throw new HttpError(413, 'That page is too big to read'); }
        chunks.push(c);
      }
    }
    return { res, url, buf: Buffer.concat(chunks.map(c => Buffer.from(c))) };
  }
  throw new HttpError(508, 'Too many redirects');
}
