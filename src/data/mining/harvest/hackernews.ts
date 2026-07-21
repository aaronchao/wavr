import type { RawDoc } from "@/src/core/mining";
import { docLang, htmlToText, type HarvestSource, type Seed, USER_AGENT } from "./types";

/**
 * Hacker News harvester via the public Algolia search API — fully open, no
 * auth, reachable from GitHub Actions (unlike anonymous Reddit). For each seed
 * it pulls stories + comments mentioning the title; a comment carries its
 * parent story title (often "Ask HN: podcast recommendations…"), so the
 * extractor's co-mention path can pair up the shows a comment lists.
 * Best-effort: any failure returns null.
 */

type AlgoliaHit = {
  objectID?: string;
  title?: string | null;
  comment_text?: string | null;
  story_title?: string | null;
  author?: string | null;
};

/** PURE: turn an Algolia search response into harvest documents. */
export function parseHnHits(json: unknown): RawDoc[] {
  const hits = (json as { hits?: AlgoliaHit[] })?.hits;
  if (!Array.isArray(hits)) return [];
  const out: RawDoc[] = [];
  for (const h of hits) {
    if (!h?.objectID) continue;
    const isComment = typeof h.comment_text === "string" && h.comment_text.length > 0;
    const title = (isComment ? h.story_title : h.title)?.trim() ?? "";
    if (!title) continue;
    const body = isComment ? htmlToText(h.comment_text ?? "") : "";
    out.push({
      id: `hn:${h.objectID}`,
      source: "hackernews",
      lang: docLang(`${title} ${body}`),
      title,
      body,
      author: h.author ? `hn:${h.author}` : "hn:anon",
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    });
  }
  return out;
}

async function harvest(seed: Seed): Promise<RawDoc[] | null> {
  const q = encodeURIComponent(`${seed.title} podcast`);
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${q}&tags=(story,comment)&hitsPerPage=25`,
      { headers: { "User-Agent": USER_AGENT } },
    );
    if (!res.ok) return null;
    return parseHnHits(await res.json());
  } catch {
    return null;
  }
}

export const hackerNewsSource: HarvestSource = { id: "hackernews", mode: "seeded", harvest };
