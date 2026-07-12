create or replace function public.match_lecture_transcripts(
  query_embedding vector(768),
  match_count int default 10
)
returns table (
  lecture_id uuid,
  title text,
  similarity float,
  created_at timestamptz
)
language sql
stable
as $$
  select
    l.id as lecture_id,
    l.title,
    1 - (t.embedding <=> query_embedding) as similarity,
    l.created_at
  from public.transcripts t
  join public.lectures l on l.id = t.lecture_id
  where t.embedding is not null
    and l.user_id = auth.uid()
    and l.deleted_at is null
  order by t.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_lecture_transcripts(vector, int) to authenticated;