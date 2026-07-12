-- Returns each user's best-matching chunk per lecture, so search
-- results can show a real excerpt and link straight to that position
-- in the transcript, not just "this lecture is a match."

create or replace function public.match_transcript_chunks(
  query_embedding vector(768),
  match_count int default 10
)
returns table (
  lecture_id uuid,
  title text,
  chunk_content text,
  start_char int,
  similarity float
)
language sql
stable
as $$
  select distinct on (l.id)
    l.id as lecture_id,
    l.title,
    c.content as chunk_content,
    c.start_char,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.transcript_chunks c
  join public.lectures l on l.id = c.lecture_id
  where c.embedding is not null
    and l.user_id = auth.uid()
    and l.deleted_at is null
  order by l.id, c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_transcript_chunks(vector, int) to authenticated;