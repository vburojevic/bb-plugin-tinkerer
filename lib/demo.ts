// Demo mode: a fictional Tinkerer Club served from memory.
//
// `bb tinkerer demo on` swaps the real client for this one so the panel can be
// shown, screenshotted and tried without a key and without anyone's real
// posts, messages or profile. Every member here is invented; avatars come
// from pravatar.cc and images from picsum.photos. Writes mutate the in-memory
// state so likes, votes, comments, posts and lock-ins behave like the real
// thing until the plugin reloads.
import type { TinkererClient } from "./client";

const BADGES = [{"key": "first-post", "title": "First spark", "description": "Publish your first post.", "category": "Foundation", "assetPath": "/badges/achievements/first-post.png", "threshold": 1, "metric": "posts", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "first-comment", "title": "Join the thread", "description": "Write your first comment.", "category": "Foundation", "assetPath": "/badges/achievements/first-comment.png", "threshold": 1, "metric": "comments", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "first-like", "title": "Good signal", "description": "Give your first like.", "category": "Foundation", "assetPath": "/badges/achievements/first-like.png", "threshold": 1, "metric": "likesGiven", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "first-friend", "title": "Better together", "description": "Make your first friend.", "category": "Foundation", "assetPath": "/badges/achievements/first-friend.png", "threshold": 1, "metric": "friends", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "first-interest", "title": "Find your people", "description": "Add your first interest.", "category": "Foundation", "assetPath": "/badges/achievements/first-interest.png", "threshold": 1, "metric": "interests", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "profile-25", "title": "Getting started", "description": "Complete 25% of your profile.", "category": "Foundation", "assetPath": "/badges/achievements/profile-25.png", "threshold": 25, "metric": "profileCompletion", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "profile-50", "title": "Halfway there", "description": "Complete 50% of your profile.", "category": "Foundation", "assetPath": "/badges/achievements/profile-50.png", "threshold": 50, "metric": "profileCompletion", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "profile-75", "title": "Almost known", "description": "Complete 75% of your profile.", "category": "Foundation", "assetPath": "/badges/achievements/profile-75.png", "threshold": 75, "metric": "profileCompletion", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "profile-100", "title": "Fully wired", "description": "Complete every profile step.", "category": "Foundation", "assetPath": "/badges/achievements/profile-100.png", "threshold": 100, "metric": "profileCompletion", "earned": false, "earnedAt": null, "progress": 10}, {"key": "posts-5", "title": "Warm keyboard", "description": "Publish 5 posts.", "category": "Publishing", "assetPath": "/badges/achievements/posts-5.png", "threshold": 5, "metric": "posts", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "posts-10", "title": "Regular signal", "description": "Publish 10 posts.", "category": "Publishing", "assetPath": "/badges/achievements/posts-10.png", "threshold": 10, "metric": "posts", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "posts-25", "title": "Field notes", "description": "Publish 25 posts.", "category": "Publishing", "assetPath": "/badges/achievements/posts-25.png", "threshold": 25, "metric": "posts", "earned": false, "earnedAt": null, "progress": 40}, {"key": "posts-50", "title": "Community voice", "description": "Publish 50 posts.", "category": "Publishing", "assetPath": "/badges/achievements/posts-50.png", "threshold": 50, "metric": "posts", "earned": false, "earnedAt": null, "progress": 10}, {"key": "posts-100", "title": "Centurion author", "description": "Publish 100 posts.", "category": "Publishing", "assetPath": "/badges/achievements/posts-100.png", "threshold": 100, "metric": "posts", "earned": false, "earnedAt": null, "progress": 10}, {"key": "first-article", "title": "Long form", "description": "Publish your first article.", "category": "Publishing", "assetPath": "/badges/achievements/first-article.png", "threshold": 1, "metric": "articles", "earned": false, "earnedAt": null, "progress": 10}, {"key": "articles-5", "title": "Columnist", "description": "Publish 5 articles.", "category": "Publishing", "assetPath": "/badges/achievements/articles-5.png", "threshold": 5, "metric": "articles", "earned": false, "earnedAt": null, "progress": 10}, {"key": "replies-10", "title": "Thread weaver", "description": "Write 10 nested replies.", "category": "Publishing", "assetPath": "/badges/achievements/replies-10.png", "threshold": 10, "metric": "replies", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "likes-given-10", "title": "Generous eye", "description": "Give 10 likes.", "category": "Community", "assetPath": "/badges/achievements/likes-given-10.png", "threshold": 10, "metric": "likesGiven", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "likes-received-10", "title": "Resonance", "description": "Receive 10 likes.", "category": "Community", "assetPath": "/badges/achievements/likes-received-10.png", "threshold": 10, "metric": "likesReceived", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "likes-received-50", "title": "Crowd favorite", "description": "Receive 50 likes.", "category": "Community", "assetPath": "/badges/achievements/likes-received-50.png", "threshold": 50, "metric": "likesReceived", "earned": false, "earnedAt": null, "progress": 40}, {"key": "likes-received-100", "title": "Signal boost", "description": "Receive 100 likes.", "category": "Community", "assetPath": "/badges/achievements/likes-received-100.png", "threshold": 100, "metric": "likesReceived", "earned": false, "earnedAt": null, "progress": 10}, {"key": "friends-5", "title": "Small circle", "description": "Make 5 friends.", "category": "Community", "assetPath": "/badges/achievements/friends-5.png", "threshold": 5, "metric": "friends", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "friends-15", "title": "Connector", "description": "Make 15 friends.", "category": "Community", "assetPath": "/badges/achievements/friends-15.png", "threshold": 15, "metric": "friends", "earned": false, "earnedAt": null, "progress": 40}, {"key": "friends-50", "title": "Club fixture", "description": "Make 50 friends.", "category": "Community", "assetPath": "/badges/achievements/friends-50.png", "threshold": 50, "metric": "friends", "earned": false, "earnedAt": null, "progress": 10}, {"key": "first-event", "title": "Count me in", "description": "Join your first event.", "category": "Community", "assetPath": "/badges/achievements/first-event.png", "threshold": 1, "metric": "eventsJoined", "earned": false, "earnedAt": null, "progress": 10}, {"key": "events-5", "title": "Show up", "description": "Join 5 events.", "category": "Maker", "assetPath": "/badges/achievements/events-5.png", "threshold": 5, "metric": "eventsJoined", "earned": false, "earnedAt": null, "progress": 10}, {"key": "first-host", "title": "Gathering maker", "description": "Host your first event.", "category": "Maker", "assetPath": "/badges/achievements/first-host.png", "threshold": 1, "metric": "eventsHosted", "earned": false, "earnedAt": null, "progress": 10}, {"key": "first-project", "title": "Out of the shed", "description": "Showcase your first project.", "category": "Maker", "assetPath": "/badges/achievements/first-project.png", "threshold": 1, "metric": "projects", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "projects-3", "title": "Workbench", "description": "Showcase 3 projects.", "category": "Maker", "assetPath": "/badges/achievements/projects-3.png", "threshold": 3, "metric": "projects", "earned": false, "earnedAt": null, "progress": 10}, {"key": "projects-10", "title": "Portfolio power", "description": "Showcase 10 projects.", "category": "Maker", "assetPath": "/badges/achievements/projects-10.png", "threshold": 10, "metric": "projects", "earned": false, "earnedAt": null, "progress": 10}, {"key": "first-repo", "title": "Open source", "description": "Showcase your first repository.", "category": "Maker", "assetPath": "/badges/achievements/first-repo.png", "threshold": 1, "metric": "repos", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "repos-5", "title": "Code shelf", "description": "Showcase 5 repositories.", "category": "Maker", "assetPath": "/badges/achievements/repos-5.png", "threshold": 5, "metric": "repos", "earned": false, "earnedAt": null, "progress": 10}, {"key": "stack-5", "title": "Toolbelt", "description": "Add 5 tools to your tech and AI stack.", "category": "Maker", "assetPath": "/badges/achievements/stack-5.png", "threshold": 5, "metric": "stack", "earned": false, "earnedAt": null, "progress": 10}, {"key": "commits-7", "title": "Seven-day shipper", "description": "Sync 7 GitHub contributions.", "category": "Explorer", "assetPath": "/badges/achievements/commits-7.png", "threshold": 7, "metric": "githubCommits", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "commits-100", "title": "Commit current", "description": "Sync 100 GitHub contributions.", "category": "Explorer", "assetPath": "/badges/achievements/commits-100.png", "threshold": 100, "metric": "githubCommits", "earned": false, "earnedAt": null, "progress": 10}, {"key": "commits-365", "title": "Daily builder", "description": "Sync 365 GitHub contributions.", "category": "Explorer", "assetPath": "/badges/achievements/commits-365.png", "threshold": 365, "metric": "githubCommits", "earned": false, "earnedAt": null, "progress": 10}, {"key": "interests-5", "title": "Curious mind", "description": "Pick 5 interests.", "category": "Explorer", "assetPath": "/badges/achievements/interests-5.png", "threshold": 5, "metric": "interests", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "interests-15", "title": "Renaissance tinkerer", "description": "Pick 15 interests.", "category": "Explorer", "assetPath": "/badges/achievements/interests-15.png", "threshold": 15, "metric": "interests", "earned": false, "earnedAt": null, "progress": 10}, {"key": "gamer", "title": "Player one", "description": "Turn on your gaming profile.", "category": "Explorer", "assetPath": "/badges/achievements/gamer.png", "threshold": 1, "metric": "isGamer", "earned": false, "earnedAt": null, "progress": 10}, {"key": "games-5", "title": "Party ready", "description": "Add 5 multiplayer games.", "category": "Explorer", "assetPath": "/badges/achievements/games-5.png", "threshold": 5, "metric": "games", "earned": false, "earnedAt": null, "progress": 10}, {"key": "games-10", "title": "Game library", "description": "Add 10 multiplayer games.", "category": "Explorer", "assetPath": "/badges/achievements/games-10.png", "threshold": 10, "metric": "games", "earned": false, "earnedAt": null, "progress": 10}, {"key": "level-2", "title": "Dabbler", "description": "Reach level 2.", "category": "Mastery", "assetPath": "/badges/achievements/level-2.png", "threshold": 2, "metric": "level", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "level-3", "title": "Tinkerer", "description": "Reach level 3.", "category": "Mastery", "assetPath": "/badges/achievements/level-3.png", "threshold": 3, "metric": "level", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "level-5", "title": "Builder", "description": "Reach level 5.", "category": "Mastery", "assetPath": "/badges/achievements/level-5.png", "threshold": 5, "metric": "level", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}, {"key": "level-7", "title": "Engineer", "description": "Reach level 7.", "category": "Mastery", "assetPath": "/badges/achievements/level-7.png", "threshold": 7, "metric": "level", "earned": false, "earnedAt": null, "progress": 40}, {"key": "level-10", "title": "Legend", "description": "Reach level 10.", "category": "Mastery", "assetPath": "/badges/achievements/level-10.png", "threshold": 10, "metric": "level", "earned": false, "earnedAt": null, "progress": 10}, {"key": "top-10", "title": "Top ten", "description": "Reach the all-time top 10.", "category": "Mastery", "assetPath": "/badges/achievements/top-10.png", "threshold": 10, "metric": "rank", "earned": false, "earnedAt": null, "progress": 10}, {"key": "top-3", "title": "On the podium", "description": "Reach the all-time top 3.", "category": "Mastery", "assetPath": "/badges/achievements/top-3.png", "threshold": 3, "metric": "rank", "earned": false, "earnedAt": null, "progress": 10}, {"key": "rank-1", "title": "Club champion", "description": "Reach first place all-time.", "category": "Mastery", "assetPath": "/badges/achievements/rank-1.png", "threshold": 1, "metric": "rank", "earned": false, "earnedAt": null, "progress": 10}, {"key": "early-100", "title": "Founding hundred", "description": "Join among the first 100 members.", "category": "Mastery", "assetPath": "/badges/achievements/early-100.png", "threshold": 100, "metric": "memberNumber", "earned": true, "earnedAt": "2026-09-01T10:00:00.000Z", "progress": 100}] as Array<Record<string, unknown>>;
const TOPICS = [{"id": "water-cooler", "slug": "water-cooler", "name": "Water Cooler", "emoji": "\u2615", "kind": "INTEREST", "_count": {"posts": 423}}, {"id": "cmrbcmrso000p3d6dy4jg4vtf", "slug": "ai-llms", "name": "AI & LLMs", "emoji": "\ud83e\udde0", "kind": "INTEREST", "_count": {"posts": 181}}, {"id": "cmrbcmuq6002d3d6d09fl1t07", "slug": "agents", "name": "Agents", "emoji": "\ud83d\udd75\ufe0f", "kind": "AI", "_count": {"posts": 85}}, {"id": "cmrbcmrwx000s3d6dqhkhp3k9", "slug": "self-hosting", "name": "Self-Hosting", "emoji": "\ud83c\udfe1", "kind": "INTEREST", "_count": {"posts": 50}}, {"id": "cmto2vgy2lcbg01mkkfn3h1fd", "slug": "gpt-6-astra", "name": "GPT 6 - Astra", "emoji": "\ud83d\udcab", "kind": "AI", "_count": {"posts": 49}}, {"id": "cmrbcms1m000v3d6d6pv7v3pe", "slug": "hardware", "name": "Hardware & Gadgets", "emoji": "\ud83d\udd27", "kind": "INTEREST", "_count": {"posts": 42}}, {"id": "cmrbcmul9002a3d6d8fwqg13f", "slug": "codex", "name": "Codex", "emoji": "\ud83e\uddd1\u200d\ud83d\udcbb", "kind": "AI", "_count": {"posts": 36}}, {"id": "tech-macos", "slug": "macos", "name": "macOS", "emoji": "\ud83c\udf4e", "kind": "TECH", "_count": {"posts": 31}}, {"id": "cmrbcmrpx000n3d6dusavvy7i", "slug": "web-development", "name": "Web Development", "emoji": "\ud83c\udf10", "kind": "INTEREST", "_count": {"posts": 30}}, {"id": "interest-memes", "slug": "memes", "name": "Memes", "emoji": "\ud83d\ude02", "kind": "INTEREST", "_count": {"posts": 28}}, {"id": "cmtbc04gw000201s2okg7ejng", "slug": "battlestations", "name": "Battlestations", "emoji": "\ud83d\udda5\ufe0f", "kind": "INTEREST", "_count": {"posts": 27}}, {"id": "cmrbcmrvl000r3d6dz2cqmgyf", "slug": "devops", "name": "DevOps & Infrastructure", "emoji": "\ud83d\ude80", "kind": "INTEREST", "_count": {"posts": 27}}, {"id": "cmrbcmuuo002g3d6drvs3r9kz", "slug": "local-ai", "name": "Local AI", "emoji": "\ud83c\udfe0", "kind": "AI", "_count": {"posts": 24}}, {"id": "cmrbcmujc00293d6dbh6572hi", "slug": "gpt", "name": "GPT", "emoji": "\ud83d\udcac", "kind": "AI", "_count": {"posts": 21}}, {"id": "cmrbcmut0002f3d6dnr5jemdd", "slug": "mcp", "name": "MCP", "emoji": "\ud83d\udd0c", "kind": "AI", "_count": {"posts": 21}}, {"id": "cmrbcmqub00013d6dp2ajdc2n", "slug": "electronics", "name": "Electronics", "emoji": "\ud83d\udd0c", "kind": "INTEREST", "_count": {"posts": 20}}, {"id": "cmrbcmsiv00163d6ddhvvs7zo", "slug": "startups", "name": "Startups & Indie Hacking", "emoji": "\ud83c\udf1f", "kind": "INTEREST", "_count": {"posts": 19}}, {"id": "cmrbcmqmo00003d6dfhwdl5jp", "slug": "3d-printing", "name": "3D Printing", "emoji": "\ud83d\udda8\ufe0f", "kind": "INTEREST", "_count": {"posts": 18}}, {"id": "cmrbcmucj00243d6dyy2xhc39", "slug": "claude", "name": "Claude", "emoji": "\ud83e\udd0d", "kind": "AI", "_count": {"posts": 18}}, {"id": "cmrbcmui000283d6dpcq1ovrz", "slug": "openai", "name": "OpenAI", "emoji": "\ud83c\udf00", "kind": "AI", "_count": {"posts": 18}}, {"id": "cmrbcmu9d00223d6dq9g3eodx", "slug": "vibe-coding", "name": "Vibe Coding", "emoji": "\u2728", "kind": "AI", "_count": {"posts": 17}}, {"id": "cmrbcmsd900123d6du3ik91d2", "slug": "design", "name": "Design & UI/UX", "emoji": "\ud83c\udfa8", "kind": "INTEREST", "_count": {"posts": 16}}, {"id": "tech-omarchy", "slug": "omarchy", "name": "Omarchy", "emoji": "\u2328\ufe0f", "kind": "TECH", "_count": {"posts": 16}}, {"id": "tech-operating-systems", "slug": "operating-systems", "name": "Operating Systems", "emoji": "\ud83d\udcbb", "kind": "TECH", "_count": {"posts": 16}}, {"id": "cmrbcmugs00273d6d003pn6qm", "slug": "claude-code", "name": "Claude Code", "emoji": "\u2328\ufe0f", "kind": "AI", "_count": {"posts": 14}}, {"id": "cmrbcmrmu000l3d6dd34yeb4c", "slug": "gaming", "name": "Gaming", "emoji": "\ud83c\udfae", "kind": "INTEREST", "_count": {"posts": 14}}, {"id": "gadget-iphone", "slug": "iphone", "name": "iPhone", "emoji": "\ud83d\udcf1", "kind": "GADGET", "_count": {"posts": 14}}, {"id": "cmrbcmqxg00033d6dajxam4hf", "slug": "home-automation", "name": "Home Automation", "emoji": "\ud83c\udfe0", "kind": "INTEREST", "_count": {"posts": 13}}, {"id": "cmrbcmue800253d6dgu8oaw6p", "slug": "fable-5", "name": "Fable 5", "emoji": "\ud83d\udcd6", "kind": "AI", "_count": {"posts": 12}}, {"id": "cmrbcmrfr000g3d6dpemabngy", "slug": "fitness", "name": "Fitness", "emoji": "\ud83d\udcaa", "kind": "INTEREST", "_count": {"posts": 12}}, {"id": "cmtahsu5w000201nxb9kje2im", "slug": "hermes", "name": "Hermes", "emoji": null, "kind": "AI", "_count": {"posts": 12}}, {"id": "cmrbcmrh7000h3d6dpu916bzq", "slug": "biohacking", "name": "Biohacking & Health", "emoji": "\ud83e\uddec", "kind": "INTEREST", "_count": {"posts": 11}}, {"id": "app-cursor-editor", "slug": "cursor-editor", "name": "Cursor", "emoji": "\u2301", "kind": "APP", "_count": {"posts": 11}}, {"id": "cmrbcmrol000m3d6djgrppb5z", "slug": "game-development", "name": "Game Development", "emoji": "\ud83d\udd79\ufe0f", "kind": "INTEREST", "_count": {"posts": 11}}, {"id": "cmte67p3f000301o3mau393kw", "slug": "grok-bot", "name": "Grok Bot", "emoji": "\ud83d\udc40", "kind": "AI", "_count": {"posts": 11}}, {"id": "tech-linux", "slug": "linux", "name": "Linux", "emoji": "\ud83d\udc27", "kind": "TECH", "_count": {"posts": 10}}, {"id": "cmrbcmshn00153d6dzyj0l8cl", "slug": "saas", "name": "SaaS", "emoji": "\u2601\ufe0f", "kind": "INTEREST", "_count": {"posts": 10}}, {"id": "cmrbcmuri002e3d6d45uyz0dv", "slug": "openclaw", "name": "OpenClaw", "emoji": "\ud83e\udd9e", "kind": "AI", "_count": {"posts": 9}}, {"id": "cmrbcmrrf000o3d6dmtg6y2ty", "slug": "mobile-development", "name": "Mobile Development", "emoji": "\ud83d\udcf1", "kind": "INTEREST", "_count": {"posts": 8}}, {"id": "cmrbcmrbv000d3d6d00qdv2xr", "slug": "parenting", "name": "Parenting", "emoji": "\ud83d\udc76", "kind": "INTEREST", "_count": {"posts": 8}}] as Array<{ id: string; slug: string; name: string; emoji: string | null; kind: string; _count: { posts: number } }>;

