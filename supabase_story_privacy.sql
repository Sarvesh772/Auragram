create table if not exists public.story_close_friends (
  story_id uuid references public.stories(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (story_id, user_id)
);

alter table public.stories add column if not exists privacy text default 'public';

alter table public.story_close_friends enable row level security;
create policy "Users can read close friend rows" on public.story_close_friends for select to authenticated using (true);
create policy "Story owners manage close friend rows" on public.story_close_friends for all to authenticated using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid())) with check (exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid()));
