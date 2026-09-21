---
name: hundred-days
description: Add a game and its YouTube video to the Big Head Club "100 games in 100 days" calendar at bhc-hundred-days.fly.dev. Use when the user pastes a game link and a YouTube link (a Short or a regular video), with or without any other words, or when they ask to add, swap or fix a day, a game or a video on the calendar or the hundred days site.
---

# Add a day to the 100 days calendar

The calendar at https://bhc-hundred-days.fly.dev shows one Big Head Club game
per day, with Mack's YouTube video for it: sometimes a Short, sometimes a
regular video. The schedule is `data/days.json` in
`~/Desktop/stuff/hundred-days` (github.com/Big-Head-Club/hundred-days). The
site re-reads that file from GitHub, so a push publishes the day within a few
minutes.
Never deploy for a new day.

Every game on the calendar must be registered with the arcade
(https://bhc-arcade.fly.dev), because the calendar takes each game's name,
picture and play count from the arcade's feed.

The usual request is two links, a game and a video, sometimes with a day
("yesterday's game", "Friday"). This is routine: do it without asking, then
report. Several pairs at once means several days; handle each pair the same way.

## 1. Pull and look up

```sh
cd ~/Desktop/stuff/hundred-days && git pull -q
node tools/lookup.mjs <game url>
```

It prints the page's title, the game's arcade slug, name, status and `started`
date, whether that slug is already on the calendar, and the last two weeks of
the calendar with weekdays and day numbers. Take dates and weekdays from that
table. Never work out a weekday in your head.

## 2. If the arcade doesn't know the game, register it

The lookup says `NOT REGISTERED`. Find the repo:

```sh
gh repo list Big-Head-Club --limit 300 --json name,homepageUrl --jq '.[] | "\(.name) \(.homepageUrl)"' | grep -i <word from the title or domain>
```

Clone it to the scratchpad and follow the `arcade` skill: add `cart.json` and
the hub tag, commit, push. Set `started` to the calendar day the game will
take. Pick `category` from the game's own description. The arcade's GitHub
webhook adds the game within seconds of the push. Run the lookup again until it
shows the slug.

The calendar needs only the registry entry, not the tag. If the game's host
doesn't redeploy on push (some Railway services aren't linked to GitHub), say
so in the report instead of deploying by hand.

Ask the user only if no repo in the org matches.

## 3. Pick the day

In this order:

1. The user named a day: use it. "Yesterday" and "today" are relative to the
   `<- today` row. A weekday name means the most recent one on or before today.
   A date is a date.
2. No day named: the game's `started` date, if that row is empty and not after
   today.
3. Otherwise the earliest empty row on or before today.

If the chosen day already holds another game, stop and ask, unless the user
asked for a swap. If the game is already on another day, stop and ask, unless
the user is adding a video that arrived late (same day, same slug, new video).

## 4. Write, commit, push

```sh
node tools/add-day.mjs <YYYY-MM-DD> <slug> '<video url>'
git commit -qam "Day <n>: <NAME>" && git push -q
```

Quote the video link: zsh reads the `?` in `watch?v=` as a wildcard.

`add-day.mjs` replaces any existing entry for that date, so the same command
swaps a game, adds a late video or replaces a video. It asks YouTube whether
the link is a Short and records `"shape": "wide"` when it isn't, so the page
gives regular videos a 16:9 player. It refuses a slug the arcade doesn't know
and a link the page can't embed. End the commit message with the attribution
lines this session asks for.

## 5. Check it's live

```sh
curl -s https://bhc-hundred-days.fly.dev/days.json | grep -c '"day"'
```

Poll for up to six minutes until the new date shows in
`https://bhc-hundred-days.fly.dev/days.json`. GitHub caches the raw file for
five minutes, so a slow first check is normal, not a failure.

## 6. Report

One to three plain sentences: the weekday and date, the game's name as the
arcade has it, and anything that needed a decision. Say so when:

- you registered the game, and whether its host picked up the tag;
- the name the user used differs from the registered name (choirteacher.xyz is
  registered as SING BACK);
- the day you chose came from rule 2 or 3 rather than from the user;
- today, or any earlier day, is still empty.