type Member = { id: string; name: string; username: string; avatarImageUrl: string; gravatarUrl: null; image: null; tinkererVerified: boolean };
const member = (id: string, name: string, username: string, img: number): Member => ({ id, name, username, avatarImageUrl: `https://i.pravatar.cc/150?img=${img}`, gravatarUrl: null, image: null, tinkererVerified: true });

export const ME = member("u-ada", "Ada Tinker", "ada", 47);
const MARA = member("u-mara", "Mara Okafor", "mara", 32);
const JONAS = member("u-jonas", "Jonas Lindqvist", "jonas", 12);
const PRIYA = member("u-priya", "Priya Raman", "priya", 26);
const TEO = member("u-teo", "Teo Marchetti", "teo", 59);
const LENA = member("u-lena", "Lena Hoff", "lena", 44);
const SAM = member("u-sam", "Sam Whitfield", "sam", 15);
const NOOR = member("u-noor", "Noor Haddad", "noor", 20);
const KAI = member("u-kai", "Kai Tanaka", "kai", 68);
const RUBY = member("u-ruby", "Ruby Castellanos", "ruby", 5);

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const topic = (slug: string) => {
  const t = TOPICS.find((x) => x.slug === slug);
  return t ? { slug: t.slug, name: t.name, emoji: t.emoji } : { slug, name: slug, emoji: null };
};

