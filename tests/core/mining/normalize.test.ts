import { describe, expect, it } from "vitest";
import { aliasWeight, isGenericAlias, normalize } from "@/src/core/mining/normalize";

describe("normalize", () => {
  it("folds case/width and collapses punctuation to single spaces", () => {
    expect(normalize("Reply  All!!")).toBe("reply all");
    expect(normalize("ＳｔｏｒｙFM")).toBe("storyfm"); // fullwidth → ascii
    expect(normalize("故事FM")).toBe("故事fm");
  });

  it("keeps CJK and drops emoji/symbols", () => {
    expect(normalize("忽左忽右 🎧 #podcast")).toBe("忽左忽右 podcast");
    expect(normalize("")).toBe("");
  });
});

describe("aliasWeight", () => {
  it("counts Han chars, else Latin words", () => {
    expect(aliasWeight("故事fm")).toBe(2); // two Han chars
    expect(aliasWeight("reply all")).toBe(2);
    expect(aliasWeight("radiolab")).toBe(1);
  });
});

describe("isGenericAlias", () => {
  it("flags single Han chars and ≤3-letter Latin words", () => {
    expect(isGenericAlias(normalize("日"))).toBe(true);
    expect(isGenericAlias(normalize("up"))).toBe(true);
    expect(isGenericAlias(normalize("故事fm"))).toBe(false);
    expect(isGenericAlias(normalize("radiolab"))).toBe(false);
    expect(isGenericAlias(normalize("reply all"))).toBe(false);
  });
});
