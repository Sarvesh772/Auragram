create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade, reason text, created_at timestamptz not null default now()
);
create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users(id) on delete cascade, blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (blocker_id, blocked_id)
);
create table if not exists public.muted_users (
  muter_id uuid not null references auth.users(id) on delete cascade, muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (muter_id, muted_id)
);
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;
alter table public.muted_users enable row level security;
create policy "users submit reports" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "users manage blocks" on public.blocked_users for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);
create policy "users manage mutes" on public.muted_users for all using (auth.uid() = muter_id) with check (auth.uid() = muter_id);
