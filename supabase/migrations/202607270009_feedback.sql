create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check(rating between 1 and 5),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
create policy "own feedback" on public.feedback for insert to authenticated
with check(user_id=(select auth.uid()));
create policy "read own feedback" on public.feedback for select to authenticated
using(user_id=(select auth.uid()));
