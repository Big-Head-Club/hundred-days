#!/usr/bin/env node
// node tools/sync.mjs [--apply]
//
// Compares Mack's canonical run at gameaday.xyz with this calendar and says what
// is missing. With --apply it fills in the days it can prove, and prints the rest
// for a person to settle.
//
// What counts as proof, in order:
//   1. a short whose title names the game — the date is the evening it went up
//   2. the game sits between two dated neighbours in Mack's order with exactly
//      one empty day between them
// Anything else is reported, never guessed. Run numbers are NOT days: that held
// to No. 29 and then he skipped a day and inserted an older game.
import { readFileSync, writeFileSync } from 'node:fs';

const CANON = 'https://gameaday.xyz/';
const ARCADE = 'https://bhc-arcade.fly.dev';
const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpAioHiYlsnmSgNvN795kZQ';
const TZ = 'America/New_York';
const apply = process.argv.includes('--apply');

const fold = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const day = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const shift = (d, n) => day(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000);

const get = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(25_000), headers: { 'user-agent': 'hundred-days-sync' } });
  if (!r.ok) throw new Error(`${url} says ${r.status}`);
  return r.text();
};

/** Mack's run, newest first. His markup moves, so shout rather than return nothing. */
async function canon() {
  const html = await get(CANON);
  const re = /data-started="run-(\d+)"[\s\S]{0,400}?data-slug="([^"]+)"[\s\S]{0,300}?nameplate">([^<]+)</g;
  const out = [];
  for (const m of html.matchAll(re)) out.push({ no: Number(m[1]), slug: m[2], name: m[3].trim() });
  if (!out.length) {
    const at = html.indexOf('data-started');
    throw new Error(`the canon returned nothing — his markup has moved again. Around the first card:\n${html.slice(Math.max(0, at - 200), at + 400)}`);
  }
  return out.sort((a, b) => a.no - b.no);
}

async function arcade() {
  const j = JSON.parse(await get(`${ARCADE}/api/games.json?all=1`));
  return new Map(j.games.map((g) => [g.slug, g]));
}

/** Shorts, newest first, with the day they went up where Mack is. */
async function videos() {
  const xml = await get(FEED);
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const e = m[1];
    const at = Date.parse(/<published>(.*?)<\/published>/.exec(e)[1]);
    return { at, day: day(at), url: /<link rel="alternate" href="(.*?)"/.exec(e)[1], title: /<title>(.*?)<\/title>/.exec(e)[1] };
  });
}

function titleNames(video, game, arcadeRow) {
  const hay = fold(video.title);
  const names = [game.name, game.slug.replace(/-/g, ' '), arcadeRow?.name].filter(Boolean).map(fold);
  return names.some((n) => n.length > 4 && hay.includes(n));
}

const main = async () => {
  const [run, games, shorts] = await Promise.all([canon(), arcade(), videos()]);
  const file = new URL('../data/days.json', import.meta.url);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const byDay = new Map(data.days.map((d) => [d.day, d]));
  const placed = new Map(data.days.map((d) => [d.slug, d.day]));
  const today = day(Date.now());

  // the arcade and Mack sometimes call the same game different things
  const alias = (slug) => (games.has(slug) ? slug : [...games.keys()].find((k) => fold(games.get(k).name) === fold(run.find((r) => r.slug === slug)?.name)) || slug);

  const missing = run.filter((r) => !placed.has(alias(r.slug)));
  const report = [];
  let changed = 0;

  for (const game of missing) {
    const slug = alias(game.slug);
    const row = games.get(slug);
    if (!row) { report.push(`${game.name}: on Mack's list, not in the arcade — register it first`); continue; }

    const short = shorts.find((v) => titleNames(v, game, row));
    let when = null, why = '';
    if (short && !byDay.has(short.day)) { when = short.day; why = `its short went up that evening ("${short.title}")`; }

    if (!when) {
      // between two dated neighbours with exactly one gap
      const before = run.filter((r) => r.no < game.no).map((r) => placed.get(alias(r.slug))).filter(Boolean).sort().pop();
      const after = run.filter((r) => r.no > game.no).map((r) => placed.get(alias(r.slug))).filter(Boolean).sort().shift();
      const stop = after || shift(today, 1);
      const open = [];
      for (let d = shift(before || data.start, 1); d < stop; d = shift(d, 1)) if (!byDay.has(d)) open.push(d);
      if (before && open.length === 1) { when = open[0]; why = `the only day free between ${before} and ${stop}`; }
      else report.push(`${game.name} (No. ${game.no}): ${open.length} days free${before ? ` after ${before}` : ''} — ${open.join(', ') || 'none'}`);
    }

    if (when) {
      report.push(`${when}  ${slug}  ${game.name}  (${why})`);
      if (apply) {
        byDay.set(when, { day: when, slug, ...(short ? { video: short.url } : {}) });
        placed.set(slug, when);
        changed += 1;
      }
    }
  }

  // a day already on the calendar whose short turned up later
  for (const d of data.days) {
    if (d.video) continue;
    const game = run.find((r) => alias(r.slug) === d.slug);
    const short = shorts.find((v) => game && titleNames(v, game, games.get(d.slug)));
    if (!short) continue;
    report.push(`${d.day}  ${d.slug}: short found, "${short.title}"`);
    if (apply) { byDay.set(d.day, { ...d, video: short.url }); changed += 1; }
  }

  if (apply && changed) {
    data.days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
    writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  }
  console.log(report.length ? report.join('\n') : 'nothing to do: the calendar matches the run');
  if (apply) console.log(`\n${changed} change${changed === 1 ? '' : 's'} written to data/days.json`);
  else if (report.length) console.log('\n(dry run — pass --apply to write)');
};

main().catch((e) => { console.error(e.message); process.exit(1); });
