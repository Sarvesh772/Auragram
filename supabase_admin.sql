create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'moderator' check (role in ('owner', 'admin', 'moderator')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
drop policy if exists "admins can read own access" on public.admin_users;
create policy "admins can read own access" on public.admin_users
  for select to authenticated
  using (user_id = auth.uid());

alter table public.reports add column if not exists status text not null default 'open';
create index if not exists admin_users_role_idx on public.admin_users(role);
