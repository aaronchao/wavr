import { describe, expect, it } from "vitest";
import { buildGazetteer, scan } from "@/src/core/mining/gazetteer";
import { detectThreadSeed, hasCueNear, hasRecIntentTitle } from "@/src/core/mining/intent";
import { normalize } from "@/src/core/mining/normalize";
import type { Alias } from "@/src/core/mining/types";

const aliases: Alias[] = [
  { showId: "gushi", alias: "故事FM" },
  { showId: "replyall", alias: "Reply All" },
  { showId: "radiolab", alias: "Radiolab" },
];
const gaz = buildGazetteer(aliases);

describe("hasRecIntentTitle", () => {
  it("recognizes English and Chinese rec-seeking titles", () => {
    expect(hasRecIntentTitle(normalize("Podcasts like Reply All?"))).toBe(true);
    expect(hasRecIntentTitle(normalize("有没有类似故事FM的播客推荐"))).toBe(true);
    expect(hasRecIntentTitle(normalize("求推荐好听的播客"))).toBe(true);
  });

  it("ignores non-rec titles", () => {
    expect(hasRecIntentTitle(normalize("Reply All is ending"))).toBe(false);
  });
});

describe("detectThreadSeed", () => {
  it("returns the single seed a rec-thread names", () => {
    const title = normalize("Podcasts like Reply All?");
    expect(detectThreadSeed(title, scan(gaz, title))).toBe("replyall");
  });

  it("returns null when the title names two shows (ambiguous)", () => {
    const title = normalize("Reply All vs Radiolab — which is more like a good doc?");
    // still rec-intent via "like", but two shows → ambiguous → skip
    expect(detectThreadSeed(title, scan(gaz, title))).toBeNull();
  });

  it("returns null without rec intent", () => {
    const title = normalize("Reply All final episode thread");
    expect(detectThreadSeed(title, scan(gaz, title))).toBeNull();
  });
});

describe("hasCueNear", () => {
  it("detects a podcast cue word near a span", () => {
    const cp = [...normalize("try the up podcast sometime")];
    const at = normalize("try the up podcast sometime").indexOf("up");
    expect(hasCueNear(cp, at, at + 2)).toBe(true);
  });
});