interface Post {
  id: string; authorId: string; type: "SHORT" | "ARTICLE"; publishState: "PUBLISHED"; publishedAt: string; createdAt: string;
  title: string | null; content: string; images: string[]; hashtags: string[]; projectId: null; project: null;
  author: Member; topics: Array<{ slug: string; name: string; emoji: string | null }>; bookmarkedByMe: boolean; commentCount: number;
  linkPreviews: Array<{ url: string; title: string; description: string; imageUrl: string | null; provider: string; author: string | null }>;
  likeCount: number; likedByMe: boolean; myReactions: string[]; reactions: Array<{ emoji: string; count: number }>; poll: Poll | null;
}
interface Poll { id: string; endsAt: string; isEnded: boolean; myOptionId: string | null; options: Array<{ id: string; label: string; emoji: null; percentage: number; voteCount: number }>; resultsVisible: boolean; totalVoteCount: number }

function post(p: Partial<Post> & { id: string; author: Member; content: string; minutes: number }): Post {
  const { minutes, ...rest } = p;
  return {
    type: "SHORT", publishState: "PUBLISHED", publishedAt: minutesAgo(minutes), createdAt: minutesAgo(minutes), title: null, images: [], hashtags: [], projectId: null, project: null,
    topics: [], bookmarkedByMe: false, commentCount: 0, linkPreviews: [], likeCount: 0, likedByMe: false, myReactions: [], reactions: [], poll: null, authorId: p.author.id,
    ...rest,
  };
}

