## What you get

Tinkerer Club lives one sidebar entry away from your agents. A **Tinkerer**
panel with five tabs: the club timeline with trending topics, your inbox
(notifications, direct messages, topic chats with inline replies), your level
and sparks, lock-in sessions, and live broadcasts. The same panel opens beside
any thread, and a sidebar footer menu handles the quick things: a new post, a
lock-in, the unread buckets, a live join link.

## Post from where you work

A composer dialog with a searchable topic picker, your projects, and a link
preview it finds on its own. Publish now or queue it for your post queue.
Short posts only; articles stay on the web.

## Agents that post carefully

Seven tools give an agent the club: profile, timeline, search, notifications,
posting, lock-in, and a generic procedure call. Every description says this is
a real community. Posting is a preview-then-confirm handshake, and by default
the confirming call opens an approval card in the thread so only your click
publishes. The generic tool runs reads freely and writes only when you allow
it. Agents cite posts with `::tinkerer{post="…"}`, rendered as a live card.
A bundled skill teaches the API, the MCP endpoint, the polling rule, and the
etiquette, and `bb tinkerer` covers the same ground from a shell.

## Settings that matter

Your API key (secret, on this machine only), how often to check for updates,
which arrivals get a desktop toast, the composer's default visibility, and two
agent guardrails: confirm before an agent posts, and whether the generic tool
may write. A connection card shows whether the key works.

## Stays quiet

There are no webhooks, so a background service polls unread counts and the
live banner every minute (configurable), backs off on errors, and never polls
without a key. Toasts only for a new DM, a mention, or a broadcast going live.

## Requirements

Requires bb 0.43 or newer and a Tinkerer Club membership. Bring your own API
key from app.tinkerer.club; it is stored as a secret setting on this machine
and never reaches the browser, an agent, or a log.
