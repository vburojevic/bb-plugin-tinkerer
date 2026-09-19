import { describe, expect, it } from "vitest";
import { classifyProcedure, isKnownProcedure } from "./policy";

describe("classifyProcedure", () => {
  it("blocks admin-only procedures regardless of settings", () => {
    for (const name of ["admin/listMembers", "bot/catalog", "bot/status", "post/analysis", "leaderboard/recapPreview"]) {
      expect(classifyProcedure(name)).toBe("blocked");
    }
  });

  it("classifies reads by their verb", () => {
    for (const name of [
      "post/timeline", "post/byId", "post/listComments", "post/previewLink", "post/trendingHashtags", "post/myDrafts",
      "notification/list", "notification/unreadCount", "messaging/myConversations", "messaging/messages/list",
      "topicChat/activeTopics", "leaderboard/myLevel", "leaderboard/userStats", "leaderboard/leaderboard",
      "leaderboard/githubCommits", "leaderboard/levels", "shop/wallet", "shop/catalog", "shop/ledger",
      "gamification/collection", "lockIn/state", "lockIn/todos", "event/calendar", "event/liveBanner",
      "event/liveById", "event/liveChat/list", "project/myProjects", "project/community", "topic/list",
      "topic/tree", "topic/feed", "search/all", "user/getCurrentUser", "user/getProfileByUsername",
      "user/listMembers", "friend/listFriends", "club/benefits", "club/giveaways", "club/unreadClubItems",
      "messaging/dmUnreadCount", "gear/productBySlug", "gear/mine", "friend/statusWith", "post/likedByMe", "club/benefitBySlug",
    ]) {
      expect(classifyProcedure(name), name).toBe("read");
    }
  });

  it("classifies everything else as a write", () => {
    for (const name of [
      "post/create", "post/like", "post/toggleBookmark", "post/addComment", "postQueue/sendNow",
      "notification/markRead", "messaging/messages/send", "topicChat/messages/send", "lockIn/start",
      "lockIn/finish", "lockIn/createTodo", "event/rsvp", "friend/sendRequest", "pointGifts/send",
    ]) {
      expect(classifyProcedure(name), name).toBe("write");
    }
  });
});

describe("isKnownProcedure", () => {
  it("accepts names from the generated catalog and rejects the rest", () => {
    expect(isKnownProcedure("post/timeline")).toBe(true);
    expect(isKnownProcedure("post/nope")).toBe(false);
    expect(isKnownProcedure("../etc")).toBe(false);
  });
});