const posts: Post[] = [
  post({ id: "d-1", author: MARA, minutes: 4, content: "Shipped the thing I kept putting off: my e-ink dashboard now pulls the household calendar, the bus times and the 3D printer queue. Six months of yak-shaving for one glance in the morning.", images: ["https://picsum.photos/seed/eink-dash/1200/800"], topics: [topic("hardware"), topic("self-hosting")], likeCount: 14, commentCount: 3, reactions: [{ emoji: "🔥", count: 9 }, { emoji: "👀", count: 5 }] }),
  post({ id: "d-2", author: JONAS, minutes: 23, content: "Would you let an agent open PRs on your main project without reading the diff first?", poll: { id: "poll-1", endsAt: new Date(Date.now() + 86_400_000).toISOString(), isEnded: false, myOptionId: null, resultsVisible: true, totalVoteCount: 41, options: [{ id: "o1", label: "Yes, tests are the review", emoji: null, percentage: 22, voteCount: 9 }, { id: "o2", label: "Only on branches I can throw away", emoji: null, percentage: 54, voteCount: 22 }, { id: "o3", label: "Never", emoji: null, percentage: 24, voteCount: 10 }] }, topics: [topic("agents")], likeCount: 6, commentCount: 12 }),
  post({ id: "d-3", author: PRIYA, minutes: 58, content: "Wrote up how I keep four laptops in sync with one nix flake and zero opinions about editors. https://priya.dev/nix-for-normal-people", linkPreviews: [{ url: "https://priya.dev/nix-for-normal-people", title: "Nix for normal people", description: "One flake, four machines, no sermon. The setup I wish someone had handed me a year ago.", imageUrl: "https://picsum.photos/seed/nix-flake/1200/630", provider: "priya.dev", author: "Priya Raman" }], topics: [topic("devops")], likeCount: 27, commentCount: 8, reactions: [{ emoji: "🚀", count: 11 }] }),
  post({ id: "d-4", author: TEO, minutes: 130, type: "ARTICLE", title: "What I learned running a local model for every commit message", content: "For three months every commit on my machine got its message from a 7B model running on the laptop. Here is what held up, what did not, and the one prompt change that made it useful.\n\nThe short version: small models are great at summarising a diff and terrible at deciding what matters. The fix was not a bigger model. It was giving it the ticket title and the last three messages on the branch, so it could tell a refactor from a fix.\n\nLatency stayed under two seconds on an M2 Air once I stopped sending the whole diff and started sending the hunks that touched more than five lines. The rest of the article walks through the hook, the prompt, and the twelve commits where it was confidently wrong.\n\nIf you try it, start with the prompt in the repo and do not skip the part where you keep a human in the loop for the first week.", topics: [topic("local-ai"), topic("ai-llms")], likeCount: 41, commentCount: 15, reactions: [{ emoji: "🧠", count: 19 }] }),
  post({ id: "d-5", author: LENA, minutes: 240, content: "Battlestation, September edition. The cable management lasted eleven days.", images: ["https://picsum.photos/seed/desk-sept/1200/800", "https://picsum.photos/seed/desk-cables/1200/800"], topics: [topic("battlestations")], likeCount: 33, commentCount: 6, reactions: [{ emoji: "😂", count: 14 }] }),
  post({ id: "d-6", author: SAM, minutes: 380, content: "Lock-in worked. Two hours, phone in the other room, the MCP server for our support inbox finally answers in under 300ms. #zerotoshipped", hashtags: ["zerotoshipped"], topics: [topic("mcp")], likeCount: 18, commentCount: 2 }),
  post({ id: "d-7", author: NOOR, minutes: 600, content: "Tiny win: replaced a 400-line bash deploy script with a 40-line one that fails loudly. Turns out most of the old lines were apologising.", topics: [topic("devops")], likeCount: 22, commentCount: 4, reactions: [{ emoji: "😂", count: 8 }, { emoji: "🔥", count: 6 }] }),
  post({ id: "d-8", author: KAI, minutes: 900, content: "Anyone else running their agents inside a VM they can snapshot? Rolled back twice this week and it felt like cheating. https://github.com/kaitanaka/agent-vm", linkPreviews: [{ url: "https://github.com/kaitanaka/agent-vm", title: "kaitanaka/agent-vm", description: "Shell · ★ 212 · 18 forks", imageUrl: null, provider: "GITHUB", author: "@kaitanaka" }], topics: [topic("agents"), topic("self-hosting")], likeCount: 12, commentCount: 5 }),
];

