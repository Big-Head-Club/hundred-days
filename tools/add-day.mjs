#!/usr/bin/env node
// node tools/add-day.mjs 2026-09-08 <slug> <youtube url>   — appends or replaces that day.
// Refuses a slug the arcade doesn't know or a video link the page can't embed.
import { readFileSync, writeFileSync } from 'node:fs';
const [day, slug, video] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !slug) { console.error('usage: add-day YYYY-MM-DD slug [video-url]'); process.exit(1); }
if (video && !/(?:shorts\/|v=|youtu\.be\/|embed\/)[A-Za-z0-9_-]{6,}/.test(video)) { console.error(`not a YouTube link the page can embed: ${video}`); process.exit(1); }
const feed = await (await fetch('https://bhc-arcade.fly.dev/api/games.json?all=1')).json();
if (!feed.games.some((g) => g.slug === slug)) { console.error(`the arcade has no game "${slug}"; register it first (node tools/lookup.mjs <url>)`); process.exit(1); }
const f = new URL('../data/days.json', import.meta.url);
const data = JSON.parse(readFileSync(f, 'utf8'));
const was = data.days.find((d) => d.day === day);
data.days = data.days.filter((d) => d.day !== day);
data.days.push({ day, slug, ...(video ? { video } : {}) });
data.days.sort((a, b) => a.day.localeCompare(b.day));
writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
console.log(`${day}: ${slug}${video ? ' + video' : ''}${was ? ` (replaced ${was.slug})` : ''}. Commit and push; the site picks it up within a minute.`);
