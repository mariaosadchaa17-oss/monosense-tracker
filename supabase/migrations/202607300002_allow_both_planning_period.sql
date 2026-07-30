-- Onboarding lets users pick "week and month" together (period="both"),
-- but the planning_period check constraint only allowed 'month'/'week',
-- so saving onboarding with that choice always failed.

alter table public.profiles drop constraint if exists profiles_planning_period_check;
alter table public.profiles add constraint profiles_planning_period_check
  check (planning_period in ('month','week','both'));
