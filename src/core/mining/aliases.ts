import { isGenericAlias, normalize } from "./normalize";
import type { Alias } from "./types";

/**
 * Build the alias gazetteer entries for a show (PURE). The canonical title is
 * always an alias; we also split a bilingual title like "故事FM / StoryFM" into
 * its halves, and de-suffix common tails ("… Podcast", "…播客") so a bare title
 * still matches. Ambiguity is flagged so the matcher demands a cue word for
 * short names. Dedup + persistence happen in the data layer.
 */
const STRIP_SUFFIX = /\s*(?:podcast|播客|节目|節目|电台|電台|radio show|the podcast)\s*$/iu;

export function aliasesForShow(showId: string, title: string, lang?: string): Alias[] {
  const parts = new Set<string>();
  const raw = title.trim();
  if (!raw) return [];
  parts.add(raw);
  // split bilingual / dual titles on common separators
  for (const piece of raw.split(/[/|｜·・–—-]| - /)) {
    const p = piece.trim();
    if (p.length >= 2) parts.add(p);
  }
  // de-suffixed variant
  const stripped = raw.replace(STRIP_SUFFIX, "").trim();
  if (stripped.length >= 2 && stripped !== raw) parts.add(stripped);

  const out: Alias[] = [];
  const seen = new Set<string>();
  for (const alias of parts) {
    const norm = normalize(alias);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push({ showId, alias, lang, generic: isGenericAlias(norm) });
  }
  return out;
}
