/**
 * Community-mining core (PURE, deterministic, unit-tested). Barrel export.
 *
 *   harvest (outside) → RawDoc[]
 *   buildGazetteer(aliasesForShow(...))      // known-title matcher
 *   extractEdges(doc, gaz)                    // per-doc (seed → rec) votes
 *   aggregateEdges(candidates)               // author-gated, scored, deduped
 *   → RecEdge[]  → persisted to rec_edges → served by /api/recs/community
 */
export { aliasesForShow } from "./aliases";
export { buildGazetteer, scan, type Gazetteer, type RawMatch } from "./gazetteer";
export {
  aggregateEdges,
  extractEdges,
  extractMentions,
  mineDocuments,
} from "./edges";
export { hasRecIntentTitle, detectThreadSeed } from "./intent";
export { normalize, isGenericAlias, aliasWeight } from "./normalize";
export { sentimentOf } from "./sentiment";
export {
  DEFAULT_OPTIONS,
  type Alias,
  type CandidateEdge,
  type EdgeEvidence,
  type Mention,
  type MiningOptions,
  type RawDoc,
  type RecEdge,
} from "./types";
