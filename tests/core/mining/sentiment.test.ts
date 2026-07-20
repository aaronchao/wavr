import { describe, expect, it } from "vitest";
import { sentimentOf } from "@/src/core/mining/sentiment";

describe("sentimentOf", () => {
  it("scores positive and negative English", () => {
    expect(sentimentOf("this is amazing, i love it")).toBeGreaterThan(0);
    expect(sentimentOf("boring and overrated")).toBeLessThan(0);
  });

  it("flips on negation", () => {
    expect(sentimentOf("not great at all")).toBeLessThan(0);
  });

  it("scores Chinese with negation", () => {
    expect(sentimentOf("这个播客很好听，推荐")).toBeGreaterThan(0);
    expect(sentimentOf("不推荐，太无聊")).toBeLessThan(0);
  });

  it("is neutral when no cue words appear", () => {
    expect(sentimentOf("it aired on tuesday")).toBe(0);
  });
});
