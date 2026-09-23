/* Honeypot. vercel.json routes the paths that scanners and bots probe (/.env, /wp-login.php,
   /.git/config, /admin, /phpmyadmin ...) here. Fitted has none of them, so any visitor is a
   probe: log it, mark the client (cookie + IP) so the real API refuses it, and answer with
   believable bait that leads nowhere. */
import { clientIp, flagIp, trapCookie } from './_lib/guard.js';
import { queryParam } from './_lib/http.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = n => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

function bait(path) {
  if (/\.env/.test(path)) return ['text/plain', 'APP_ENV=production\nDB_HOST=10.0.3.12\nDB_USER=fitted_app\nDB_PASSWORD=hp_' + rand(18) + '\nSTRIPE_SECRET=sk_live_hp' + rand(22) + '\nJWT_SECRET=' + rand(32) + '\n'];
  if (/\.git/.test(path)) return ['text/plain', '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n[remote "origin"]\n\turl = https://git.internal.fitted.app/web/fitted.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n'];
  if (/aws/.test(path)) return ['text/plain', '[default]\naws_access_key_id = AKIAHP' + rand(14).toUpperCase() + '\naws_secret_access_key = ' + rand(40) + '\n'];
  if (/wp-|xmlrpc|admin|phpmyadmin|login/.test(path)) return ['text/html; charset=utf-8', '<!doctype html><title>Log in</title><form method="post"><label>Username <input name="log"></label><label>Password <input name="pwd" type="password"></label><button>Log in</button></form>'];
  return ['application/json', JSON.stringify({ status: 'ok', users: [], version: '2.4.1' })];
}

export default async function handler(req, res) {
  const ip = clientIp(req), path = String(queryParam(req, 'p') || req.url || '').slice(0, 200);
  let user = null;
  if (req.method === 'POST') { try { let b = ''; for await (const c of req) { b += c; if (b.length > 4000) break; } user = (/(?:^|&)(?:log|user(?:name)?|email)=([^&]{0,60})/.exec(b) || [])[1] || null; } catch {} }
  // Never log passwords, only who knocked and on which door.
  console.warn(JSON.stringify({ event: 'honeypot', ip, path, method: req.method, ua: String(req.headers['user-agent'] || '').slice(0, 160), user: user && decodeURIComponent(user) }));
  flagIp(ip);
  await wait(600 + Math.random() * 900);
  const [type, body] = bait(path);
  res.statusCode = 200;
  res.setHeader('content-type', type);
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-robots-tag', 'noindex, nofollow');
  res.setHeader('set-cookie', trapCookie());
  res.end(body);
}
