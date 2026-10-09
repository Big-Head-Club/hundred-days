# hundred-days

The calendar for Mack's 100 games in 100 days. One game and one short per
day. Names, plates, and play counts come from the arcade; the schedule is
`data/days.json` in this repo.

Live: https://bhc-hundred-days.fly.dev

## Adding a day

Edit `data/days.json` on GitHub, or locally:

```
node tools/lookup.mjs https://thegame.xyz     # its arcade slug, and the last two weeks with weekdays
node tools/add-day.mjs 2026-09-08 <slug> 'https://www.youtube.com/shorts/...'   # a Short or a regular video
git commit -am "Day 2" && git push
```

The site re-reads the file from GitHub; a push shows within about five minutes. No deploy needed. The
slug is the game's slug in the arcade; register the game there first if it
is new. The video is optional and can be added later.

With Claude Code, paste the game link and the video link. `skill/SKILL.md`
teaches it the steps; install it with
`mkdir -p ~/.claude/skills/hundred-days && cp skill/SKILL.md ~/.claude/skills/hundred-days/`.

## The daily fill

A GitHub Action runs `tools/sync.mjs --apply` every morning. It compares Mack's
run at https://gameaday.xyz with this calendar and fills any day it can prove:
either a short whose title names the game (dated by the evening it went up) or a
single free day between two dated neighbours. It never guesses. Anything it
cannot settle goes in an issue titled "Calendar: days that need a person", and
that issue closes itself once the days are filled.

Run it by hand any time:

```
node tools/sync.mjs            # say what is missing, change nothing
node tools/sync.mjs --apply    # fill what it can prove
```

Run numbers on his page are not day numbers — that held to No. 29 and then he
skipped a day and inserted an older game.

## Running it

```
npm start        # http://localhost:3000
fly deploy       # only for changes to the page or server
```
