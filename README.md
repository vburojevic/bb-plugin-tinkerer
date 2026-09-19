<div align="center">

<img src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/assets/icon.svg" width="56" alt="">

# Tinkerer

**Tinkerer Club, inside bb.**

The club timeline, your inbox, lock-in sessions, your level and sparks, and a
post composer, one sidebar entry away from the agent you are working with.
Your agents get seven tools that read freely and post carefully.

[Install](#install) · [What you get](#timeline) · [Agents](#agents) · [CLI](#the-command-line) · [Settings](#settings)

</div>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/timeline.png">
  <img alt="The Tinkerer panel on the Timeline tab: filter chips, a post with a photo, topics, reactions and actions" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/timeline.png">
</picture>

*Every screenshot in this README is a real capture of the plugin running in
bb, in its demo mode: the members, posts and messages are fictional.*

## Install

From the bb plugin catalog: open **Extensions**, search for **Tinkerer**, install.

Or from a shell:

```sh
bb plugin install git:https://github.com/vburojevic/bb-plugin-tinkerer
```

Then paste your key: **Settings → Plugins → Tinkerer → Tinkerer Club API key**.
Create one at [app.tinkerer.club](https://app.tinkerer.club) under
Settings → API keys. The key is stored as a secret setting on this machine and
never reaches the browser, an agent, or a log. Requires bb 0.43 or newer and a
Tinkerer Club membership.

## Timeline

Post cards carry the author, photos and video, link previews, polls you can
vote in, reactions, like, bookmark, and comments that open in place with a
reply box. Long articles fold behind *Show more*. The row above the feed
filters it: any topic from a searchable list sorted by activity, or one of the
week's trending hashtags. New posts slide in at the top as they arrive.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/comments.png">
  <img alt="A post with its comment thread expanded and a reply box" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/comments.png">
</picture>

## Inbox

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/inbox.png">
  <img alt="The Inbox tab showing unread notifications with the Messages and Topics segments" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/inbox.png">
</picture>

Notifications, direct messages, rooms, and the topic chats you follow, under
one control. Notifications mark themselves read as you act on them. A
conversation opens in place; reply without leaving bb.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/dm.png">
  <img alt="A direct message conversation opened inside the panel with a reply box" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/dm.png">
</picture>

The sidebar row wears an unread count, and a toast announces a new DM, a
mention in a topic chat, or a broadcast going live. Both are settings.

## Me

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/me.png">
  <img alt="The Me tab: level card with progress, three stat tiles, the badge collection" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/me.png">
</picture>

Your level and the road to the next one, sparks earned in the last 30 days and
all-time, your all-time rank, commits this week from the GitHub leaderboard,
the badge collection, the recent sparks ledger, and the club leaderboard with a
today / week / month switch.

## Lock-in

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/lockin.png">
  <img alt="The Lock-in tab: a running session with a countdown, todos, and other members locked in" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/lockin.png">
</picture>

Start a lock-in named after what you are doing; when a thread is in view its
title is prefilled. The countdown is the hero, todos sit under it, and members
locked in alongside you appear at the bottom. Agents can start a session for
the task they are on and tick todos as they finish.

## Live

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/live.png">
  <img alt="The Live tab with a live broadcast banner and this week's events" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/live.png">
</picture>

The broadcast banner with a join link the moment something goes live, and the
week ahead from the club calendar.

## Compose

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/composer.png">
  <img alt="The New post dialog with a link preview, topic suggestions, a count ring, and Queue and Publish buttons" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/composer.png">
</picture>

Just the post. A text field that grows with what you write, a link preview the
composer finds on its own from the first URL, topic chips with a searchable
picker and suggestions pulled from the words you typed, a count ring, and the
visibility switch. **Publish** is the primary action (⌘↵); **Queue** hands the
post to your Tinkerer post queue instead. Close the dialog and the draft waits
for you.

## The footer menu

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/footer.png">
  <img alt="The sidebar footer menu: New post, a running lock-in with Finish, unread buckets, and a live join row" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/footer.png" width="360">
</picture>

A Tinkerer button in bb's sidebar footer opens a small menu: new post, start
or finish a lock-in, the unread buckets, and a join link while a broadcast is
live. The same panel also opens beside any thread from the side panel's
actions, so you can answer a DM next to the agent you are steering.

## On a phone

<p>
<img alt="Timeline on a phone" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/phone-timeline.png" width="240"> <img alt="Me tab on a phone" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/phone-me.png" width="240"> <img alt="Lock-in on a phone" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/phone-lockin.png" width="240">
</p>

Layouts follow the panel's own width, so the thread side panel and a phone get
the same treatment: a scrolling tab strip, an icon-only New post, reflowed
stat tiles, and pickers that become bottom sheets.

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
bb tinkerer search "e-ink"
bb tinkerer lockin start "Tinkerer plugin"
bb tinkerer lockin add "Write the README" && bb tinkerer lockin done <id>
bb tinkerer lockin finish
```

`--json` on any command, `--help` at every level.

## Settings

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/dark/settings.png">
  <img alt="The plugin settings page: API key, poll interval, toasts, composer default, agent guardrails, and the connection card" src="https://raw.githubusercontent.com/vburojevic/bb-plugin-tinkerer/main/docs/media/light/settings.png">
</picture>

| Setting | Default | Does |
| --- | --- | --- |
| Tinkerer Club API key | — | Your personal key (`tnk_…`). Secret, stored on this machine only. |
| Check for updates every | 60 s | Background cadence for unread counts, new posts, the live banner and your lock-in (30–600). The open panel checks every 20 s regardless. |
| Desktop toasts | messages, mentions and live | Or live broadcasts only, or none. Unread counts always show in the sidebar. |
| New posts show on the timeline | on | The composer's default visibility. |
| Confirm before an agent posts | on | `tinkerer_post` opens an approval card in the thread. |
| Allow agent writes via `tinkerer_call` | off | Lets the generic tool run write procedures. |

The connection card under the form shows whether the key works and who the
club thinks you are.

## Looks like your bb

Everything is drawn with bb's own tokens and vendored shadcn components. The
one accent follows your theme: when the palette's primary colour is chromatic
(ayu gold, dracula purple) the sparks, progress bar, unread pills and lock-in
clock take it; on a neutral theme they fall back to Tinkerer Club green. The
plugin mark is the club's gear and wrench.

## Live, without webhooks

Every call is `POST https://app.tinkerer.club/api/v1/<namespace>/<procedure>`
with your key in `x-api-key`. There are no webhooks, so a background service
polls the unread counts, the newest post, the live banner and your lock-in at
the interval you set, backing off on errors and not at all without a key.
Each poll tells the open views exactly what moved: the timeline merges new
posts, the inbox lists refresh, an open conversation pulls new messages and
marks them read. Post images and videos need the key too, so they load through
a small same-origin proxy route. Admin-only procedures are never exposed.

## Try it without a key

```sh
bb tinkerer demo on     # a fictional club, entirely in memory
bb tinkerer demo off    # back to your account
```

Demo mode is how the screenshots above were made.

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

`docs/SPEC.md` is the contract this was built against. `scripts/probe.mjs`
calls a platform procedure with the key from `.env.local` without printing it;
`scripts/screenshot.cjs` regenerates `docs/media` from demo mode.

## License

MIT © Vedran Burojević
