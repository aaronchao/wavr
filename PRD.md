# Wavr — Co-Design PRD (Web v1)

**Version:** 0.2 (web-only, recommendation-first)
**Date:** 2026-07-12
**Owner:** Aaron
**Product type:** Personal, free, browser-based podcast discovery app — runs on any device, syncs across all of them.
**Design ambition:** Playful, tactile, delightful discovery at zero hosting cost.

---

## 0. Decisions locked

| Dimension | Decision | Consequence |
|---|---|---|
| Platform | **Web only** (responsive, works on phone + desktop browsers) | No iOS/Android builds, no app stores. One React web app. |
| Cost | **Free to build + host** | Vercel Hobby (free) + Supabase free tier + free podcast APIs. No paid keys required. |
| Cross-device | **Sync required** | Your saved shows / history / prefs follow you everywhere via Supabase + simple magic-link login. |
| Core feature (MUST-HAVE) | **Recommendation + exploration** | The whole point of v1. Everything is in service of "what should I listen to next, and why." |
| Catalog source | **Free podcast search APIs** | Apple/iTunes Search (free, no key) + Podcast Index (free key), fetched via the app's own serverless proxy to fix CORS + hide keys. |
| Playback | **Deep-link OUT** | Wavr recommends; you play in Apple Podcasts / Spotify / YouTube Music / Xiaoyuzhou via web links. No in-app player in v1. |
| External ratings | Best-effort (Douban / Xiaoyuzhou) | Aid decisions via badges; proxied + cached; silently skipped when blocked. |
| Deferred | Snapshot, in-app audio, transcription/AI, Taste Map, digests | All "later." Not in v1. |
| Vibe | Playful & tactile | Springy motion, rounded shapes, delightful micro-interactions — in a browser. |

**Guiding principle:** *v1 does one thing extremely well — help you discover podcasts worth your time and tell you why. It's free, it syncs, it runs anywhere with a URL. Nothing else ships until that core is delightful.*

---

## 1. Product overview

Wavr is a **discovery engine** for podcasts. You tell it a little about your taste (or it learns from what you save), and it surfaces shows worth your time — clustered by topic, explained with a one-line "why," and decorated with external ratings so you can decide fast. When you pick something, Wavr hands you off to whatever app actually plays it.

It removes one friction, completely: **"What should I listen to next, and is it any good?"**

Three things make that delightful:
1. **Explainable recommendations** — every suggestion carries a "why" (a cluster reason, a rating, a show you liked).
2. **Topic exploration** — browse your taste as clusters, not an endless flat list.
3. **Decision aids** — external ratings (Douban/Xiaoyuzhou) as badges, so you're not gambling on a cold pick.

---

## 2. The recommendation + exploration core (the must-have)

### 2.1 Signals (what feeds taste)

Because there's no in-app playback in v1, engagement is **explicit and lightweight**:

| Action | Weight | Notes |
|---|---|---|
| Save / follow a show | +3 | Strong positive. |
| 👍 like | +2 | |
| Open in a platform (deep-link click) | +1 | Weak positive — you were curious enough to go play it. |
| Mark "not for me" / 🚫 | −3 | Removes from feed, teaches the model. |
| Seen but ignored (impression) | −0.5 | Light fatigue signal. |

Plus **onboarding interest picks** (choose from the seed clusters) so the very first session already recommends well — no cold-start dead end.

### 2.2 Seed topic clusters (cold-start + exploration spine)

Ship with your stated interests so day one works: **Asian gay podcasts, gay travel stories, storytelling, psychological case studies, book discussions**, plus auto-derived clusters from show metadata (e.g. music culture, commentary, business/coaching). Your example shows map in cleanly:

- *Dear Therapist, Psychology In Seattle, Coaching Real Leaders* → psychological case studies / coaching
- *周小辣, Sono, Over It Radio with Summer Walker* → storytelling / candid talk
- *Noisey China, The Zane Lowe Show* → music culture
- *The Ben Shapiro Show, Straight Talk with Mark Bouris* → commentary / business

### 2.3 Algorithm (pure, deterministic, free — runs client-side)

No ML server, no per-view API cost. Transparent and debuggable:

```
1. VECTORIZE each candidate show → tag/keyword weights
   (TF-IDF over title + description + categories from the catalog API + cluster tags).
2. TASTE VECTOR = weighted sum of shows you engaged with (weights in 2.1).
3. SCORE candidate = cosine(taste, show)
      + λ · normalized_external_rating (if present)
      + freshness bonus (recently active shows)
      − fatigue penalty (recently shown).
4. CLUSTER results into topic groups, each with a human "why":
      "More psychological case studies", "Because you saved 周小辣",
      "Highly rated on Douban you haven't tried".
5. DIVERSIFY: cap any one cluster so the feed doesn't collapse to a single taste.
```

