alter table public.debts
drop constraint if exists debts_amount_check;

alter table public.debts
add constraint debts_amount_check
check (amount >= 0);