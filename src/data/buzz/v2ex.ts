import type { BuzzInput } from "@/src/core/recommend";

/**
 * V2EX discussion volume via sov2ex (the community's free full-text search
 * API over V2EX). Server-side only, cached per title. A niche but high-signal
 * Chinese tech/interest community — exactly the kind of forum chatter Wavr
 * wants to surface over the mainstream charts. Any failure returns null and
 * the signal is simply skipped.
 */

const REVALIDATE_SECONDS = 24 * 60 * 60;

export async function v2exBuzz(title: string): Promise<BuzzInput | null> {
  const q = encodeURIComponent(`${title} 播客`);
  try {
    const res = await fetch(
      `https://www.sov2ex.com/api/search?q=${q}&size=20&sort=sumup`,
      {
        next: { revalidate: REVALIDATE_SECONDS },
        headers: { "User-Agent": "wavr/0.1 (personal podcast discovery)" },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      total?: number;
      hits?: { _source?: { title?: string } }[];
    };
    // count hits whose title actually mentions the show (avoid loose matches)
    const needle = title.trim().toLowerCase();
    const hits = json.hits ?? [];
    const mentions = hits.filter((h) =>
      (h._source?.title ?? "").toLowerCase().includes(needle),
    ).length;
    if (mentions === 0 && !json.total) return null;
    return { v2exMentions: mentions };
  } catch {
    return null;
  }
}
