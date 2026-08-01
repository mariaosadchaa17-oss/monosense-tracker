-- Holds in-progress Telegram bot conversations (pick account -> pick
-- category -> enter amount) keyed by chat id. One row per chat; overwritten
-- on each step, deleted once the transaction is booked or cancelled.
create table if not exists public.telegram_drafts (
  telegram_chat_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  step text not null default 'account' check (step in ('account','category','amount')),
  updated_at timestamptz not null default now()
);

alter table public.telegram_drafts enable row level security;

-- Only the service role (webhook) touches this table.
revoke all on public.telegram_drafts from public, anon, authenticated;
grant all on public.telegram_drafts to service_role;
