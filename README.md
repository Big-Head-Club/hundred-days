# hundred-days

The calendar for Mack's 100 games in 100 days. One game and one short per
day. Names, plates, and play counts come from the arcade; the schedule is
`data/days.json` in this repo.

Live: https://bhc-hundred-days.fly.dev

## Adding a day

Edit `data/days.json` on GitHub, or locally:

```
node tools/add-day.mjs 2026-09-08 <slug> https://www.youtube.com/shorts/...
git commit -am "Day 2" && git push
```

The site re-reads the file from GitHub every minute. No deploy needed. The
slug is the game's slug in the arcade; register the game there first if it
is new. The video is optional and can be added later.

## Running it

```
npm start        # http://localhost:3000
fly deploy       # only for changes to the page or server
```
