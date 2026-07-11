-- TASK-3.1 (reprioritized ahead of Phase 2)
--
-- Using gemini-embedding-001, truncated to 768 dimensions via the
-- output_dimensionality param at call time (TASK-3.2). Google's own
-- docs confirm this model is trained with Matryoshka representation
-- learning specifically so truncated outputs stay high-quality — 768
-- was chosen over the 3072 default given Supabase's 500MB free-tier
-- storage cap and no real need for max precision searching your own
-- lecture transcripts.

create extension if not exists vector;

alter table public.transcripts
  add column embedding vector(768);

-- ivfflat index for fast approximate nearest-neighbor search. Only
-- useful once there's real data to build statistics from — safe to
-- create now since it'll just be empty/unused until TASK-3.2 starts
-- populating embeddings, but Supabase's migration flow makes it easy
-- to run this here rather than as a separate later step.
create index transcripts_embedding_idx
  on public.transcripts
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);