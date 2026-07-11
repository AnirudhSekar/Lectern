alter table public.profiles enable row level security;
alter table public.lectures enable row level security;
alter table public.transcripts enable row level security;
alter table public.summaries enable row level security;
alter table public.usage_logs enable row level security;

-- profiles: read/update own row only
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- lectures: full CRUD, own rows only
create policy "lectures_select_own" on public.lectures
  for select using (auth.uid() = user_id);

create policy "lectures_insert_own" on public.lectures
  for insert with check (auth.uid() = user_id);

create policy "lectures_update_own" on public.lectures
  for update using (auth.uid() = user_id);

create policy "lectures_delete_own" on public.lectures
  for delete using (auth.uid() = user_id);

-- transcripts: gated via parent lecture ownership (no direct user_id column)
create policy "transcripts_select_own" on public.transcripts
  for select using (
    exists (
      select 1 from public.lectures
      where lectures.id = transcripts.lecture_id
      and lectures.user_id = auth.uid()
    )
  );

-- summaries: same pattern
create policy "summaries_select_own" on public.summaries
  for select using (
    exists (
      select 1 from public.lectures
      where lectures.id = summaries.lecture_id
      and lectures.user_id = auth.uid()
    )
  );

-- usage_logs: read own only, writes always via service-role (bypasses RLS)
create policy "usage_logs_select_own" on public.usage_logs
  for select using (auth.uid() = user_id);