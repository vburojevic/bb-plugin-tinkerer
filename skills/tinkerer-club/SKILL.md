---
name: tinkerer-club
description: Read and act on Tinkerer Club (app.tinkerer.club), a real community of people who build things, through the Tinkerer plugin's tools, the `bb tinkerer` CLI, or the platform API directly. Use when the user mentions Tinkerer Club, tinkerers, sparks, lock-in, the club timeline, or asks to post, check notifications, or look something up in the club.
---

# Tinkerer Club

Tinkerer Club is a community of real people. Everything you do here happens
under the user's name and is visible to other members. Read freely; write
only when asked, once, and in the user's voice.

## Fastest path: the plugin tools

| Tool | Use it for |
| --- | --- |
| `tinkerer_me` | Who the user is: level, sparks, rank. |
| `tinkerer_timeline` | Recent posts (`topic` for one topic feed, `cursor` to page). |
| `tinkerer_search` | Members, posts, articles, chats by keyword. |
| `tinkerer_notifications` | Notifications; `markRead: true` clears what it returns. |
| `tinkerer_post` | Publish a short post. Two calls: preview, then `confirm: true`. |
| `tinkerer_lockin` | Start / finish a focus session, manage its todos. |
| `tinkerer_call` | Any other procedure by name; `procedure: "list"` lists them. |

`tinkerer_post` may open an approval card in the thread; wait for the user's
answer, and never call it again after a decline. Cite a post in chat with the
directive `::tinkerer{post="<id>"}` on its own line; bb renders the live card.

The same surface from a shell: `bb tinkerer status | me | notifs | timeline |
post "<text>" [--topic slug] [--queue] | search "<q>" | lockin [start|finish|todos|add|done]`.
Add `--json` for machine-readable output; `--help` at every level.

## The platform API (when calling it yourself)

- Base: `https://app.tinkerer.club/api/v1/<namespace>/<procedure>`, always
  `POST` with a JSON **object** body (`{}` when there is no input).
- Header: `x-api-key: <key>`. Bearer auth returns 401. The key is the user's
  own; the plugin keeps it in a secret setting. Never print or log it, never
  put it in a file, a prompt, or a commit.
- Success: `{"data": …, "path": "ns.proc"}`. Error: `{"code", "error",
  "path"}`; a `BAD_REQUEST` `error` is a JSON string of Zod issues.
- OpenAPI: `https://app.tinkerer.club/api/v1/openapi.json` (inputs only, no
  response schemas). MCP: `https://app.tinkerer.club/api/mcp` (Streamable HTTP,
  32 tools plus `list_platform_capabilities` and `call_platform_procedure`).
- Admin-only, 403 for members, never call: `admin/*`, `bot/catalog`,
  `bot/status`, `post/analysis`, `leaderboard/recapPreview`.

Procedures worth knowing: `post/timeline {cursor?, limit?, supportsSparsePages: true}`,
`post/byId {id}`, `post/listComments {postId}`, `post/addComment {postId, content, images: []}`,
`post/create {content, type: "SHORT", topicSlugs, images: [], timeline, publish: "now" | "queue", projectId?}`,
`post/previewLink {url}`, `topic/list`, `topic/feed {slug, includeChildren}`,
`project/myProjects`, `notification/list {cursor?, limit?}`, `notification/markRead {id}`,
`messaging/myConversations`, `messaging/messages/list {conversationId}`,
`messaging/messages/send {conversationId, content, attachments: []}`,
`topicChat/activeTopics`, `topicChat/messages/list {topicSlug}`, `topicChat/messages/send {topicSlug, content, attachments: []}`,
`leaderboard/myLevel`, `leaderboard/userStats {userId, includeRank}`, `leaderboard/leaderboard {period: daily|weekly|monthly}`,
`leaderboard/githubCommits {period: today|week|month|all, limit, offset}`, `shop/wallet`, `shop/ledger`,
`gamification/collection {userId}`, `lockIn/state`, `lockIn/start {title?}`, `lockIn/finish {id}`,
`lockIn/todos`, `lockIn/createTodo {id, title}`, `lockIn/updateTodo {id, completed}`,
`event/liveBanner`, `event/calendar {from, to}`, `search/all {query}`, `user/getCurrentUser`.

## Polling rule

There are no webhooks. The plugin already polls unread counts and the live
banner every 60 s (setting, 30–600) with backoff; do not add your own loop.
If you must poll, use `notification/unreadCount`, `messaging/dmUnreadCount`,
`topicChat/activeTopics`, `event/liveBanner`, and never faster than 30 s.

## Etiquette

- Post only when the user asks. One post per ask. No filler, no hashtags
  spam, no "excited to share".
- Write in the user's voice: specific, short, a link to the thing.
- Read before you reply: fetch the post or thread you are answering.
- Likes, comments, DMs and topic replies are writes; treat them like posts.
- Prefer `user/getCurrentUser` for the user's id; never hardcode one.
