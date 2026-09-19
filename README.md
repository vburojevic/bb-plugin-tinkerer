<div align="center">

# Tinkerer

**Tinkerer Club, inside bb.**

The club timeline, your inbox, lock-in sessions, your level and sparks, and a
post composer, one sidebar entry away from the agent you are working with.
Agents get tools that read freely and post carefully.

</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/timeline.png">
  <img alt="The Tinkerer panel on the Timeline tab with trending topic chips and a post card" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/timeline.png">
</picture>

*The timeline, with the club's trending topics as chips.*

## Install

From the bb plugin catalog — open **Extensions**, search for **Tinkerer**, install.

Or from a shell:

```sh
bb plugin install git:https://github.com/vburojevic/bb-plugin-tinkerer
```

Requires bb 0.43 or newer and a Tinkerer Club membership. Bring your own key:
create one at [app.tinkerer.club](https://app.tinkerer.club) under
Settings → API keys, paste it into the plugin's settings, and the panel connects
on its own. The key is stored as a secret setting on this machine and never
reaches the browser, an agent, or a log.

## Timeline

Post cards carry the author, images and video, link previews, polls you can
vote in, reactions, like, bookmark, and inline comments with a reply box. Long
articles fold behind *Show more*. The row above the feed filters it: pick any
topic from a searchable list sorted by activity, or tap one of the week's
trending hashtags; tap again to come back. New posts slide in at the top as
they arrive. Every card has an *Open* link to the post on the web.

## Inbox

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/inbox.png">
  <img alt="The Inbox tab showing notifications with a segmented control for Messages and Topics" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/inbox.png">
</picture>

Notifications, direct messages, and the topic chats you follow, under one
segmented control. Notifications mark themselves read as you act on them.
Messages and topic chats open in place with a reply box, so answering someone
never means leaving bb. The sidebar row wears an unread count, and a toast
announces a new DM, a mention in a topic chat, or a broadcast going live.

## Me

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/me.png">
  <img alt="The Me tab with the level card, progress bar, stat tiles and the badge collection" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/me.png">
</picture>

Your level and the road to the next one, sparks earned in the last 30 days and
all-time, your all-time rank, commits this week from the GitHub leaderboard,
the badge collection, the recent sparks ledger, and the club leaderboard with a
today / week / month switch.

## Lock-in

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/lockin.png">
  <img alt="The Lock-in tab with a title field and a Start lock-in button above a todo list" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/lockin.png">
</picture>

Start a lock-in named after what you are doing; when a thread is in view its
title is prefilled. The countdown is the hero, todos sit under it, and members
locked in alongside you appear at the bottom. Agents can start a session for
the task they are on and tick todos as they finish.

## Compose

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/composer.png">
  <img alt="The New post dialog with a link preview, topic picker, project select and Publish button" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/composer.png">
</picture>

Just the post: a text field that grows with what you write, a link preview
the composer finds on its own from the first URL, topic chips with a
searchable picker and suggestions pulled from the words you typed, a count
ring, and the visibility switch. **Publish** is the primary action (⌘↵);
**Queue** hands the post to your Tinkerer post queue instead. Close the dialog
and the draft waits for you. Short posts only; articles stay on the web.

## The footer menu

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/footer.png">
  <img alt="The sidebar footer disclosure with New post, a lock-in field, and the inbox summary" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/footer.png">
</picture>

A Tinkerer button in the sidebar footer opens a small menu: new post, start or
finish a lock-in, the unread buckets, and a join link while a broadcast is live.
The same panel also opens beside any thread from the side panel's actions.

## Agents

Seven tools, each described to the model as acting inside a real community:

| Tool | Does |
| --- | --- |
| `tinkerer_me` | Level, sparks, progress, rank. |
| `tinkerer_timeline` | Recent posts, or one topic's feed, with paging. |
| `tinkerer_search` | Members, posts, articles, chats. |
| `tinkerer_notifications` | Notifications, optionally marking them read. |
| `tinkerer_post` | Preview first, then `confirm: true` to publish. |
| `tinkerer_lockin` | Start, finish, and manage todos. |
| `tinkerer_call` | Any platform procedure by name; reads always, writes only when you allow it. |

With **Confirm before an agent posts** on (the default), the confirming call
opens an approval card in the thread showing the exact post, and only your
click publishes it. Agents cite a post in chat with
`::tinkerer{post="<id>"}`, which renders as a live card in the transcript.
The bundled `tinkerer-club` skill teaches agents the API shape, the header,
the MCP endpoint, the polling rule, and the etiquette.

## The command line

```sh
bb tinkerer status --refresh          # connection, unread counts, live, lock-in
bb tinkerer me
bb tinkerer notifs --unread
bb tinkerer timeline --topic ai-llms --limit 5
bb tinkerer post "Shipped the thing" --topic bb --queue
bb tinkerer search "omarchy"
bb tinkerer lockin start "Tinkerer plugin"
bb tinkerer lockin add "Write the README" && bb tinkerer lockin done <id>
bb tinkerer lockin finish
```

`--json` on any command, `--help` at every level.

## Settings

| Setting | Default | Does |
| --- | --- | --- |
| Tinkerer Club API key | — | Your personal key (`tnk_…`). Secret. |
| Poll interval | 60 s | How often unread counts and the live banner are checked (30–600). |
| New posts show on the timeline | on | Composer default for the timeline toggle. |
| Confirm before an agent posts | on | `tinkerer_post` opens an approval card in the thread. |
| Allow agent writes via `tinkerer_call` | off | Lets the generic tool run write procedures. |

## Live, without webhooks

Every call is `POST https://app.tinkerer.club/api/v1/<namespace>/<procedure>`
with your key in `x-api-key`. There are no webhooks, so a background service
polls the unread counts, the newest post, the live banner and your lock-in at
the interval you set, backing off exponentially on errors and not at all
without a key. While the panel is on screen it polls every 20 seconds, and
each poll tells the open views exactly what moved: the timeline merges new
posts, the inbox lists refresh, an open conversation pulls new messages and
marks them read. Post images and videos need the key too, so they load through
a small same-origin proxy route. Reads sit behind an in-memory cache.
Admin-only procedures are never exposed. The procedure catalog in
`lib/procedures.generated.ts` comes from the platform's OpenAPI document
(`npm run gen:procedures`).

## Looks like your bb

Everything is drawn with bb's own tokens and vendored shadcn components. The
one accent follows your theme: when the palette's primary colour is chromatic
(ayu gold, dracula purple) the sparks, progress bar, unread pills and lock-in
clock take it; on a neutral theme they fall back to Tinkerer Club green. The
plugin mark is the club's gear and wrench.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md): articles, queue management, sharing a
thread to the club, AI-drafted posts, events RSVP, gifting, and more.

## Development

```sh
npm install
npm run check          # typecheck + vitest
bb plugin build
bb plugin install path:$(pwd)
```

`docs/SPEC.md` is the v0.1 contract. `scripts/probe.mjs` calls a procedure with
the key from `.env.local` without ever printing it.

## License

MIT © Vedran Burojević
