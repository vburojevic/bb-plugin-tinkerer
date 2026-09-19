// The RPC contract shared by server.ts and app.tsx, plus the platform shapes
// both sides read. The platform's OpenAPI carries input schemas only, so the
// response shapes here were derived from live probes (docs/openapi.json for
// inputs, scripts/probe.mjs for outputs) and are deliberately loose: every
// object is `looseObject`, every field the UI does not depend on is optional,
// and unknown fields pass through untouched.
import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

const nullableString = z.string().nullable().optional();
/** Counts the platform sometimes reports as null (no GitHub link, no reads yet). */
const nullableNumber = z.number().nullable().optional();

export const authorSchema = z.looseObject({
  id: z.string(),
  name: nullableString,
  username: nullableString,
  avatarImageUrl: nullableString,
  gravatarUrl: nullableString,
  image: nullableString,
  tinkererVerified: z.boolean().optional(),
});
export type Author = z.infer<typeof authorSchema>;

export const linkPreviewSchema = z.looseObject({
  url: z.string(),
  title: nullableString,
  description: nullableString,
  imageUrl: nullableString,
  provider: nullableString,
  author: nullableString,
});
export type LinkPreview = z.infer<typeof linkPreviewSchema>;

export const reactionSchema = z.looseObject({
  emoji: z.string(),
  count: z.number(),
});

export const postSchema = z.looseObject({
  id: z.string(),
  type: z.string().optional(),
  publishState: z.string().optional(),
  publishedAt: nullableString,
  scheduledFor: nullableString,
  title: nullableString,
  content: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  projectId: nullableString,
  createdAt: z.string().optional(),
  author: authorSchema,
  project: z
    .looseObject({ id: z.string(), title: nullableString, slug: nullableString, url: nullableString })
    .nullable()
    .optional(),
  topics: z.array(z.looseObject({ slug: z.string(), name: nullableString, emoji: nullableString })).optional(),
  bookmarkedByMe: z.boolean().optional(),
  commentCount: nullableNumber,
  linkPreviews: z.array(linkPreviewSchema).optional(),
  likeCount: nullableNumber,
  likedByMe: z.boolean().optional(),
  myReactions: z.array(z.string()).optional(),
  reactions: z.array(reactionSchema).optional(),
  poll: z.unknown().optional(),
});
export type Post = z.infer<typeof postSchema>;

export const commentSchema = z.looseObject({
  id: z.string(),
  postId: z.string(),
  content: z.string(),
  parentId: nullableString,
  createdAt: z.string(),
  author: authorSchema,
  images: z.array(z.string()).optional(),
});
export type Comment = z.infer<typeof commentSchema>;

