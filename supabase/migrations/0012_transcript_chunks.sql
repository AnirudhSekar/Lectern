-- Replaces "one averaged vector per lecture" with per-chunk vectors +
-- character offsets, so search can point at *where* in the transcript
-- a match lives, not just *which* lecture.

create table public.transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.transcripts(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  start_char int not null,
  end_char int not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index transcript_chunks_lecture_id_idx on public.transcript_chunks(lecture_id);
create index transcript_chunks_embedding_idx
  on public.transcript_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.transcript_chunks enable row level security;

create policy "transcript_chunks_select_own" on public.transcript_chunks
  for select using (
    exists (
      select 1 from public.lectures
      where lectures.id = transcript_chunks.lecture_id
      and lectures.user_id = auth.uid()
    )
  );