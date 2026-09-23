import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';

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
/** IPv6 text -> 8 16-bit groups (handles ::, embedded dotted IPv4 and zone ids), or null. */
function v6Groups(ip) {
  let s = ip.toLowerCase().replace(/%.*$/, '');
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (dotted) { const p = dotted[1].split('.').map(Number); s = s.slice(0, -dotted[1].length) + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16); }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [], tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const g = head.concat(Array(fill).fill('0'), tail).map(x => parseInt(x || '0', 16));
  return g.length === 8 && g.every(x => x >= 0 && x <= 0xffff) ? g : null;
}
const v4Of = (hi, lo) => [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) return v4Private(ip);
  if (!net.isIPv6(ip)) return true;
  const g = v6Groups(ip);
  if (!g) return true;
  const zero = n => g.slice(0, n).every(x => x === 0);
  if (zero(8) || (zero(7) && g[7] === 1)) return true;                          // :: and ::1
  if (zero(5) && g[5] === 0xffff) return v4Private(v4Of(g[6], g[7]));          // ::ffff:a.b.c.d (any spelling)
  if (zero(6)) return v4Private(v4Of(g[6], g[7]));                              // ::a.b.c.d (IPv4-compatible)
  if (g[0] === 0x64 && g[1] === 0xff9b) return g[2] || g[3] || g[4] || g[5] ? true : v4Private(v4Of(g[6], g[7])); // NAT64
  if (g[0] === 0x2002) return v4Private(v4Of(g[1], g[2]));                      // 6to4 carries an IPv4
  if (g[0] === 0x2001 && (g[1] === 0 || g[1] === 0xdb8)) return true;           // Teredo, documentation
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true;  // 100::/64 discard
  return (g[0] & 0xfe00) === 0xfc00 || (g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0 || (g[0] & 0xff00) === 0xff00;
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

/** DNS lookup that refuses private answers, so the address we checked is the one we connect to
    (a second, different DNS answer can't smuggle the request to an internal host). */
function publicLookup(hostname, opts, cb) {
  dns.lookup(hostname, { all: true, verbatim: true }).then(list => {
    const ok = list.filter(a => !isPrivateIp(a.address));
    if (!ok.length || ok.length !== list.length) return cb(new HttpError(400, 'That address isn’t on the public internet'));
    if (opts && opts.all) cb(null, ok); else cb(null, ok[0].address, ok[0].family);
  }, () => cb(new HttpError(400, 'Couldn’t find that website')));
}
function request(url, opt, ms) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, { method: 'GET', lookup: publicLookup, timeout: ms, headers: opt.headers }, resolve);
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { name: 'TimeoutError' })));
    req.on('error', reject);
    req.end();
  });
}
function decoded(res) {
  const enc = String(res.headers['content-encoding'] || '').toLowerCase();
  if (enc === 'gzip' || enc === 'x-gzip') return res.pipe(zlib.createGunzip());
  if (enc === 'deflate') return res.pipe(zlib.createInflate());
  if (enc === 'br') return res.pipe(zlib.createBrotliDecompress());
  return res;
}

/** GET that re-checks every redirect hop, pins DNS to public addresses, and caps body size and time. */
export async function safeFetch(input, opt = {}) {
  const maxBytes = opt.maxBytes || 3_000_000, deadline = Date.now() + (opt.timeout || 9000);
  let url = await assertPublicUrl(input);
  for (let hop = 0; hop < 6; hop++) {
    const left = deadline - Date.now();
    if (left <= 0) throw new HttpError(504, 'The shop took too long to answer');
    let raw;
    try {
      raw = await request(url, { headers: { 'user-agent': UA, accept: opt.accept || '*/*', 'accept-language': 'en-ZA,en;q=0.9', 'accept-encoding': 'gzip, deflate, br' } }, left);
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(e && e.name === 'TimeoutError' ? 504 : 502, e && e.name === 'TimeoutError' ? 'The shop took too long to answer' : 'Couldn’t reach that shop');
    }
    const status = raw.statusCode || 0, loc = raw.headers.location;
    const res = { status, ok: status >= 200 && status < 300, headers: { get: k => { const v = raw.headers[String(k).toLowerCase()]; return v == null ? null : Array.isArray(v) ? v.join(', ') : String(v); } } };
    if (status >= 300 && status < 400 && loc) {
      raw.resume();
      url = await assertPublicUrl(new URL(loc, url).href);
      continue;
    }
    const chunks = []; let n = 0;
    const timer = setTimeout(() => raw.destroy(Object.assign(new Error('timeout'), { name: 'TimeoutError' })), Math.max(1, deadline - Date.now()));
    try {
      for await (const c of decoded(raw)) {
        n += c.length;
        if (n > maxBytes) { raw.destroy(); throw new HttpError(413, 'That page is too big to read'); }
        chunks.push(c);
      }
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(e && e.name === 'TimeoutError' ? 504 : 502, e && e.name === 'TimeoutError' ? 'The shop took too long to answer' : 'Couldn’t read that shop page');
    } finally { clearTimeout(timer); }
    return { res, url, buf: Buffer.concat(chunks) };
  }
  throw new HttpError(508, 'Too many redirects');
}
