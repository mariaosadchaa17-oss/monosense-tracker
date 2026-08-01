create or replace function public.repay_debt(
  p_debt_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_amount numeric,
  p_note text default null,
  p_booked_at timestamptz default now()
) returns public.transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_debt public.debts;
  target_account public.accounts;
  result public.transactions;
begin
  if p_amount <= 0 then raise exception 'Сума погашення має бути більшою за нуль'; end if;

  select * into target_debt from public.debts where id = p_debt_id for update;
  if target_debt.id is null or target_debt.settled or not public.is_household_member(target_debt.household_id) then
    raise exception 'Борг не знайдено або вже погашено';
  end if;
  if target_debt.direction <> 'i_owe' then
    raise exception 'Як витрату можна погашати лише борги «Я винна»';
  end if;
  if p_amount > target_debt.amount then
    raise exception 'Сума погашення перевищує залишок боргу';
  end if;

  select * into target_account from public.accounts where id = p_account_id for update;
  if target_account.id is null or target_account.household_id <> target_debt.household_id then
    raise exception 'Рахунок не знайдено або він належить іншому простору';
  end if;
  if upper(target_account.currency) <> upper(target_debt.currency) then
    raise exception 'Валюта рахунку має збігатися з валютою боргу';
  end if;

  insert into public.transactions(
    household_id, account_id, category_id, created_by, type, amount, currency, note, booked_at
  ) values (
    target_debt.household_id, target_account.id, p_category_id, auth.uid(), 'expense', p_amount,
    upper(target_debt.currency), coalesce(nullif(trim(p_note), ''), 'Погашення боргу: ' || target_debt.person), p_booked_at
  ) returning * into result;

  update public.accounts set balance = balance - p_amount, updated_at = now() where id = target_account.id;

  update public.debts set
    amount = target_debt.amount - p_amount,
    settled = (target_debt.amount - p_amount) = 0
  where id = target_debt.id;

  return result;
end
$$;

grant execute on function public.repay_debt(uuid, uuid, uuid, numeric, text, timestamptz) to authenticated;