const comments: Record<string, Array<{ id: string; postId: string; content: string; parentId: null; createdAt: string; author: Member; images: string[] }>> = {
  "d-1": [
    { id: "c-1", postId: "d-1", content: "The bus times are the killer feature. Which display?", parentId: null, createdAt: minutesAgo(3), author: JONAS, images: [] },
    { id: "c-2", postId: "d-1", content: "7.5\" Waveshare, refreshes every two minutes. Ghosting is fine if you never look closely.", parentId: null, createdAt: minutesAgo(2), author: MARA, images: [] },
    { id: "c-3", postId: "d-1", content: "Six months well spent.", parentId: null, createdAt: minutesAgo(1), author: PRIYA, images: [] },
  ],
};

const notifications = [
  { id: "n-1", type: "SYSTEM", title: "Mara reacted 🔥 to your post", body: null, link: "/posts/d-9", data: { kind: "reaction", postId: "d-9" }, read: false, createdAt: minutesAgo(6), actor: MARA },
  { id: "n-2", type: "SYSTEM", title: "Jonas commented on your post", body: "Does it survive a reboot?", link: "/posts/d-9", data: { kind: "comment", postId: "d-9" }, read: false, createdAt: minutesAgo(18), actor: JONAS },
  { id: "n-3", type: "SYSTEM", title: "Priya replied to your comment", body: null, link: "/posts/d-3", data: { kind: "comment_reply", postId: "d-3" }, read: false, createdAt: minutesAgo(45), actor: PRIYA },
  { id: "n-4", type: "SYSTEM", title: "Teo reacted 🧠 to your comment", body: null, link: "/posts/d-4", data: { kind: "comment_reaction", postId: "d-4" }, read: true, createdAt: minutesAgo(200), actor: TEO },
  { id: "n-5", type: "SYSTEM", title: "Lena reacted 😂 to your post", body: null, link: "/posts/d-9", data: { kind: "reaction", postId: "d-9" }, read: true, createdAt: minutesAgo(400), actor: LENA },
  { id: "n-6", type: "SYSTEM", title: "Sam commented on your post", body: null, link: "/posts/d-9", data: { kind: "comment", postId: "d-9" }, read: true, createdAt: minutesAgo(1500), actor: SAM },
  { id: "n-7", type: "SYSTEM", title: "Noor reacted 🚀 to your post", body: null, link: "/posts/d-9", data: { kind: "reaction", postId: "d-9" }, read: true, createdAt: minutesAgo(2900), actor: NOOR },
];

