create table google_oauth_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_encrypted text not null,
  updated_at timestamptz not null default now()
);

alter table google_oauth_tokens enable row level security;

create policy "Users manage their own token"
  on google_oauth_tokens
  for all
  using (auth.uid() = user_id);