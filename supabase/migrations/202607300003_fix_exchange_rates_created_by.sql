-- Missed table in the previous user-deletion fix: exchange_rates.created_by
-- also referenced auth.users(id) without ON DELETE, blocking user deletion
-- whenever that user had saved a custom exchange rate.

alter table public.exchange_rates alter column created_by drop not null;
alter table public.exchange_rates drop constraint if exists exchange_rates_created_by_fkey;
alter table public.exchange_rates add constraint exchange_rates_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;
