import { NextResponse } from "next/server";
import { itunesTopChartShows } from "@/src/data/catalog/server";
import type {
  CatalogShow,
  DiscoverTopic,
  DiscoverTopicsResponse,
} from "@/src/data/catalog/types";

/**
 * Proxy: the Discover "pick a topic" row — a live mix of English + 中文 trending
 * topics. English chips are the categories trending across the reachable
 * discussion/chart pool; Chinese chips are the 中文 equivalents surfaced from
 * the CN pool (mapped to Chinese labels), padded from a curated set so the row
 * is always bilingual. Best-effort: unreachable upstream → static fallback.
 * (When `rec_edges` is populated its seed categories fold in here too.)
 */

const ZH_LABEL: Record<string, string> = {
  Business: "商业",
  Technology: "科技",
  "Society & Culture": "文化",
  News: "新闻",
  Comedy: "喜剧",
  History: "历史",
  "Health & Fitness": "情感",
  Education: "读书",
  "True Crime": "悬疑",
  Science: "科学",
  Arts: "生活",
  Sports: "运动",
  "TV & Film": "影视",
};

const EN_FALLBACK = [
  "Society & Culture", "Comedy", "News", "True Crime", "Technology", "Business", "History",
];
const ZH_FALLBACK = ["商业", "科技", "文化", "情感", "悬疑", "喜剧", "读书", "历史", "新闻", "生活"];

function tally(shows: CatalogShow[]): string[] {
  const count = new Map<string, number>();
  for (const s of shows) {
    for (const c of s.categories) {
      if (!c || c === "Podcasts") continue;
      count.set(c, (count.get(c) ?? 0) + 1);
    }
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

function pushUnique(arr: string[], v: string) {
  if (v && !arr.includes(v)) arr.push(v);
}

function interleave(a: DiscoverTopic[], b: DiscoverTopic[]): DiscoverTopic[] {
  const out: DiscoverTopic[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

export async function GET() {
  const [en, cn] = await Promise.all([
    itunesTopChartShows("us"),
    itunesTopChartShows("cn"),
  ]);

  const enLabels = (en && en.length > 0 ? tally(en) : EN_FALLBACK).slice(0, 7);
  const enTopics: DiscoverTopic[] = enLabels.map((c) => ({ label: c, query: c, lang: "en" }));

  const zhLabels: string[] = [];
  for (const c of cn && cn.length > 0 ? tally(cn) : []) {
    const zh = ZH_LABEL[c];
    if (zh) pushUnique(zhLabels, zh);
  }
  for (const z of ZH_FALLBACK) pushUnique(zhLabels, z);
  const zhTopics: DiscoverTopic[] = zhLabels.slice(0, 7).map((z) => ({ label: z, query: z, lang: "zh" }));

  const response: DiscoverTopicsResponse = {
    topics: interleave(enTopics, zhTopics),
    degraded: !en && !cn,
  };
  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
  });
}
