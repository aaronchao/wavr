import type { RawDoc } from "@/src/core/mining";
import { doubanSource } from "./douban";
import { hackerNewsSource } from "./hackernews";
import { redditSource } from "./reddit";
import type { HarvestSource, Seed } from "./types";

export type { HarvestSource, Seed } from "./types";
export { parseRedditListing } from "./reddit";
export { parseRssDocs } from "./douban";
export { parseHnHits } from "./hackernews";

/**
 * Harvest sources. Hacker News + Reddit are seeded/EN; Douban is bulk/ZH.
 * Hacker News uses a fully-open API (no auth, reachable from CI), so it's the
 * reliable baseline while Reddit needs OAuth and Douban needs RSSHub. PTT /
 * Dcard / LIHKG and the promoted Xiaohongshu / Discord adapters plug in here
 * behind the same interface as later waves land.
 */
export const SOURCES: HarvestSource[] = [hackerNewsSource, redditSource, doubanSource];

/**
 * Run every source once for this seed set and return a deduped document pile.
 * Bulk sources fetch once; seeded sources are searched per seed. Purely
 * orchestration — extraction/scoring happens in /src/core/mining.
 */
export async function harvestAll(seeds: Seed[]): Promise<RawDoc[]> {
  const byId = new Map<string, RawDoc>();
  const add = (docs: RawDoc[] | null) => {
    for (const d of docs ?? []) if (!byId.has(d.id)) byId.set(d.id, d);
  };

  for (const src of SOURCES) {
    if (src.mode === "bulk") {
      add(await src.harvest());
    } else {
      for (const seed of seeds) add(await src.harvest(seed));
    }
  }
  return [...byId.values()];
}
