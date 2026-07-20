-- Community recommendation mining (Section 8 pipeline).
-- The offline pipeline (GitHub Actions harvest/extract + pg_cron rollup) writes
-- these tables with a service-role key; the app reads only `rec_edges` and
-- `podcast_aliases` at serve time. Pipeline tables have RLS enabled with NO
-- anon/authenticated policies, so only the service role (which bypasses RLS)
-- can touch them; the two read-caches are world-readable like `shows`.

-- ── Sources: registry + per-source rate budget + kill-switch ────────────────
create table if not exists public.mining_sources (
  id text primary key,                 -- 'reddit', 'douban', 'ptt', …
  name text not null,
  lang text not null default 'other'   -- 'en' | 'zh' | 'other'
    check (lang in ('en', 'zh', 'other')),
  kind text not null default 'forum',  -- 'forum' | 'api' | 'rss' | 'aggregator'
  rate_budget_per_hour int not null default 60,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.mining_sources enable row level security;

-- ── Raw documents: deduped harvested posts/threads ──────────────────────────
create table if not exists public.raw_documents (
  id text primary key,                 -- '<source>:<external id>'
  source_id text not null references public.mining_sources (id),
  url text unique,
  content_hash text not null,          -- dedup crossposts/edits
  title text,
  body text,
  author_hash text,                    -- salted hash, for author-diversity gating
  lang text not null default 'other',
  posted_at timestamptz,
  fetched_at timestamptz not null default now(),
  processed_at timestamptz             -- null until the extractor has run
);
create unique index if not exists raw_documents_hash_idx
  on public.raw_documents (content_hash);
create index if not exists raw_documents_unprocessed_idx
  on public.raw_documents (processed_at) where processed_at is null;
alter table public.raw_documents enable row level security;

-- ── Alias gazetteer: catalog titles + variants the extractor matches on ─────
create table if not exists public.podcast_aliases (
  id bigint generated always as identity primary key,
  show_id text not null,               -- shows.id (iTunes/pi/rss)
  alias text not null,
  alias_norm text not null,            -- normalized form the matcher scans
  lang text,
  origin text not null default 'catalog', -- 'catalog' | 'xyzrank' | 'manual'
  is_generic boolean not null default false, -- short/ambiguous → needs a cue
  unique (show_id, alias_norm)
);
create index if not exists podcast_aliases_norm_idx
  on public.podcast_aliases (alias_norm);
alter table public.podcast_aliases enable row level security;
create policy "aliases readable by everyone"
  on public.podcast_aliases for select using (true);

-- ── Mentions: each extracted show reference in a document ────────────────────
create table if not exists public.mentions (
  id bigint generated always as identity primary key,
  doc_id text not null references public.raw_documents (id) on delete cascade,
  show_id text not null,
  surface text not null,               -- the matched alias text
  confidence real not null default 1,  -- 0..1
  sentiment real not null default 0,   -- -1..1
  intent text not null default 'comention'
    check (intent in ('seed', 'recommendation', 'comention')),
  created_at timestamptz not null default now()
);
create index if not exists mentions_doc_idx on public.mentions (doc_id);
create index if not exists mentions_show_idx on public.mentions (show_id);
alter table public.mentions enable row level security;

-- ── Rec edges: THE deliverable — a Seed → Community-Recommended link ─────────
create table if not exists public.rec_edges (
  seed_show_id text not null,
  rec_show_id text not null,
  score real not null default 0,
  mention_count int not null default 0,
  author_count int not null default 0, -- distinct authors (anti-spam gate)
  sentiment_avg real not null default 0,
  evidence jsonb not null default '[]', -- top real quotes + urls (Evidence UI)
  computed_at timestamptz not null default now(),
  primary key (seed_show_id, rec_show_id),
  check (seed_show_id <> rec_show_id)
);
create index if not exists rec_edges_seed_idx
  on public.rec_edges (seed_show_id, score desc);
alter table public.rec_edges enable row level security;
create policy "rec edges readable by everyone"
  on public.rec_edges for select using (true);

-- ── Job queue: plain-Postgres queue, claimed with FOR UPDATE SKIP LOCKED ─────
create table if not exists public.pipeline_jobs (
  id bigint generated always as identity primary key,
  kind text not null,                  -- 'harvest' | 'extract' | 'rollup'
  payload jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'error')),
  run_after timestamptz not null default now(),
  attempts int not null default 0,
  locked_by text,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists pipeline_jobs_claim_idx
  on public.pipeline_jobs (status, run_after)
  where status = 'pending';
alter table public.pipeline_jobs enable row level security;

-- Atomically claim the next N due jobs of a kind (workers call this via RPC).
create or replace function public.claim_pipeline_jobs(p_kind text, p_worker text, p_limit int)
returns setof public.pipeline_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.pipeline_jobs j
     set status = 'running', locked_by = p_worker, locked_at = now(), attempts = j.attempts + 1
   where j.id in (
     select id from public.pipeline_jobs
      where status = 'pending' and kind = p_kind and run_after <= now()
      order by run_after
      for update skip locked
      limit p_limit
   )
  returning j.*;
end;
$$;