const conversations = [
  { id: "cv-1", type: "DM", name: null, icon: null, otherUser: MARA, lastMessage: { content: "Send me the flake when you get a sec?", createdAt: minutesAgo(12), senderId: MARA.id }, lastMessageAt: minutesAgo(12), unreadCount: 2, memberCount: null },
  { id: "cv-2", type: "DM", name: null, icon: null, otherUser: JONAS, lastMessage: { content: "ha, same. see you at build night", createdAt: minutesAgo(340), senderId: ME.id }, lastMessageAt: minutesAgo(340), unreadCount: 0, memberCount: null },
  { id: "cv-3", type: "ROOM", name: "Hardware nerds", icon: "🔩", otherUser: null, lastMessage: { content: "the pcb came back and it is beautiful", createdAt: minutesAgo(1200), senderId: LENA.id }, lastMessageAt: minutesAgo(1200), unreadCount: 0, memberCount: 9 },
];
const messages: Record<string, Array<{ id: string; conversationId: string; senderId: string; content: string; createdAt: string; sender: Member; attachments: string[]; deletedAt: null }>> = {
  "cv-1": [
    { id: "m-1", conversationId: "cv-1", senderId: ME.id, content: "Your dashboard post made me finally order the e-ink panel.", createdAt: minutesAgo(40), sender: ME, attachments: [], deletedAt: null },
    { id: "m-2", conversationId: "cv-1", senderId: MARA.id, content: "Ha! Fair warning, the first week is all driver pain.", createdAt: minutesAgo(30), sender: MARA, attachments: [], deletedAt: null },
    { id: "m-3", conversationId: "cv-1", senderId: MARA.id, content: "Send me the flake when you get a sec?", createdAt: minutesAgo(12), sender: MARA, attachments: [], deletedAt: null },
  ],
  "cv-2": [{ id: "m-4", conversationId: "cv-2", senderId: ME.id, content: "ha, same. see you at build night", createdAt: minutesAgo(340), sender: ME, attachments: [], deletedAt: null }],
  "cv-3": [{ id: "m-5", conversationId: "cv-3", senderId: LENA.id, content: "the pcb came back and it is beautiful", createdAt: minutesAgo(1200), sender: LENA, attachments: [], deletedAt: null }],
};

const topicChats = [
  { slug: "agents", name: "Agents", emoji: "🕵️", kind: "INTEREST", messageCount: 212, unreadMentionCount: 1, lastMessage: { content: "@ada did you try the snapshot trick?", createdAt: minutesAgo(9), kind: "TEXT" } },
  { slug: "self-hosting", name: "Self-Hosting", emoji: "🏡", kind: "INTEREST", messageCount: 340, unreadMentionCount: 0, lastMessage: { content: "Everything I self-host and what it replaced", createdAt: minutesAgo(70), kind: "POST_REF" } },
  { slug: "hardware", name: "Hardware & Gadgets", emoji: "🔧", kind: "INTEREST", messageCount: 128, unreadMentionCount: 0, lastMessage: { content: "the e-ink dashboard thread is glorious", createdAt: minutesAgo(180), kind: "TEXT" } },
  { slug: "local-ai", name: "Local AI", emoji: "🏠", kind: "INTEREST", messageCount: 96, unreadMentionCount: 0, lastMessage: { content: "7B for commit messages, thread inside", createdAt: minutesAgo(400), kind: "POST_REF" } },
];
const topicMessages: Record<string, Array<{ id: string; userId: string; kind: string; content: string; postId: null; createdAt: string; user: Member; deletedAt: null; attachments: string[] }>> = {
  agents: [
    { id: "t-1", userId: KAI.id, kind: "TEXT", content: "Rolled back a whole afternoon of agent edits in one snapshot. Recommend.", postId: null, createdAt: minutesAgo(25), user: KAI, deletedAt: null, attachments: [] },
    { id: "t-2", userId: RUBY.id, kind: "TEXT", content: "Which hypervisor? UTM or something lighter?", postId: null, createdAt: minutesAgo(15), user: RUBY, deletedAt: null, attachments: [] },
    { id: "t-3", userId: KAI.id, kind: "TEXT", content: "@ada did you try the snapshot trick?", postId: null, createdAt: minutesAgo(9), user: KAI, deletedAt: null, attachments: [] },
  ],
};

const leaderboard = [
  { rank: 1, points: 1486, githubCommits: 724, level: { level: 10, name: "Legend", minPoints: 2500 }, user: MARA },
  { rank: 2, points: 902, githubCommits: 144, level: { level: 9, name: "Wizard", minPoints: 1800 }, user: JONAS },
  { rank: 3, points: 730, githubCommits: 77, level: { level: 8, name: "Architect", minPoints: 1200 }, user: PRIYA },
  { rank: 4, points: 655, githubCommits: 210, level: { level: 8, name: "Architect", minPoints: 1200 }, user: TEO },
  { rank: 5, points: 640, githubCommits: 58, level: { level: 6, name: "Hacker", minPoints: 500 }, user: ME },
  { rank: 6, points: 512, githubCommits: 31, level: { level: 7, name: "Engineer", minPoints: 800 }, user: LENA },
  { rank: 7, points: 498, githubCommits: 12, level: { level: 6, name: "Hacker", minPoints: 500 }, user: SAM },
  { rank: 8, points: 401, githubCommits: 95, level: { level: 6, name: "Hacker", minPoints: 500 }, user: NOOR },
  { rank: 9, points: 377, githubCommits: 40, level: { level: 5, name: "Builder", minPoints: 300 }, user: KAI },
  { rank: 10, points: 350, githubCommits: 8, level: { level: 5, name: "Builder", minPoints: 300 }, user: RUBY },
];

