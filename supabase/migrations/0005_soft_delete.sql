alter table public.lectures
  add column deleted_at timestamptz;

create index lectures_deleted_at_idx on public.lectures(deleted_at);