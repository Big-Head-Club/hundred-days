#!/usr/bin/env node
// node tools/add-day.mjs 2026-09-08 <slug> <youtube url>   — appends or replaces that day.
import { readFileSync, writeFileSync } from 'node:fs';
const [day, slug, video] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !slug) { console.error('usage: add-day YYYY-MM-DD slug [video-url]'); process.exit(1); }
const f = new URL('../data/days.json', import.meta.url);
const data = JSON.parse(readFileSync(f, 'utf8'));
data.days = data.days.filter((d) => d.day !== day);
data.days.push({ day, slug, ...(video ? { video } : {}) });
data.days.sort((a, b) => a.day.localeCompare(b.day));
writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
console.log(`${day}: ${slug}${video ? ' + video' : ''}. Commit and push; the site picks it up within a minute.`);
