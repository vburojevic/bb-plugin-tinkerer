import { describe, expect, it } from "vitest";
import { countdown, excerpt, mediaUrl, postUrl, relativeTime } from "./format";

describe("format", () => {
  it("absolutizes platform-relative media paths and leaves absolute URLs alone", () => {
    expect(mediaUrl("/api/media/x.jpg")).toBe("https://app.tinkerer.club/api/media/x.jpg");
    expect(mediaUrl("https://cdn/x.png")).toBe("https://cdn/x.png");
    expect(mediaUrl(null)).toBeNull();
  });
  it("builds the web URL for a post from the author's username", () => {
    expect(postUrl({ id: "p1", author: { id: "u", username: "veki" } })).toBe("https://app.tinkerer.club/u/veki/post/p1");
    expect(postUrl({ id: "p1", author: { id: "u" } })).toBe("https://app.tinkerer.club/posts/p1");
  });
  it("formats relative time compactly", () => {
    const now = Date.parse("2026-09-19T12:00:00Z");
    expect(relativeTime("2026-09-19T11:59:40Z", now)).toBe("now");
    expect(relativeTime("2026-09-19T11:30:00Z", now)).toBe("30m");
    expect(relativeTime("2026-09-18T11:00:00Z", now)).toBe("1d");
  });
  it("counts down to zero and never below", () => {
    const now = Date.parse("2026-09-19T12:00:00Z");
    expect(countdown("2026-09-19T12:24:59Z", now)).toBe("24:59");
    expect(countdown("2026-09-19T11:00:00Z", now)).toBe("0:00");
  });
  it("excerpts on one line with an ellipsis", () => {
    expect(excerpt("a\n\nb   c")).toBe("a b c");
    expect(excerpt("x".repeat(200), 10)).toBe("xxxxxxxxx…");
  });
});
