create table if not exists public.account_deletion_requests (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 requested_at timestamptz not null default now(),
 scheduled_for timestamptz not null,
 status text not null default 'pending'
);
alter table public.account_deletion_requests enable row level security;
create policy "users manage own deletion request" on public.account_deletion_requests for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.account_deletion_requests to authenticated;
