import { isGenericAlias, normalize } from "./normalize";
import type { Alias } from "./types";

/**
 * Aho–Corasick gazetteer (PURE). We don't need open-vocabulary NER — we need
 * to spot KNOWN podcast titles fast. This builds one automaton from the alias
 * set and scans a document in O(text length) regardless of how many thousands
 * of titles we track. Matching happens over normalized text + normalized
 * aliases (see normalize.ts); indices are code-point offsets so CJK is safe.
 */

type PatternMeta = {
  showId: string;
  surface: string;
  norm: string;
  cpLen: number; // code-point length of `norm`
  generic: boolean;
};

type Node = {
  next: Map<string, number>;
  fail: number;
  outputs: number[];
};

export type Gazetteer = { nodes: Node[]; patterns: PatternMeta[] };

export type RawMatch = {
  showId: string;
  surface: string;
  generic: boolean;
  start: number; // code-point index, inclusive
  end: number; // code-point index, exclusive
};

export function buildGazetteer(aliases: Alias[]): Gazetteer {
  const nodes: Node[] = [{ next: new Map(), fail: 0, outputs: [] }];
  const patterns: PatternMeta[] = [];

  for (const a of aliases) {
    const norm = normalize(a.alias);
    if (!norm) continue;
    const pid = patterns.length;
    const chars = [...norm];
    patterns.push({
      showId: a.showId,
      surface: a.alias,
      norm,
      cpLen: chars.length,
      generic: a.generic ?? isGenericAlias(norm),
    });
    let cur = 0;
    for (const ch of chars) {
      let nxt = nodes[cur].next.get(ch);
      if (nxt === undefined) {
        nxt = nodes.length;
        nodes.push({ next: new Map(), fail: 0, outputs: [] });
        nodes[cur].next.set(ch, nxt);
      }
      cur = nxt;
    }
    nodes[cur].outputs.push(pid);
  }

  // BFS: fail links + dictionary-suffix output propagation
  const queue: number[] = [];
  for (const child of nodes[0].next.values()) {
    nodes[child].fail = 0;
    queue.push(child);
  }
  while (queue.length) {
    const u = queue.shift()!;
    for (const [ch, v] of nodes[u].next) {
      let f = nodes[u].fail;
      while (f !== 0 && !nodes[f].next.has(ch)) f = nodes[f].fail;
      const fchild = nodes[f].next.get(ch);
      nodes[v].fail = fchild !== undefined && fchild !== v ? fchild : 0;
      nodes[v].outputs.push(...nodes[nodes[v].fail].outputs);
      queue.push(v);
    }
  }

  return { nodes, patterns };
}

/** Find every known-title occurrence in already-normalized text. */
export function scan(gaz: Gazetteer, normText: string): RawMatch[] {
  const out: RawMatch[] = [];
  let node = 0;
  let idx = 0;
  for (const ch of normText) {
    while (node !== 0 && !gaz.nodes[node].next.has(ch)) node = gaz.nodes[node].fail;
    node = gaz.nodes[node].next.get(ch) ?? 0;
    for (const pid of gaz.nodes[node].outputs) {
      const p = gaz.patterns[pid];
      const end = idx + 1;
      out.push({
        showId: p.showId,
        surface: p.surface,
        generic: p.generic,
        start: end - p.cpLen,
        end,
      });
    }
    idx++;
  }
  return out;
}
