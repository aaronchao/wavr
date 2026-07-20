import { describe, expect, it } from "vitest";
import { buildGazetteer, scan } from "@/src/core/mining/gazetteer";
import { normalize } from "@/src/core/mining/normalize";
import type { Alias } from "@/src/core/mining/types";

const aliases: Alias[] = [
  { showId: "gushi", alias: "故事FM" },
  { showId: "huzuo", alias: "忽左忽右" },
  { showId: "replyall", alias: "Reply All" },
  { showId: "radiolab", alias: "Radiolab" },
];

const gaz = buildGazetteer(aliases);

describe("gazetteer scan", () => {
  it("finds known titles in normalized text (Latin + CJK)", () => {
    const hits = scan(gaz, normalize("I love Reply All and 忽左忽右"));
    expect(hits.map((h) => h.showId).sort()).toEqual(["huzuo", "replyall"]);
  });

  it("locates every occurrence with code-point spans", () => {
    const text = normalize("故事FM");
    const hits = scan(gaz, text);
    expect(hits).toHaveLength(1);
    expect([...text].slice(hits[0].start, hits[0].end).join("")).toBe("故事fm");
  });

  it("matches multiple distinct shows in one pass", () => {
    const hits = scan(gaz, normalize("Radiolab, Reply All, 故事FM"));
    expect(new Set(hits.map((h) => h.showId))).toEqual(
      new Set(["radiolab", "replyall", "gushi"]),
    );
  });

  it("returns nothing when no title is present", () => {
    expect(scan(gaz, normalize("just some random chatter"))).toHaveLength(0);
  });
});
