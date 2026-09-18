#!/usr/bin/env node
// node tools/add-day.mjs 2026-09-08 <slug> <youtube url>   — appends or replaces that day.
// Refuses a slug the arcade doesn't know or a video link the page can't embed.
// Records "shape": "wide" for regular videos so the page sizes the player to fit; Shorts are tall.
import { readFileSync, writeFileSync } from 'node:fs';
const [day, slug, video] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !slug) { console.error('usage: add-day YYYY-MM-DD slug [video-url]'); process.exit(1); }
const id = video && (video.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/) || [])[1];
if (video && !id) { console.error(`not a YouTube link the page can embed: ${video}`); process.exit(1); }
const feed = await (await fetch('https://bhc-arcade.fly.dev/api/games.json?all=1')).json();
if (!feed.games.some((g) => g.slug === slug)) { console.error(`the arcade has no game "${slug}"; register it first (node tools/lookup.mjs <url>)`); process.exit(1); }
// YouTube answers /shorts/<id> for a Short and redirects anything else to /watch.
let shape = '';
if (id) {
  const r = await fetch(`https://www.youtube.com/shorts/${id}`, { redirect: 'manual' });
  if (r.status >= 300 && r.status < 400) shape = 'wide';
  else if (r.status !== 200) { console.error(`YouTube says ${r.status} for ${id}; check the link`); process.exit(1); }
}
const f = new URL('../data/days.json', import.meta.url);
const data = JSON.parse(readFileSync(f, 'utf8'));
const was = data.days.find((d) => d.day === day);
data.days = data.days.filter((d) => d.day !== day);
data.days.push({ day, slug, ...(video ? { video } : {}), ...(shape ? { shape } : {}) });
data.days.sort((a, b) => a.day.localeCompare(b.day));
writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
console.log(`${day}: ${slug}${video ? ` + ${shape === 'wide' ? 'video' : 'short'}` : ''}${was ? ` (replaced ${was.slug}${was.video && was.video !== video ? ' and its video' : ''})` : ''}. Commit and push; the site picks it up within a minute.`);