let lockIn: { id: string; userId: string; title: string | null; startedAt: string; expiresAt: string; endedAt: string | null; automaticallyEnded: boolean } | null = {
  id: "li-1", userId: ME.id, title: "Ship the e-ink driver fix", startedAt: minutesAgo(23), expiresAt: new Date(Date.now() + 37 * 60_000).toISOString(), endedAt: null, automaticallyEnded: false,
};
let todos: Array<{ id: string; title: string; completed: boolean }> = [
  { id: "td-1", title: "Reproduce the ghosting on a cold boot", completed: true },
  { id: "td-2", title: "Patch the refresh timing", completed: false },
  { id: "td-3", title: "Post the before/after", completed: false },
];

const live = { id: "ev-live", title: "Build night: agents that ship", description: "Four members demo the agent workflows they actually use, then open mic.", startsAt: minutesAgo(15), endsAt: new Date(Date.now() + 90 * 60_000).toISOString(), youtubeVideoId: "dQw4w9WgXcQ", status: "LIVE", broadcastStatus: "LIVE", url: null, hashtag: "buildnight" };
const calendar = [
  { id: "ev-2", title: "Hardware show and tell", type: "ONLINE", startsAt: new Date(Date.now() + 2 * 86_400_000).toISOString(), endsAt: null, url: null, description: null },
  { id: "ev-3", title: "Berlin meetup at the makerspace", type: "IN_PERSON", startsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(), endsAt: null, url: null, description: null },
];

let counter = 100;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

function page<T>(items: T[], input: Record<string, unknown>, size = 20) {
  const cursor = typeof input.cursor === "string" ? Number(input.cursor) : 0;
  const limit = typeof input.limit === "number" ? input.limit : size;
  const slice = items.slice(cursor, cursor + limit);
  return { items: slice, nextCursor: cursor + limit < items.length ? String(cursor + limit) : null };
}

