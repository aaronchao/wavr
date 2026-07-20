import { type Gazetteer, type RawMatch, scan } from "./gazetteer";
import { detectThreadSeed, hasCueNear } from "./intent";
import { normalize } from "./normalize";
import { sentimentOf } from "./sentiment";
import {
  type CandidateEdge,
  DEFAULT_OPTIONS,
  type EdgeEvidence,
  type Mention,
  type MiningOptions,
  type RawDoc,
  type RecEdge,
} from "./types";

const SENTIMENT_RADIUS = 30;

const SOURCE_LABEL: Record<string, string> = {
  reddit: "Reddit",
  douban: "豆瓣",
  ptt: "PTT",
  dcard: "Dcard",
  lihkg: "LIHKG",
  v2ex: "V2EX",
  xiaohongshu: "小红书",
  discord: "Discord",
};

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

/** Per-mention confidence inside an established rec-thread (precision-first). */
function confidenceInThread(m: RawMatch, cpBody: string[]): number {
  if (!m.generic) return 1;
  return hasCueNear(cpBody, m.start, m.end) ? 0.8 : 0.55;
}

/**
 * All show references in a document (for the `mentions` table). Cheap wrapper
 * over the scan; intent/sentiment are resolved against the body window.
 */
export function extractMentions(doc: RawDoc, gaz: Gazetteer): Mention[] {
  const normBody = normalize(doc.body);
  const cpBody = [...normBody];
  const normTitle = normalize(doc.title);
  const seed = detectThreadSeed(normTitle, scan(gaz, normTitle));

  return scan(gaz, normBody).map((m) => {
    const window = cpBody
      .slice(Math.max(0, m.start - SENTIMENT_RADIUS), m.end + SENTIMENT_RADIUS)
      .join("");
    return {
      showId: m.showId,
      surface: m.surface,
      start: m.start,
      end: m.end,
      confidence: seed ? confidenceInThread(m, cpBody) : m.generic ? 0.4 : 0.7,
      sentiment: sentimentOf(window),
      intent: m.showId === seed ? "seed" : seed ? "recommendation" : "comention",
    };
  });
}

/**
 * The (seed → rec) votes from one document. M1 is precision-first: only
 * rec-seeking threads that name exactly one seed produce edges; every distinct
 * show named in the body becomes a candidate, weighted by confidence and
 * sentiment. Threads with no clear seed yield nothing (widened later).
 */
export function extractEdges(
  doc: RawDoc,
  gaz: Gazetteer,
  opts: MiningOptions = DEFAULT_OPTIONS,
): CandidateEdge[] {
  const normTitle = normalize(doc.title);
  const seed = detectThreadSeed(normTitle, scan(gaz, normTitle));
  if (!seed) return [];

  const normBody = normalize(doc.body);
  const cpBody = [...normBody];
  const evidence: EdgeEvidence = {
    source: sourceLabel(doc.source),
    text: doc.title.trim() || doc.body.slice(0, 120).trim(),
    url: doc.url,
  };

  // Keep the strongest occurrence per recommended show within this doc.
  const best = new Map<string, CandidateEdge>();
  for (const m of scan(gaz, normBody)) {
    if (m.showId === seed) continue; // no self-edges
    const confidence = confidenceInThread(m, cpBody);
    if (confidence < opts.minConfidence) continue;
    const window = cpBody
      .slice(Math.max(0, m.start - SENTIMENT_RADIUS), m.end + SENTIMENT_RADIUS)
      .join("");
    const sentiment = sentimentOf(window);
    const weight = confidence * (1 + 0.4 * sentiment);
    const prev = best.get(m.showId);
    if (!prev || weight > prev.weight) {
      best.set(m.showId, {
        seedShowId: seed,
        recShowId: m.showId,
        weight,
        docId: doc.id,
        author: doc.author,
        sentiment,
        evidence,
      });
    }
  }
  return [...best.values()];
}

function key(seed: string, rec: string): string {
  return `${seed}␟${rec}`;
}

/**
 * Fold per-document votes into scored, deduped edges. An edge only surfaces
 * once ≥ `minAuthors` DISTINCT authors have voted for it — the core anti-spam /
 * anti-self-promo gate. Score rewards author diversity first, then repeat
 * mentions, scaled by average sentiment. Deterministic ordering.
 */
export function aggregateEdges(
  candidates: CandidateEdge[],
  opts: MiningOptions = DEFAULT_OPTIONS,
): RecEdge[] {
  const groups = new Map<string, CandidateEdge[]>();
  for (const c of candidates) {
    const k = key(c.seedShowId, c.recShowId);
    const g = groups.get(k);
    if (g) g.push(c);
    else groups.set(k, [c]);
  }

  const edges: RecEdge[] = [];
  for (const group of groups.values()) {
    const authors = new Set(group.map((c) => c.author));
    if (authors.size < opts.minAuthors) continue;

    const mentionCount = group.length;
    const authorCount = authors.size;
    const sentimentAvg =
      group.reduce((s, c) => s + c.sentiment, 0) / mentionCount;
    const extraMentions = mentionCount - authorCount;
    const score =
      (authorCount + 0.25 * extraMentions) * (1 + 0.5 * sentimentAvg);

    // Best, deduped evidence quotes.
    const seenEvidence = new Set<string>();
    const evidence: EdgeEvidence[] = [];
    for (const c of [...group].sort((a, b) => b.weight - a.weight)) {
      const dedupeKey = c.evidence.url ?? c.evidence.text;
      if (seenEvidence.has(dedupeKey)) continue;
      seenEvidence.add(dedupeKey);
      evidence.push(c.evidence);
      if (evidence.length >= opts.maxEvidence) break;
    }

    edges.push({
      seedShowId: group[0].seedShowId,
      recShowId: group[0].recShowId,
      score,
      mentionCount,
      authorCount,
      sentimentAvg,
      evidence,
    });
  }

  return edges.sort(
    (a, b) =>
      b.score - a.score ||
      a.seedShowId.localeCompare(b.seedShowId) ||
      a.recShowId.localeCompare(b.recShowId),
  );
}

/** Convenience: whole documents → scored edges (harvest → extract → aggregate). */
export function mineDocuments(
  docs: RawDoc[],
  gaz: Gazetteer,
  opts: MiningOptions = DEFAULT_OPTIONS,
): RecEdge[] {
  const candidates = docs.flatMap((d) => extractEdges(d, gaz, opts));
  return aggregateEdges(candidates, opts);
}
