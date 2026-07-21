import { describe, expect, it } from "vitest";
import { parseRedditListing } from "@/src/data/mining/harvest/reddit";
import { parseRssDocs } from "@/src/data/mining/harvest/douban";
import { parseHnHits } from "@/src/data/mining/harvest/hackernews";

describe("parseRedditListing", () => {
  it("maps a search listing into RawDocs", () => {
    const json = {
      data: {
        children: [
          {
            data: {
              id: "abc",
              title: "Podcasts like Reply All?",
              selftext: "Loved it, what next?",
              author: "someuser",
              permalink: "/r/podcasts/comments/abc/x/",
              created_utc: 1_700_000_000,
            },
          },
          { data: { id: "", title: "" } }, // skipped (no id/title)
        ],
      },
    };
    const docs = parseRedditListing(json);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      id: "reddit:abc",
      source: "reddit",
      lang: "en",
      author: "reddit:someuser",
      url: "https://www.reddit.com/r/podcasts/comments/abc/x/",
    });
    expect(docs[0].postedAt).toMatch(/^20/);
  });

  it("returns [] on a malformed payload", () => {
    expect(parseRedditListing({})).toEqual([]);
    expect(parseRedditListing(null)).toEqual([]);
  });
});

describe("parseRssDocs (Douban via RSSHub)", () => {
  it("parses items, strips HTML, and detects Chinese", () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>求推荐类似《故事FM》的播客</title>
        <link>https://www.douban.com/group/topic/1</link>
        <description>&lt;p&gt;最近在听 忽左忽右&lt;/p&gt;</description>
        <author>豆友A</author>
        <pubDate>Wed, 15 Nov 2023 00:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const docs = parseRssDocs(xml, "douban");
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      id: "douban:https://www.douban.com/group/topic/1",
      source: "douban",
      lang: "zh",
      title: "求推荐类似《故事FM》的播客",
      body: "最近在听 忽左忽右",
      author: "douban:豆友A",
    });
  });

  it("handles a single-item feed and junk input", () => {
    expect(parseRssDocs("not xml", "douban")).toEqual([]);
  });
});

describe("parseHnHits (Hacker News / Algolia)", () => {
  it("maps stories and comments, stripping HTML from comments", () => {
    const json = {
      hits: [
        { objectID: "1", title: "Ask HN: Best podcasts?", author: "alice" },
        {
          objectID: "2",
          story_title: "Ask HN: Best podcasts?",
          comment_text: "I love <i>Radiolab</i> and Reply All",
          author: "bob",
        },
        { objectID: "3" }, // no title/story_title → skipped
      ],
    };
    const docs = parseHnHits(json);
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({ id: "hn:1", source: "hackernews", title: "Ask HN: Best podcasts?" });
    expect(docs[1]).toMatchObject({
      id: "hn:2",
      body: "I love Radiolab and Reply All",
      author: "hn:bob",
      url: "https://news.ycombinator.com/item?id=2",
    });
  });

  it("returns [] on junk", () => {
    expect(parseHnHits({})).toEqual([]);
    expect(parseHnHits(null)).toEqual([]);
  });
});
