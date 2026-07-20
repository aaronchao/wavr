/**
 * Community-mining types (PURE — no React/Next/DB imports). The offline
 * pipeline harvests raw forum documents, this core turns them into scored
 * Seed → Recommended edges, and the pipeline persists the result. Everything
 * here is deterministic and unit-tested; the network/DB lives outside.
 */

/** A harvested post or thread, source-agnostic. */
export type RawDoc = {
  /** Stable id, "<source>:<externalId>". */
  id: string;
  source: string;
  lang: "en" | "zh" | "other";
  /** Thread / post title (often the richest signal — "podcasts like X?"). */
  title: string;
  /** Body text (a post, or replies concatenated). */
  body: string;
  /** Opaque author handle/hash — used only for author-diversity gating. */
  author: string;
  url?: string;
  postedAt?: string;
};

/** One known podcast title (or variant) the matcher scans for. */
export type Alias = {
  showId: string;
  /** Display surface, e.g. "故事FM" or "Reply All". */
  alias: string;
  lang?: string;
  /**
   * Short/ambiguous titles ("Up First", 《日谈》) that must be corroborated by
   * a nearby cue word ("podcast"/"播客") to count. Derived when omitted.
   */
  generic?: boolean;
};

export type Intent = "seed" | "recommendation" | "comention";

/** A single show reference located inside a document. */
export type Mention = {
  showId: string;
  surface: string;
  /** Span in the NORMALIZED text (internal use: windowing/context). */
  start: number;
  end: number;
  confidence: number; // 0..1
  sentiment: number; // -1..1
  intent: Intent;
};

/** A short, citable quote behind an edge (feeds the Evidence UI). */
export type EdgeEvidence = { source: string; text: string; url?: string };

/** One (seed → rec) vote extracted from a single document. */
export type CandidateEdge = {
  seedShowId: string;
  recShowId: string;
  weight: number;
  docId: string;
  author: string;
  sentiment: number;
  evidence: EdgeEvidence;
};

/** The aggregated, scored edge that gets persisted + served. */
export type RecEdge = {
  seedShowId: string;
  recShowId: string;
  score: number;
  mentionCount: number;
  authorCount: number;
  sentimentAvg: number;
  evidence: EdgeEvidence[];
};

/** Tunables for extraction + aggregation (precision-first defaults). */
export type MiningOptions = {
  /** Minimum per-mention confidence to form an edge. */
  minConfidence: number;
  /** Distinct authors required before an edge surfaces (anti-spam). */
  minAuthors: number;
  /** Max evidence quotes kept per edge. */
  maxEvidence: number;
};

export const DEFAULT_OPTIONS: MiningOptions = {
  minConfidence: 0.6,
  minAuthors: 2,
  maxEvidence: 3,
};
