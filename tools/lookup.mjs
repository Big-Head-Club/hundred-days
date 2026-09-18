#!/usr/bin/env node
// node tools/lookup.mjs <game url>
// Finds the game in the arcade and prints the last two weeks of the calendar
// with weekdays, so the slug and the day come from data, not from memory.
import { readFileSync } from 'node:fs';

const ARCADE = 'https://bhc-arcade.fly.dev';
const input = process.argv[2];
if (!input) { console.error('usage: lookup <game url>'); process.exit(1); }

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const fold = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const feed = await (await fetch(`${ARCADE}/api/games.json?all=1`)).json();

let page = { url: input, title: '' };
try {
  const r = await fetch(input, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  const html = await r.text();
  page = { url: r.url, status: r.status, title: (html.match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim() || '' };
} catch (e) { page.error = e.message; }

// Match on the host first (with and without redirects), then on the page title.
const hosts = new Set([host(input), host(page.url)].filter(Boolean));
let match = feed.games.filter((g) => hosts.has(host(g.url)));
let how = 'url';
if (!match.length && page.title) {
  const t = fold(page.title);
  match = feed.games.filter((g) => fold(g.name) === t);
  how = 'title';
  if (!match.length) { match = feed.games.filter((g) => fold(g.name).length > 3 && (t.includes(fold(g.name)) || fold(g.name).includes(t))); how = 'title, loose: confirm by eye'; }
}

console.log(`page      ${input}${page.url !== input ? ` -> ${page.url}` : ''}  ${page.error ? `ERROR ${page.error}` : `${page.status} "${page.title}"`}`);
if (!match.length) console.log('arcade    NOT REGISTERED: find the repo and follow the arcade skill');
for (const g of match) console.log(`arcade    ${g.slug}  "${g.name}"  ${g.status}  ${g.category || 'no category'}  started ${g.started || '?'}  (matched by ${how})`);

const data = JSON.parse(readFileSync(new URL('../data/days.json', import.meta.url), 'utf8'));
const bySlot = new Map(data.days.map((d) => [d.day, d]));
const start = new Date(`${data.start}T12:00:00`);
const today = new Date(); today.setHours(12, 0, 0, 0);
const dayNo = (d) => Math.round((d - start) / 86_400_000) + 1;

for (const g of match) for (const d of data.days) if (d.slug === g.slug) console.log(`calendar  ${g.slug} is already on ${d.day}${d.video ? ' with a video' : ' without a video'}`);

console.log(`calendar  day 1 = ${data.start}; today ${ymd(today)} is day ${dayNo(today)}`);
const from = new Date(Math.max(start, today - 13 * 86_400_000));
for (let d = new Date(from); d <= today; d.setDate(d.getDate() + 1)) {
  const slot = bySlot.get(ymd(d));
  const label = slot ? `${slot.slug}${slot.video ? '  +video' : '  (no video)'}` : '-- empty --';
  console.log(`  ${WEEK[d.getDay()]} ${ymd(d)}  day ${String(dayNo(d)).padStart(3)}  ${label}${ymd(d) === ymd(today) ? '   <- today' : ''}`);
}
