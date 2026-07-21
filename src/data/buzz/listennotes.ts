import type { BuzzInput } from "@/src/core/recommend";
import { normalizeForMatch } from "./match";

/**
 * Listen Notes — the largest free podcast search API. Its Listen Score
 * (0–100 global popularity percentile) is a strong quality signal that
 * iTunes/Podcast Index don't expose. Server-side only, key via
 * LISTEN_NOTES_API_KEY.
 *
 * QUOTA SAFETY: the free plan's monthly quota is tiny, and this was being
 * called per user request across many show titles (charts / top-picks) —
 * unbounded under traffic, with no shared counter in serverless to cap it. So
 * it is now OFF by default and only runs when LISTEN_NOTES_ENABLED === "true".
 * Enable it *only* in a bounded context (e.g. the daily pipeline with a hard
 * per-run cap), never on the per-request path. Disabled → zero API calls →
 * always within quota; recommendations fall back to the many other signals.
 */

const REVALIDATE_SECONDS = 7 * 24 * 60 * 60; // Listen Score moves slowly
const BASE = "https://listen-api.listennotes.com/api/v2";

function apiKey(): string | null {
  // Both must be present: the key AND an explicit opt-in, so it can never burn
  // quota just by having the key configured on a traffic-serving deployment.
  if (process.env.LISTEN_NOTES_ENABLED !== "true") return null;
  return process.env.LISTEN_NOTES_API_KEY || null;
}

type LnResult = {
  title_original?: string;
  listen_score?: number | null;
};

const normalize = normalizeForMatch;

export async function listenNotesBuzz(title: string): Promise<BuzzInput | null> {
  const key = apiKey();
  if (!key) return null; // not enabled/configured — skip, never an error
  try {
    const url =
      `${BASE}/search?type=podcast&only_in=title&page_size=5` +
      `&q=${encodeURIComponent(title)}`;
    const res = await fetch(url, {
      headers: { "X-ListenAPI-Key": key },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: LnResult[] };
    const results = json.results ?? [];
    const hit =
      results.find((r) => normalize(r.title_original ?? "") === normalize(title)) ??
      results[0];
    if (hit?.listen_score == null) return null;
    return { listenScore: hit.listen_score };
  } catch {
    return null;
  }
}
