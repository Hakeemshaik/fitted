/* Request guard for every API route: honeypot blocklist, scanner user-agents, same-origin
   check for writes, and a per-IP rate limit. State lives in this function instance's memory,
   so it's a speed bump, not a wall — pair it with Vercel's Firewall for real volume. */
import { send } from './http.js';

const hits = new Map();      // ip -> [timestamps]
const blocked = new Map();   // ip -> blocked-until
const TRAP_COOKIE = 'fz_t';
const SCANNERS = /sqlmap|nikto|nmap|masscan|zgrab|nuclei|acunetix|wpscan|dirbuster|gobuster|ffuf|feroxbuster|hydra|jaeles|httpx-toolkit|burpcollaborator|netsparker|openvas|whatweb/i;

export function clientIp(req) {
  const h = req.headers || {};
  return String(h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || (req.socket && req.socket.remoteAddress) || 'unknown').trim();
}
export function flagIp(ip, ms = 24 * 3600e3) { blocked.set(ip, Date.now() + ms); if (blocked.size > 5000) blocked.delete(blocked.keys().next().value); }
export const trapCookie = () => TRAP_COOKIE + '=1; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Strict';

function sameOrigin(req) {
  const h = req.headers || {}, host = String(h['x-forwarded-host'] || h.host || '').toLowerCase();
  const from = h.origin || h.referer;
  if (!from) return false;
  try { return new URL(from).host.toLowerCase() === host; } catch { return false; }
}

/** Returns true when the request may continue; otherwise it has already answered. */
export function guard(req, res, opt = {}) {
  const limit = opt.limit || 40, windowMs = opt.windowMs || 60000, now = Date.now(), ip = clientIp(req);
  const ua = String((req.headers && req.headers['user-agent']) || '');
  const cookie = String((req.headers && req.headers.cookie) || '');
  res.setHeader('x-content-type-options', 'nosniff');
  if ((blocked.get(ip) || 0) > now || cookie.indexOf(TRAP_COOKIE + '=1') > -1 || SCANNERS.test(ua)) {
    console.warn(JSON.stringify({ event: 'blocked', ip, ua: ua.slice(0, 120), path: req.url }));
    send(res, 403, { error: 'Forbidden' });
    return false;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD' && opt.sameOrigin !== false && !sameOrigin(req)) {
    console.warn(JSON.stringify({ event: 'cross-origin', ip, origin: req.headers.origin || null, path: req.url }));
    send(res, 403, { error: 'Requests must come from the Fitted app' });
    return false;
  }
  const key = ip + ' ' + (opt.bucket || 'api'), list = (hits.get(key) || []).filter(t => now - t < windowMs);
  list.push(now); hits.set(key, list);
  if (hits.size > 10000) hits.delete(hits.keys().next().value);
  if (list.length > limit) {
    res.setHeader('retry-after', String(Math.ceil(windowMs / 1000)));
    send(res, 429, { error: 'Slow down a little and try again in a minute.' });
    if (list.length > limit * 4) flagIp(ip, 3600e3);
    return false;
  }
  return true;
}