function handle(path: string, input: Record<string, unknown>): unknown {
  const id = typeof input.id === "string" ? input.id : "";
  const postId = typeof input.postId === "string" ? input.postId : "";
  const find = (pid: string) => posts.find((p) => p.id === pid);
  switch (path) {
    case "user/getCurrentUser": return ME;
    case "notification/unreadCount": return notifications.filter((n) => !n.read).length;
    case "messaging/dmUnreadCount": return conversations.filter((c) => c.type === "DM").reduce((s, c) => s + c.unreadCount, 0);
    case "messaging/unreadCount": return conversations.reduce((s, c) => s + c.unreadCount, 0);
    case "topicChat/activeTopics": return topicChats;
    case "event/liveBanner": return live;
    case "event/calendar": return calendar;
    case "lockIn/state": return { current: lockIn, participants: [{ id: "li-2", title: "Rewriting the deploy script", startedAt: minutesAgo(40), expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(), user: NOOR }, { id: "li-3", title: null, startedAt: minutesAgo(5), expiresAt: new Date(Date.now() + 55 * 60_000).toISOString(), user: SAM }], onboarded: true, serverNow: new Date().toISOString() };
    case "lockIn/todos": return todos;
    case "lockIn/start": lockIn = { id: nextId("li"), userId: ME.id, title: typeof input.title === "string" ? input.title : null, startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 3_600_000).toISOString(), endedAt: null, automaticallyEnded: false }; return lockIn;
    case "lockIn/finish": if (lockIn) lockIn = { ...lockIn, endedAt: new Date().toISOString() }; return lockIn;
    case "lockIn/createTodo": todos = [...todos, { id, title: String(input.title ?? ""), completed: false }]; return todos;
    case "lockIn/updateTodo": todos = todos.map((t) => (t.id === id ? { ...t, completed: input.completed === true } : t)); return todos;
    case "lockIn/deleteTodo": todos = todos.filter((t) => t.id !== id); return todos;
    case "post/timeline": return page(posts, input);
    case "post/byHashtag": return page(posts.filter((p) => p.hashtags.includes(String(input.slug))), input);
    case "post/byTopic": return page(posts.filter((p) => p.topics.some((t) => t.slug === String(input.slug))), input);
    case "topic/feed": return page(posts.filter((p) => p.topics.some((t) => t.slug === String(input.slug))), input);
    case "post/trendingHashtags": return [{ slug: "zerotoshipped", postCount: 7 }, { slug: "buildnight", postCount: 5 }, { slug: "battlestation", postCount: 4 }, { slug: "eink", postCount: 2 }];
    case "topic/listWithStats": return TOPICS;
    case "topic/list": return TOPICS.map(({ _count, ...t }) => t);
    case "post/byId": return find(id) ?? posts[0];
    case "post/listComments": return { items: comments[postId] ?? [], nextCursor: null };
    case "post/addComment": { const c = { id: nextId("c"), postId, content: String(input.content ?? ""), parentId: null, createdAt: new Date().toISOString(), author: ME, images: [] }; comments[postId] = [...(comments[postId] ?? []), c]; const p = find(postId); if (p) p.commentCount += 1; return c; }
    case "post/like": {
      const p = find(postId);
      const emoji = typeof input.reaction === "string" ? input.reaction : "❤️";
      if (p && emoji !== "❤️") {
        if (!p.myReactions.includes(emoji)) {
          p.myReactions = [...p.myReactions, emoji];
          const r = p.reactions.find((x) => x.emoji === emoji);
          if (r) r.count += 1; else p.reactions.push({ emoji, count: 1 });
        }
      } else if (p && !p.likedByMe) { p.likedByMe = true; p.likeCount += 1; }
      return { ok: true };
    }
    case "post/unlike": {
      const p = find(postId);
      const emoji = typeof input.reaction === "string" ? input.reaction : "❤️";
      if (p && emoji !== "❤️") {
        if (p.myReactions.includes(emoji)) {
          p.myReactions = p.myReactions.filter((x) => x !== emoji);
          const r = p.reactions.find((x) => x.emoji === emoji);
          if (r) { r.count -= 1; if (r.count <= 0) p.reactions = p.reactions.filter((x) => x !== r); }
        }
      } else if (p && p.likedByMe) { p.likedByMe = false; p.likeCount -= 1; }
      return { ok: true };
    }
    case "post/toggleBookmark": { const p = find(postId); if (p) p.bookmarkedByMe = !p.bookmarkedByMe; return { ok: true }; }
    case "post/votePoll": { const p = find(postId); if (p?.poll && !p.poll.myOptionId) { p.poll.myOptionId = String(input.optionId); p.poll.totalVoteCount += 1; for (const o of p.poll.options) { if (o.id === input.optionId) o.voteCount += 1; o.percentage = Math.round((o.voteCount / p.poll.totalVoteCount) * 100); } } return { ok: true }; }
    case "post/previewLink": { const url = String(input.url ?? ""); let host = url; try { host = new URL(url).hostname; } catch { /* keep */ } return { url, title: host === "getbb.app" ? "bb" : `Preview of ${host}`, description: "A link preview the composer fetched on its own.", imageUrl: `https://picsum.photos/seed/${encodeURIComponent(host)}/1200/630`, provider: host.toUpperCase().includes("GITHUB") ? "GITHUB" : "WEBSITE", author: null }; }
    case "post/create": { const p = post({ id: nextId("d"), author: ME, minutes: 0, content: String(input.content ?? ""), topics: Array.isArray(input.topicSlugs) ? (input.topicSlugs as string[]).map(topic) : [] }); posts.unshift(p); return p; }
    case "notification/list": return page(notifications, input, 30);
    case "notification/markRead": { const n = notifications.find((x) => x.id === id); if (n) n.read = true; return { ok: true }; }
    case "notification/markAllRead": for (const n of notifications) n.read = true; return { ok: true };
    case "messaging/myConversations": return conversations;
    case "messaging/messages/list": { const list = [...(messages[String(input.conversationId)] ?? [])].reverse(); return { messages: list, nextCursor: null, typingAt: null }; }
    case "messaging/messages/send": { const cid = String(input.conversationId); const m = { id: nextId("m"), conversationId: cid, senderId: ME.id, content: String(input.content ?? ""), createdAt: new Date().toISOString(), sender: ME, attachments: [], deletedAt: null }; messages[cid] = [...(messages[cid] ?? []), m]; const c = conversations.find((x) => x.id === cid); if (c) { c.lastMessage = { content: m.content, createdAt: m.createdAt, senderId: ME.id }; c.lastMessageAt = m.createdAt; } return m; }
    case "messaging/markRead": { const c = conversations.find((x) => x.id === String(input.conversationId)); if (c) c.unreadCount = 0; return { ok: true }; }
    case "topicChat/messages/list": { const list = [...(topicMessages[String(input.topicSlug)] ?? [])].reverse(); return { messages: list, nextCursor: null }; }
    case "topicChat/messages/send": { const slug = String(input.topicSlug); const m = { id: nextId("t"), userId: ME.id, kind: "TEXT", content: String(input.content ?? ""), postId: null, createdAt: new Date().toISOString(), user: ME, deletedAt: null, attachments: [] }; topicMessages[slug] = [...(topicMessages[slug] ?? []), m]; return m; }
    case "topicChat/markRead": { const t = topicChats.find((x) => x.slug === String(input.topicSlug)); if (t) t.unreadMentionCount = 0; return { ok: true }; }
    case "leaderboard/userStats": return { level: { level: 6, name: "Hacker", minPoints: 500 }, nextLevel: { level: 7, name: "Engineer", minPoints: 800 }, pointsToNextLevel: 160, points30d: 640, totalPoints: 1180, rankAllTime: 5, progress: { earnedInLevel: 140, neededForNext: 300, ratio: 0.47, level: { level: 6, name: "Hacker", minPoints: 500 }, next: { level: 7, name: "Engineer", minPoints: 800 } } };
    case "leaderboard/myLevel": return { level: { level: 6, name: "Hacker", minPoints: 500 }, points30d: 640 };
    case "shop/wallet": return { balance: 1180, points30d: 640, level30d: { level: 6, name: "Hacker", minPoints: 500 }, privileges: { locked: [], unlocked: [] }, progress: { earnedInLevel: 140, neededForNext: 300, ratio: 0.47, level: { level: 6, name: "Hacker", minPoints: 500 }, next: { level: 7, name: "Engineer", minPoints: 800 } } };
    case "gamification/collection": return { badges: BADGES };
    case "leaderboard/githubCommits": return { rows: leaderboard.map((r) => ({ commits: r.githubCommits, githubLogin: r.user.username, rank: r.rank, user: r.user })) };
    case "shop/ledger": return { rows: [{ id: "lg-1", amount: 25, label: "Post reached 25 likes", type: "EARNED", createdAt: minutesAgo(90) }, { id: "lg-2", amount: 15, label: "Received from Mara · gold", type: "TRANSFER_RECEIVED", createdAt: minutesAgo(600) }, { id: "lg-3", amount: 10, label: "Seven-day commit streak", type: "EARNED", createdAt: minutesAgo(1500) }, { id: "lg-4", amount: -40, label: "Redeemed: club sticker pack", type: "SPENT", createdAt: minutesAgo(4000) }], nextCursor: null };
    case "leaderboard/leaderboard": return leaderboard;
    case "leaderboard/levels": return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => ({ level: l, minPoints: [0, 25, 75, 150, 300, 500, 800, 1200, 1800, 2500][l - 1], name: ["Curious", "Dabbler", "Tinkerer", "Maker", "Builder", "Hacker", "Engineer", "Architect", "Wizard", "Legend"][l - 1] }));
    case "project/myProjects": return [];
    case "search/all": return { members: [{ id: MARA.id, title: MARA.name, subtitle: `@${MARA.username}`, href: `/u/${MARA.username}` }], posts: posts.slice(0, 3).map((p) => ({ id: p.id, title: p.content.slice(0, 80), subtitle: `${p.author.name} · @${p.author.username}`, href: `/u/${p.author.username}/post/${p.id}` })), articles: [], chats: [] };
    default: return {};
  }
}

export function createDemoClient(): TinkererClient {
  return {
    hasKey: () => true,
    invalidate: () => {},
    call: async <T>(path: string, input: Record<string, unknown>) => handle(path, input) as T,
  };
}
