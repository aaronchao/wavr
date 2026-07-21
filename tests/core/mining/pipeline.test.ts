import { describe, expect, it } from "vitest";
import { buildGazetteer } from "@/src/core/mining/gazetteer";
import { aggregateEdges, extractEdges, mineDocuments } from "@/src/core/mining/edges";
import type { Alias, RawDoc } from "@/src/core/mining/types";

const aliases: Alias[] = [
  { showId: "gushi", alias: "故事FM" },
  { showId: "huzuo", alias: "忽左忽右" },
  { showId: "shengdong", alias: "声东击西" },
  { showId: "replyall", alias: "Reply All" },
  { showId: "radiolab", alias: "Radiolab" },
];
const gaz = buildGazetteer(aliases);

const doc = (over: Partial<RawDoc>): RawDoc => ({
  id: "reddit:1",
  source: "reddit",
  lang: "en",
  title: "",
  body: "",
  author: "a1",
  url: "https://x/1",
  ...over,
});

describe("extractEdges (per document)", () => {
  it("emits seed → rec votes from a rec-seeking thread", () => {
    const edges = extractEdges(
      doc({
        title: "有没有类似故事FM的播客推荐",
        body: "推荐忽左忽右和声东击西，都很好听",
      }),
      gaz,
    );
    const recs = edges.map((e) => e.recShowId).sort();
    expect(recs).toEqual(["huzuo", "shengdong"]);
    expect(edges.every((e) => e.seedShowId === "gushi")).toBe(true);
    expect(edges.every((e) => e.sentiment > 0)).toBe(true); // 好听
  });

  it("excludes self-edges and non-rec threads", () => {
    expect(
      extractEdges(doc({ title: "故事FM 最新一期", body: "忽左忽右" }), gaz),
    ).toEqual([]); // not a rec thread → nothing
    const selfOnly = extractEdges(
      doc({ title: "Podcasts like Reply All?", body: "just Reply All again" }),
      gaz,
    );
    expect(selfOnly).toEqual([]); // only the seed appears → no self edge
  });

  it("pairs up shows in a seedless rec-intent thread (co-mention)", () => {
    // a "best podcasts" list names several shows but no single seed
    const edges = extractEdges(
      doc({ title: "Best podcasts? Share your favorites", body: "Radiolab and Reply All" }),
      gaz,
    );
    const pairs = edges.map((e) => `${e.recShowId}`).sort();
    // undirected: Radiolab <-> Reply All (both directions emitted)
    expect(pairs).toEqual(["radiolab", "replyall"]);
    expect(edges.every((e) => e.seedShowId !== e.recShowId)).toBe(true);
  });
});

describe("aggregateEdges (author-diversity gate)", () => {
  it("surfaces an edge only after ≥2 distinct authors vote", () => {
    const docs: RawDoc[] = [
      doc({ id: "r:1", author: "a1", title: "Podcasts like Reply All?", body: "Radiolab is great" }),
      doc({ id: "r:2", author: "a2", title: "anything like Reply All", body: "try Radiolab, so good" }),
      doc({ id: "r:3", author: "a3", title: "more like Reply All?", body: "故事FM" }), // single author for gushi
    ];
    const edges = mineDocuments(docs, gaz);
    // Radiolab: 2 authors → surfaces; 故事FM: 1 author → gated out
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      seedShowId: "replyall",
      recShowId: "radiolab",
      authorCount: 2,
      mentionCount: 2,
    });
    expect(edges[0].score).toBeGreaterThan(0);
    expect(edges[0].evidence.length).toBeGreaterThan(0);
    expect(edges[0].evidence[0].source).toBe("Reddit");
  });

  it("drops single-author spam", () => {
    const spam: RawDoc[] = [
      doc({ id: "s:1", author: "shill", title: "Podcasts like Reply All?", body: "Radiolab" }),
      doc({ id: "s:2", author: "shill", title: "shows like Reply All", body: "Radiolab" }),
    ];
    expect(aggregateEdges(spam.flatMap((d) => extractEdges(d, gaz)))).toEqual([]);
  });

  it("orders deterministically by score", () => {
    const docs: RawDoc[] = [
      doc({ id: "d1", author: "a1", title: "shows like Reply All?", body: "Radiolab" }),
      doc({ id: "d2", author: "a2", title: "anything like Reply All?", body: "Radiolab and 故事FM" }),
      doc({ id: "d3", author: "a3", title: "more like Reply All?", body: "故事FM" }),
    ];
    const edges = mineDocuments(docs, gaz);
    const scores = edges.map((e) => e.score);
    expect([...scores]).toEqual([...scores].sort((a, b) => b - a));
  });
});
