# bb-plugin-tinkerer — v0.1 spec

Agreed with Vedran on 2026-09-19 after a grilling session. This is the
contract v0.1 is built against; docs/ROADMAP.md holds everything deferred.

## Surfaces

1. **Nav panel "Tinkerer"** with tabs:
   - **Timeline**: `post/timeline` feed with a row of trending hashtag chips
     (`post/trendingHashtags`) above it; a chip switches to `topic/feed` and a
     clear chip returns. Post cards show author, content, link previews,
     images, reactions, like, bookmark, comment count with inline comments,
     and "Open on web".
   - **Inbox**: notifications (`notification/list`, mark read, mark all read),
     DMs (`messaging/myConversations` + `messaging/messages/*`, inline reply),
     active topic chats (`topicChat/*`, inline reply).
   - **Me**: level, sparks balance, progress to next level, all-time rank,
     badge collection, commits-this-week tile (`leaderboard/githubCommits`,
     period `week`), recent sparks ledger (`shop/ledger`), leaderboard with a
     daily / weekly / monthly switch.
   - **Lock-in**: start with the title prefilled from the current thread title
     when one is in view, countdown, todos, plain finish (no session post).
   - **Live**: `event/liveBanner` for a current or upcoming broadcast with a
     join link, plus the coming week from `event/calendar`.
   - Unread badge on the sidebar row (notifications + DMs + topic mentions).
2. **Thread side panel**: the whole panel mirrored beside a thread.
3. **Sidebar footer disclosure**: New post, Lock-in row (running countdown +
   Finish, or Start with a title), Inbox summary (one row per unread bucket,
   click jumps to that Inbox tab), Live now row (only while live or within the
   hour). No composer plus-menu, no message action.
4. **Composer dialog**: content, searchable topic picker (`topic/list`),
   project picker (`project/myProjects`), link preview (`post/previewLink`),
   "show on timeline" toggle (default on, follows the setting), **Publish**
   primary, **Queue** secondary. Short posts only. No AI drafting.

## Agents

- Tools: `tinkerer_me`, `tinkerer_timeline`, `tinkerer_search`,
  `tinkerer_notifications`, `tinkerer_post`, `tinkerer_lockin`,
  `tinkerer_call`.
- `tinkerer_post` returns a preview and requires `confirm: true` on a second
  call. With "confirm before agent posts" on (default), the confirming call
  also opens a native approval card (`bb.ui.requestInput`) in the thread and
  only the human's click publishes.
- `tinkerer_lockin` needs no confirmation (personal state); a toast announces
  agent-started and agent-finished sessions.
- `tinkerer_call` allows read-only procedures by default; write procedures
  only when "allow agent writes via tinkerer_call" is on. Admin-only
  namespaces are never exposed.
- Chat directive `::tinkerer{post="<id>"}` breaks out as its own live card
  (fetched by id, like, bookmark, open on web; raw text fallback on a bad id).
- Bundled skill `tinkerer-club` teaches the API shape, header, MCP endpoint,
  polling rule, and etiquette. Tool descriptions say this is a real community.

## Plumbing

- Bring-your-own key as a secret setting; friendly connect state without it.
- Typed client: `x-api-key`, JSON, error normalization, small in-memory TTL
  cache. Generic `call(path, input)` escape hatch.
- Polling service: unread counts + live banner every 60 s (setting, 30–600),
  exponential backoff on errors, off without a key, last counts in kv.
- Toasts only for new DMs, mentions, and a broadcast going live.
- Visual voice: bb-native quiet, one Tinkerer accent via `light-dark()`,
  custom compact SVG mark.
- CLI `bb tinkerer`: status, me, notifs, timeline, post, search, lockin.
- README with light and dark screenshots, PLUGIN_OVERVIEW.md, vitest smoke
  test, typecheck clean, installed from path and running.
