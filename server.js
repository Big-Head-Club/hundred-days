// One page, two JSON routes. The schedule lives in data/days.json in this repo
// and is re-read from GitHub every minute, so editing the file on GitHub is
// the whole publishing step. Game names, plates, and plays come from the arcade.
import http from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = Number(process.env.PORT) || 3000;
const ARCADE = (process.env.ARCADE_URL || 'https://bhc-arcade.fly.dev').replace(/\/$/, '');
const DAYS_URL = process.env.DAYS_URL || 'https://raw.githubusercontent.com/Big-Head-Club/hundred-days/main/data/days.json';
const page = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const bundledDays = readFileSync(new URL('./data/days.json', import.meta.url), 'utf8');

const cache = new Map();
async function cached(key, ttlMs, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  try {
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    if (hit) return hit.value;
    throw e;
  }
}

const days = () => cached('days', 60_000, async () => {
  const r = await fetch(DAYS_URL, { signal: AbortSignal.timeout(8000), headers: { 'cache-control': 'no-cache' } });
  if (!r.ok) throw new Error(`days ${r.status}`);
  const text = await r.text();
  JSON.parse(text);
  return text;
}).catch(() => bundledDays);

const games = () => cached('games', 60_000, async () => {
  const r = await fetch(`${ARCADE}/api/games.json?all=1`, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`arcade ${r.status}`);
  return r.text();
}).catch(() => '{"games":[]}');

const send = (res, status, body, type, maxAge = 0) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store' });
  res.end(body);
};

http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  try {
    if (p === '/health') return send(res, 200, 'ok', 'text/plain');
    if (p === '/days.json') return send(res, 200, await days(), 'application/json; charset=utf-8', 30);
    if (p === '/games.json') return send(res, 200, await games(), 'application/json; charset=utf-8', 30);
    if (p === '/' || p === '/index.html') return send(res, 200, page.replace('__ARCADE__', ARCADE), 'text/html; charset=utf-8', 60);
    send(res, 404, 'not found', 'text/plain');
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, 'error', 'text/plain');
  }
}).listen(PORT, () => console.log(`hundred-days on :${PORT}`));
