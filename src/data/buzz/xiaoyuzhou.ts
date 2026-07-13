import type { BuzzInput } from "@/src/core/recommend";

/**
 * 小宇宙 stats via its (unofficial) app API — the API that ultrazg/xyz
 * wraps. It requires a logged-in account: obtain tokens once with any
 * ultrazg/xyz deployment (SMS login), then set
 *   XIAOYUZHOU_ACCESS_TOKEN / XIAOYUZHOU_REFRESH_TOKEN
 * in the environment. Without tokens this provider is silently absent —
 * xyzrank still supplies 小宇宙-derived buzz for ranked shows for free.
 */

const REVALIDATE_SECONDS = 24 * 60 * 60;
const BASE = "https://api.xiaoyuzhoufm.com";

function tokens(): { access: string } | null {
  const access = process.env.XIAOYUZHOU_ACCESS_TOKEN;
  return access ? { access } : null;
}

type XyzPodcast = {
  title?: string;
  subscriptionCount?: number;
  playCount?: number;
  commentCount?: number;
};

export async function xiaoyuzhouBuzz(title: string): Promise<BuzzInput | null> {
  const auth = tokens();
  if (!auth) return null; // not configured — skip, never an error
  try {
    const res = await fetch(`${BASE}/v1/search/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-jike-access-token": auth.access,
        "User-Agent": "wavr/0.1 (personal podcast discovery)",
      },
      body: JSON.stringify({ keyword: title, type: "PODCAST" }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: XyzPodcast[] };
    const hit = (json.data ?? []).find(
      (p) => p.title?.trim().toLowerCase() === title.trim().toLowerCase(),
    );
    if (!hit) return null;
    return {
      subscribers: hit.subscriptionCount,
      plays: hit.playCount,
      comments: hit.commentCount,
    };
  } catch {
    return null;
  }
}

/** Merge buzz objects, earlier sources winning per field. */
export function mergeBuzz(
  ...sources: (BuzzInput | null | undefined)[]
): BuzzInput | undefined {
  const out: BuzzInput = {};
  let any = false;
  for (const s of sources) {
    if (!s) continue;
    for (const [k, v] of Object.entries(s) as [keyof BuzzInput, number][]) {
      if (v != null && out[k] == null) {
        out[k] = v;
        any = true;
      }
    }
  }
  return any ? out : undefined;
}
