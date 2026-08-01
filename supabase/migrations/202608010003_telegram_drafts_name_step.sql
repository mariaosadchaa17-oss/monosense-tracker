alter table public.telegram_drafts
  add column if not exists amount numeric(16,2),
  drop constraint if exists telegram_drafts_step_check,
  add constraint telegram_drafts_step_check check (step in ('account','category','amount','name'));