**Explainability is the feature.** Every card shows its "why" chip. That's what makes the discovery feel intelligent rather than random.

### 2.4 Exploration surfaces

- **Home / "What next?"** — clustered recommendation feed with "why" chips.
- **Topics** — browse by cluster; tap a cluster to see more like it; adjust which topics you care about.
- **Search** — full podcast search via the catalog API (find and add any show).
- **Show detail** — description, external rating badge(s), and deep-link-out chips (Apple / Spotify / YouTube Music / Xiaoyuzhou).

---

## 3. Data sources & fallback strategy

Everything external is best-effort and proxied through the app's own serverless routes (fixes browser CORS, hides any keys, allows caching).

### 3.1 Catalog (podcasts to explore)
```
Apple / iTunes Search API   → primary (free, no key; gives title, art, feedUrl, Apple URL)
Podcast Index API           → secondary (free key, richer search) — via proxy, key server-side
RSS feed parse              → for shows added by URL / to enrich metadata
```
Search + detail calls go client → `/api/catalog/*` → external. Results cached (client via query cache; hot items in a Supabase table with TTL).

### 3.2 External ratings (decision aids) — APIs NOT assumed open
```
DoubanProvider / XiaoyuzhouProvider, each independently:
  official API → unofficial endpoint → public web-page parse (server-side) → return null (skip)
```
- Cached in Supabase (`ratings_cache`, TTL 7 days); serve cache first, refresh lazily.
- Fetched lazily on card view; **never blocks render**; badge resolves or quietly disappears.
- Good-citizen: personal-use volume, respect rate limits/robots, cache aggressively. Scraping selectors behind small adapters so they're easy to fix.
- Missing rating = neutral in the recommender (no bonus, no penalty).

### 3.3 Deep-link OUT (play elsewhere)
- Apple Podcasts URL comes directly from the iTunes result.
- Spotify / YouTube Music / Xiaoyuzhou: use a stored URL when known, else a **search link** on that platform for the show name; dim the chip if truly unavailable.
- Web URLs only (this is a web app) — opens in a new tab.

---

## 4. Sync, accounts & data

- **Supabase (free tier)** is the source of truth for *your* data: saved shows, engagement history, prefs, ratings cache.
- **Auth:** magic-link (email) — one tap, no password. Single personal user (but works for friends too).
- **Offline-friendly, not offline-first:** the app caches recent data (TanStack Query / localStorage) so it's fast and survives a flaky connection, but v1 assumes you're online to fetch new recommendations.
- **Privacy:** only your own account holds your data, in your own free Supabase project.

---

## 5. UI / UX

### 5.1 Design language — "Playful & Tactile" (web edition)
- Spring-physics transitions (Framer Motion), cards that settle with a slight overshoot.
- Cover-art-driven color per show; generously rounded corners, soft depth.
- **One-click actions** — save, like, open, "not for me" are all single clicks.
- Responsive: thumb-friendly on mobile web, comfortable on desktop.
- Playfulness lives in interactions; the layout stays calm and content-first.

### 5.2 Screens (v1)
1. **Home / What next?** — clustered recs + "why" chips; onboarding interest picker on first run.
2. **Topics** — cluster browser; tune your interests.
3. **Search** — find & add any show.
4. **Show detail** — metadata, rating badges, deep-link-out chips, save/like/not-for-me.
5. **Settings** — interests, ratings sources on/off, account/sync, sign out.

---

## 6. Non-functional requirements
- **Free forever (personal scale):** Vercel Hobby + Supabase free tier + free APIs. No paid key required.
- **Recommendation math is local + deterministic** → no per-view API cost, fully unit-testable.
- **Graceful degradation:** every catalog/ratings/network call has a defined skip state; a failed rating or a blocked API never breaks the feed.
- **Fast first paint:** cache aggressively; recommendations compute client-side in milliseconds.

---

## 7. Scope

**In v1 (must-have + supporting):** magic-link auth + Supabase sync, podcast search + add via free catalog APIs, onboarding interest picker, **recommendation engine with clusters + "why" chips**, topic exploration, show detail with external-rating badges (best-effort), deep-link-out to platforms, playful responsive UI.

**Deferred (later):** Snapshot capture, in-app audio player, on-device/AI transcription & summaries, Taste Map visualization, weekly digests, OPML import, social sharing, native iOS/Android apps.

*(These were core to earlier drafts; they're intentionally cut so v1 nails discovery first.)*
