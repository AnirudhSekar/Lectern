-- Lecture status enum
create type lecture_status as enum ('queued', 'transcribing', 'summarizing', 'done', 'failed');

-- Extends auth.users (Supabase-managed) with app-specific fields
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  daily_upload_count int not null default 0,
  account_created_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  audio_storage_path text,
  status lecture_status not null default 'queued',
  duration_seconds int,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  full_text text,
  created_at timestamptz not null default now()
);

create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  summary_text text,
  study_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  ip_address text,
  action text not null,
  created_at timestamptz not null default now()
);

-- FK lookup indexes
create index lectures_user_id_idx on public.lectures(user_id);
create index transcripts_lecture_id_idx on public.transcripts(lecture_id);
create index summaries_lecture_id_idx on public.summaries(lecture_id);
create index usage_logs_user_id_idx on public.usage_logs(user_id);

-- Enforce the 1:1 relationships from §1.4 (one transcript, one summary per lecture)
create unique index transcripts_lecture_id_unique on public.transcripts(lecture_id);
create unique index summaries_lecture_id_unique on public.summaries(lecture_id);

-- Auto-create a profiles row whenever someone signs up via Supabase Auth —
-- needed before TASK-1.4's login flow has anywhere to attach app data.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();