export const notificationSchema = z.looseObject({
  id: z.string(),
  type: z.string().optional(),
  title: z.string(),
  body: nullableString,
  link: nullableString,
  data: z.looseObject({ kind: z.string().optional(), postId: z.string().optional() }).nullable().optional(),
  read: z.boolean(),
  createdAt: z.string(),
  actor: authorSchema.nullable().optional(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const conversationSchema = z.looseObject({
  id: z.string(),
  type: z.string().optional(),
  name: nullableString,
  icon: nullableString,
  otherUser: authorSchema.nullable().optional(),
  lastMessage: z
    .looseObject({ content: z.string().nullable().optional(), createdAt: z.string().optional(), senderId: z.string().optional() })
    .nullable()
    .optional(),
  lastMessageAt: nullableString,
  unreadCount: nullableNumber,
  memberCount: z.number().nullable().optional(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const dmMessageSchema = z.looseObject({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string().nullable().optional(),
  createdAt: z.string(),
  sender: authorSchema.optional(),
  deletedAt: nullableString,
});
export type DmMessage = z.infer<typeof dmMessageSchema>;

export const topicChatSchema = z.looseObject({
  slug: z.string(),
  name: z.string(),
  emoji: nullableString,
  kind: z.string().optional(),
  messageCount: nullableNumber,
  unreadMentionCount: nullableNumber,
  lastMessage: z
    .looseObject({ content: z.string().nullable().optional(), createdAt: z.string().optional(), kind: z.string().optional() })
    .nullable()
    .optional(),
});
export type TopicChat = z.infer<typeof topicChatSchema>;

export const topicChatMessageSchema = z.looseObject({
  id: z.string(),
  userId: z.string().optional(),
  kind: z.string().optional(),
  content: z.string().nullable().optional(),
  postId: nullableString,
  createdAt: z.string(),
  user: authorSchema.optional(),
  deletedAt: nullableString,
});
export type TopicChatMessage = z.infer<typeof topicChatMessageSchema>;

export const topicSchema = z.looseObject({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  emoji: nullableString,
  kind: z.string().optional(),
});
export type Topic = z.infer<typeof topicSchema>;

export const projectSchema = z.looseObject({
  id: z.string(),
  slug: z.string().optional(),
  title: z.string(),
  url: nullableString,
});
export type Project = z.infer<typeof projectSchema>;

export const levelSchema = z.looseObject({ level: z.number(), name: z.string(), minPoints: z.number().optional() });
export type Level = z.infer<typeof levelSchema>;

export const progressSchema = z.looseObject({
  earnedInLevel: z.number(),
  neededForNext: z.number().nullable(),
  ratio: z.number(),
  level: levelSchema,
  next: levelSchema.nullable().optional(),
});

export const userStatsSchema = z.looseObject({
  level: levelSchema,
  nextLevel: levelSchema.nullable().optional(),
  pointsToNextLevel: z.number().nullable().optional(),
  points30d: z.number(),
  totalPoints: z.number(),
  rankAllTime: z.number().nullable().optional(),
  progress: progressSchema,
});
export type UserStats = z.infer<typeof userStatsSchema>;

export const badgeSchema = z.looseObject({
  key: z.string(),
  title: z.string(),
  description: nullableString,
  category: nullableString,
  earned: z.boolean(),
  earnedAt: nullableString,
  progress: nullableNumber,
  assetPath: nullableString,
});
export type Badge = z.infer<typeof badgeSchema>;

export const leaderboardRowSchema = z.looseObject({
  rank: z.number(),
  points: z.number(),
  githubCommits: nullableNumber,
  level: levelSchema.optional(),
  user: authorSchema,
});
export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>;

export const ledgerRowSchema = z.looseObject({
  id: z.string(),
  amount: z.number(),
  label: z.string(),
  type: z.string().optional(),
  createdAt: z.string(),
});
export type LedgerRow = z.infer<typeof ledgerRowSchema>;

export const lockInSessionSchema = z.looseObject({
  id: z.string(),
  userId: z.string().optional(),
  title: nullableString,
  startedAt: z.string(),
  expiresAt: z.string(),
  endedAt: nullableString,
  automaticallyEnded: z.boolean().optional(),
  user: authorSchema.optional(),
});
export type LockInSession = z.infer<typeof lockInSessionSchema>;

export const lockInStateSchema = z.looseObject({
  current: lockInSessionSchema.nullable(),
  participants: z.array(lockInSessionSchema),
  serverNow: z.string(),
});
export type LockInState = z.infer<typeof lockInStateSchema>;

export const lockInTodoSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  completed: z.boolean().optional(),
});
export type LockInTodo = z.infer<typeof lockInTodoSchema>;

/** event/liveBanner is null when nothing is live or scheduled; otherwise loose. */
export const liveBannerSchema = z.looseObject({
  id: z.string().optional(),
  title: z.string().optional(),
  description: nullableString,
  startsAt: nullableString,
  endsAt: nullableString,
  youtubeVideoId: nullableString,
  status: nullableString,
  broadcastStatus: nullableString,
  url: nullableString,
  hashtag: nullableString,
});
export type LiveBanner = z.infer<typeof liveBannerSchema>;

export const calendarEventSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  type: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: nullableString,
  url: nullableString,
  description: nullableString,
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export const unreadSchema = z.object({
  notifications: z.number(),
  dms: z.number(),
  mentions: z.number(),
  total: z.number(),
});
export type Unread = z.infer<typeof unreadSchema>;

export const statusSchema = z.object({
  /** false until a key is configured. */
  keyPresent: z.boolean(),
  /** true once the key has answered getCurrentUser at least once. */
  connected: z.boolean(),
  error: z.string().nullable(),
  me: authorSchema.nullable(),
  unread: unreadSchema,
  live: liveBannerSchema.nullable(),
  lockIn: lockInSessionSchema.nullable(),
  pollIntervalSeconds: z.number(),
  defaultTimeline: z.boolean(),
});
export type Status = z.infer<typeof statusSchema>;

export const composeInputSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  topicSlugs: z.array(z.string()).max(10),
  projectId: z.string().nullable(),
  timeline: z.boolean(),
  mode: z.enum(["publish", "queue"]),
  linkPreviewUrl: z.string().nullable(),
});
export type ComposeInput = z.infer<typeof composeInputSchema>;

export const REALTIME_CHANNEL = "tinkerer";
/** Payloads on the realtime channel. `status` means re-fetch; `toast` shows one. */
export type RealtimeSignal =
  | { kind: "status" }
  | { kind: "toast"; tone: "info" | "success"; title: string; description?: string; href?: string };

export const rpcContract = defineRpcContract({
  status: { input: z.null(), output: statusSchema },
  refresh: { input: z.null(), output: statusSchema },
  timeline: {
    input: z.object({ cursor: z.string().optional(), topic: z.string().optional() }).strict(),
    output: z.object({ items: z.array(postSchema), nextCursor: z.string().nullable() }),
  },
  trending: { input: z.null(), output: z.array(z.object({ slug: z.string(), postCount: z.number() })) },
  post: { input: z.object({ id: z.string() }).strict(), output: postSchema },
  comments: {
    input: z.object({ postId: z.string(), cursor: z.string().optional() }).strict(),
    output: z.object({ items: z.array(commentSchema), nextCursor: z.string().nullable() }),
  },
  addComment: { input: z.object({ postId: z.string(), content: z.string().trim().min(1).max(4000) }).strict(), output: commentSchema },
  like: { input: z.object({ postId: z.string(), liked: z.boolean() }).strict(), output: postSchema },
  bookmark: { input: z.object({ postId: z.string() }).strict(), output: postSchema },
  notifications: {
    input: z.object({ cursor: z.string().optional() }).strict(),
    output: z.object({ items: z.array(notificationSchema), nextCursor: z.string().nullable() }),
  },
  markNotificationRead: { input: z.object({ id: z.string() }).strict(), output: z.object({ ok: z.boolean() }) },
  markAllNotificationsRead: { input: z.null(), output: z.object({ ok: z.boolean() }) },
  conversations: { input: z.null(), output: z.array(conversationSchema) },
  messages: {
    input: z.object({ conversationId: z.string(), cursor: z.string().optional() }).strict(),
    output: z.object({ messages: z.array(dmMessageSchema), nextCursor: z.string().nullable() }),
  },
  sendMessage: { input: z.object({ conversationId: z.string(), content: z.string().trim().min(1).max(4000) }).strict(), output: dmMessageSchema },
  markConversationRead: { input: z.object({ conversationId: z.string() }).strict(), output: z.object({ ok: z.boolean() }) },
  topicChats: { input: z.null(), output: z.array(topicChatSchema) },
  topicMessages: {
    input: z.object({ slug: z.string(), cursor: z.string().optional() }).strict(),
    output: z.object({ messages: z.array(topicChatMessageSchema), nextCursor: z.string().nullable() }),
  },
  sendTopicMessage: { input: z.object({ slug: z.string(), content: z.string().trim().min(1).max(4000) }).strict(), output: topicChatMessageSchema },
  markTopicRead: { input: z.object({ slug: z.string() }).strict(), output: z.object({ ok: z.boolean() }) },
  me: {
    input: z.null(),
    output: z.object({
      user: authorSchema,
      stats: userStatsSchema,
      balance: z.number(),
      badges: z.array(badgeSchema),
      commitsWeek: z.object({ commits: z.number(), rank: z.number() }).nullable(),
      ledger: z.array(ledgerRowSchema),
    }),
  },
  leaderboard: { input: z.object({ period: z.enum(["daily", "weekly", "monthly"]) }).strict(), output: z.array(leaderboardRowSchema) },
  lockIn: { input: z.null(), output: z.object({ state: lockInStateSchema, todos: z.array(lockInTodoSchema) }) },
  lockInStart: { input: z.object({ title: z.string().trim().max(200).optional() }).strict(), output: lockInStateSchema },
  lockInFinish: { input: z.object({ id: z.string() }).strict(), output: lockInStateSchema },
  lockInTodoCreate: { input: z.object({ title: z.string().trim().min(1).max(200) }).strict(), output: z.array(lockInTodoSchema) },
  lockInTodoUpdate: { input: z.object({ id: z.string(), completed: z.boolean() }).strict(), output: z.array(lockInTodoSchema) },
  lockInTodoDelete: { input: z.object({ id: z.string() }).strict(), output: z.array(lockInTodoSchema) },
  live: { input: z.null(), output: z.object({ banner: liveBannerSchema.nullable(), upcoming: z.array(calendarEventSchema) }) },
  composerData: { input: z.null(), output: z.object({ topics: z.array(topicSchema), projects: z.array(projectSchema) }) },
  previewLink: { input: z.object({ url: z.string().url() }).strict(), output: linkPreviewSchema.nullable() },
  createPost: { input: composeInputSchema, output: postSchema },
  threadTitle: { input: z.object({ threadId: z.string() }).strict(), output: z.object({ title: z.string().nullable() }) },
});
export type RpcContract = typeof rpcContract;
