/**
 * Lexicon sentiment (PURE). A recommendation's polarity is a *weight*, not a
 * gate: "X is overrated, listen to Y instead" should lift Y and not X. We score
 * the window around a mention with small bilingual lexicons and flip on a
 * nearby negation. Returns a value in [-1, 1]; 0 when no cue words are present.
 */

const EN_POS = [
  "love", "loved", "great", "amazing", "excellent", "favorite", "favourite",
  "recommend", "best", "brilliant", "fantastic", "incredible", "gem", "underrated",
  "must", "obsessed", "perfect", "wonderful", "solid", "addictive",
];
const EN_NEG = [
  "hate", "boring", "bad", "worst", "overrated", "awful", "terrible",
  "disappointing", "mediocre", "skip", "meh", "dull", "annoying", "trash",
];
const EN_NEGATORS = ["not", "no", "never", "isnt", "dont", "wasnt", "cant", "hardly", "barely"];

// Chinese lexicons are matched as substrings (no tokenizer needed).
const ZH_POS = [
  "喜欢", "推荐", "好听", "神作", "超赞", "值得", "必听", "精彩", "宝藏",
  "太棒", "好评", "爱了", "上头", "封神", "良心", "耐听",
];
const ZH_NEG = [
  "无聊", "难听", "失望", "过誉", "别听", "尬", "烂", "弃", "水", "垃圾", "无感",
];
const ZH_NEGATORS = ["不", "没", "别", "毫无", "算不上"];

function scoreEnglish(window: string): { sum: number; hits: number } {
  const tokens = window.split(/\s+/).filter(Boolean);
  let sum = 0;
  let hits = 0;
  tokens.forEach((tok, i) => {
    const pos = EN_POS.includes(tok);
    const neg = EN_NEG.includes(tok);
    if (!pos && !neg) return;
    hits++;
    let polarity = pos ? 1 : -1;
    // a negator within the preceding 3 tokens flips polarity
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (EN_NEGATORS.includes(tokens[j])) {
        polarity *= -1;
        break;
      }
    }
    sum += polarity;
  });
  return { sum, hits };
}

function scoreChinese(window: string): { sum: number; hits: number } {
  let sum = 0;
  let hits = 0;
  const check = (words: string[], polarity: number) => {
    for (const w of words) {
      let from = 0;
      for (;;) {
        const at = window.indexOf(w, from);
        if (at === -1) break;
        hits++;
        const before = window.slice(Math.max(0, at - 3), at);
        const negated = ZH_NEGATORS.some((n) => before.includes(n));
        sum += negated ? -polarity : polarity;
        from = at + w.length;
      }
    }
  };
  check(ZH_POS, 1);
  check(ZH_NEG, -1);
  return { sum, hits };
}

/** Sentiment of a text window, in [-1, 1]. Neutral (0) when no cue words hit. */
export function sentimentOf(window: string): number {
  const text = window.toLowerCase();
  const en = scoreEnglish(text);
  const zh = scoreChinese(window);
  const hits = en.hits + zh.hits;
  if (hits === 0) return 0;
  const raw = (en.sum + zh.sum) / hits;
  return Math.max(-1, Math.min(1, raw));
}
