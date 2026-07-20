import type { RawMatch } from "./gazetteer";

/**
 * Recommendation-intent detection (PURE). A mention isn't a recommendation —
 * intent comes from structure. The highest-yield, highest-precision pattern is
 * the rec-seeking THREAD: "podcasts like X?", "求推荐类似《X》的播客". When a title
 * is asking for recs and names exactly one known show, that show is the seed
 * and every show named in the replies is a candidate recommendation.
 */

// Patterns run against normalized titles (lowercased, punctuation → spaces).
const REC_INTENT = [
  /podcasts? (?:like|similar to)/,
  /(?:shows?|anything|something) like/,
  /more like/,
  /similar to/,
  /if you (?:like|enjoy|love)/,
  /recommend\w* (?:for|after|like|if)/,
  /looking for .*(?:like|similar)/,
  // 中文: 类似X的播客 / 求推荐 / 有没有像…的 / 跟X差不多
  /类似/,
  /求推荐/,
  /(?:有没有|有無).*(?:类似|類似|推荐|推薦|像)/,
  /(?:推荐|推薦).*(?:播客|节目|節目)/,
  /(?:像|跟|和).*(?:一样|一樣|差不多|类似|類似)/,
];

/** True when a thread title reads as "recommend me shows like …". */
export function hasRecIntentTitle(normTitle: string): boolean {
  return REC_INTENT.some((re) => re.test(normTitle));
}

/**
 * The seed a rec-thread is about: only when the title asks for recs AND names
 * exactly one distinct show. Ambiguous titles (0 or >1 shows) yield null — we'd
 * rather miss an edge than attribute a recommendation to the wrong seed.
 */
export function detectThreadSeed(
  normTitle: string,
  titleMatches: RawMatch[],
): string | null {
  if (!hasRecIntentTitle(normTitle)) return null;
  const distinct = new Set(titleMatches.map((m) => m.showId));
  return distinct.size === 1 ? [...distinct][0] : null;
}

// Cue words that corroborate a bare/generic title mention (normalized forms).
const CUES = ["podcast", "pod", "播客", "节目", "節目", "电台", "電台", "radio", " fm"];

/** Whether a podcast cue word sits within `radius` code points of a match. */
export function hasCueNear(
  cpChars: string[],
  start: number,
  end: number,
  radius = 12,
): boolean {
  const from = Math.max(0, start - radius);
  const to = Math.min(cpChars.length, end + radius);
  const window = cpChars.slice(from, to).join("");
  return CUES.some((c) => window.includes(c.trim()));
}
