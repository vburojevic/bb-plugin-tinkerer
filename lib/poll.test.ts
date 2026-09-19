import { describe, expect, it } from "vitest";
import { diffSignals, nextDelayMs, type PollSnapshot } from "./poll";

const base: PollSnapshot = {
  notifications: 0,
  dms: 0,
  mentions: 0,
  liveId: null,
  liveStartsAt: null,
};

describe("nextDelayMs", () => {
  it("returns the base interval after a success and backs off exponentially on failures, capped at 10 minutes", () => {
    expect(nextDelayMs(60_000, 0)).toBe(60_000);
    expect(nextDelayMs(60_000, 1)).toBe(120_000);
    expect(nextDelayMs(60_000, 2)).toBe(240_000);
    expect(nextDelayMs(60_000, 10)).toBe(600_000);
    expect(nextDelayMs(30_000, 0)).toBe(30_000);
  });
});

describe("diffSignals", () => {
  it("reports nothing on the first observation, so a fresh install stays quiet", () => {
    expect(diffSignals(null, { ...base, dms: 3, liveId: "ev1" })).toEqual([]);
  });

  it("emits a dm event only when the DM count rises", () => {
    expect(diffSignals({ ...base, dms: 1 }, { ...base, dms: 2 })).toEqual([{ kind: "dm", count: 2 }]);
    expect(diffSignals({ ...base, dms: 2 }, { ...base, dms: 1 })).toEqual([]);
    expect(diffSignals({ ...base, dms: 2 }, { ...base, dms: 2 })).toEqual([]);
  });

  it("emits a mention event when unread mentions rise", () => {
    expect(diffSignals(base, { ...base, mentions: 1 })).toEqual([{ kind: "mention", count: 1 }]);
  });

  it("emits live exactly once per broadcast id", () => {
    expect(diffSignals(base, { ...base, liveId: "ev1" })).toEqual([{ kind: "live", id: "ev1" }]);
    expect(diffSignals({ ...base, liveId: "ev1" }, { ...base, liveId: "ev1" })).toEqual([]);
    expect(diffSignals({ ...base, liveId: "ev1" }, { ...base, liveId: "ev2" })).toEqual([{ kind: "live", id: "ev2" }]);
    expect(diffSignals({ ...base, liveId: "ev1" }, base)).toEqual([]);
  });

  it("stays silent about plain notification count changes", () => {
    expect(diffSignals(base, { ...base, notifications: 9 })).toEqual([]);
  });
});
