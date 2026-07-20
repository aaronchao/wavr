/**
 * Text normalization for gazetteer matching (PURE). We fold width/case and
 * turn every run of punctuation/emoji/whitespace into a single space, while
 * keeping letters, numbers, and CJK. Both the scanned text and the aliases go
 * through the same function, so a PTT post and a 小宇宙 title meet in the middle.
 * (Simplified↔Traditional folding is added when we widen past Douban.)
 */
export function normalize(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** How many "meaningful" units an alias has — CJK counts per char, Latin per word. */
export function aliasWeight(norm: string): number {
  const han = (norm.match(/\p{sc=Han}/gu) ?? []).length;
  if (han > 0) return han;
  return norm.split(" ").filter(Boolean).length;
}

/**
 * A normalized alias is "generic" (needs a nearby cue word to count) when it's
 * too short to be unambiguous: a single CJK char, or a one-word Latin title of
 * ≤ 3 letters. Callers may override via Alias.generic.
 */
export function isGenericAlias(norm: string): boolean {
  const w = aliasWeight(norm);
  if (w <= 1) {
    const han = (norm.match(/\p{sc=Han}/gu) ?? []).length;
    return han === 1 || norm.replace(/\s/g, "").length <= 3;
  }
  return false;
}
