-- Unlike match_transcript_chunks (dashboard search, one result per
-- lecture across the whole library), this returns multiple top chunks
-- from a single specified lecture — what the chat needs as context.

create or replace function public.match_lecture_chunks(
  query_embedding vector(768),
  target_lecture_id uuid,
  match_count int default 6
)
returns table (
  content text,
  start_char int,
  similarity float
)
language sql
stable
as $$
  select
    c.content,
    c.start_char,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.transcript_chunks c
  join public.lectures l on l.id = c.lecture_id
  where c.lecture_id = target_lecture_id
    and c.embedding is not null
    and l.user_id = auth.uid()
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_lecture_chunks(vector, uuid, int) to authenticated;