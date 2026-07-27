alter table public.recurring_rules
  add column if not exists last_reminded_at timestamptz;

create index if not exists recurring_reminder_due_idx
  on public.recurring_rules(next_run_at)
  where active and not auto_create;
