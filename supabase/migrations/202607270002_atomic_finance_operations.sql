create or replace function public.create_finance_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_type public.transaction_type,
  p_amount numeric,
  p_currency text,
  p_note text default null,
  p_booked_at timestamptz default now(),
  p_is_impulsive boolean default false,
  p_split_total numeric default null,
  p_personal_share numeric default null
) returns public.transactions
language plpgsql
set search_path = public
as $$
declare
  target_account public.accounts;
  result public.transactions;
  effective_amount numeric;
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select * into target_account from public.accounts where id = p_account_id for update;
  if target_account.id is null or not public.is_household_member(target_account.household_id) then
    raise exception 'Account not found or access denied';
  end if;
  if upper(p_currency) <> upper(target_account.currency) then raise exception 'Currency must match account currency'; end if;
  effective_amount := coalesce(p_personal_share, p_amount);
  insert into public.transactions(
    household_id, account_id, category_id, created_by, type, amount, currency,
    note, booked_at, is_impulsive, split_total, personal_share
  ) values (
    target_account.household_id, p_account_id, p_category_id, (select auth.uid()), p_type,
    p_amount, upper(p_currency), p_note, p_booked_at, p_is_impulsive, p_split_total, p_personal_share
  ) returning * into result;
  update public.accounts set
    balance = balance + case when p_type = 'income' then effective_amount else -effective_amount end,
    updated_at = now()
  where id = p_account_id;
  return result;
end $$;

create or replace function public.delete_finance_transaction(p_transaction_id uuid)
returns void language plpgsql set search_path = public
as $$
declare item public.transactions; effective_amount numeric;
begin
  select * into item from public.transactions where id = p_transaction_id for update;
  if item.id is null or not public.is_household_member(item.household_id) then raise exception 'Transaction not found or access denied'; end if;
  if item.type in ('transfer','exchange') then raise exception 'Delete the linked transfer instead'; end if;
  effective_amount := coalesce(item.personal_share, item.amount);
  update public.accounts set balance = balance + case when item.type = 'income' then -effective_amount else effective_amount end, updated_at = now() where id = item.account_id;
  delete from public.transactions where id = p_transaction_id;
end $$;

create or replace function public.create_account_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_sent_amount numeric,
  p_received_amount numeric,
  p_exchange_rate numeric default 1,
  p_fee_amount numeric default 0,
  p_fee_currency text default null,
  p_note text default null
) returns uuid language plpgsql set search_path = public
as $$
declare source public.accounts; destination public.accounts; outgoing_id uuid; incoming_id uuid; transfer_id uuid;
begin
  if p_from_account_id = p_to_account_id then raise exception 'Accounts must differ'; end if;
  if p_sent_amount <= 0 or p_received_amount <= 0 or p_fee_amount < 0 then raise exception 'Invalid amounts'; end if;
  select * into source from public.accounts where id = p_from_account_id for update;
  select * into destination from public.accounts where id = p_to_account_id for update;
  if source.id is null or destination.id is null or source.household_id <> destination.household_id or not public.is_household_member(source.household_id) then
    raise exception 'Accounts not found or access denied';
  end if;
  insert into public.transactions(household_id,account_id,created_by,type,amount,currency,note)
    values(source.household_id,source.id,(select auth.uid()),case when source.currency=destination.currency then 'transfer' else 'exchange' end,p_sent_amount,source.currency,p_note)
    returning id into outgoing_id;
  insert into public.transactions(household_id,account_id,created_by,type,amount,currency,note)
    values(source.household_id,destination.id,(select auth.uid()),case when source.currency=destination.currency then 'transfer' else 'exchange' end,p_received_amount,destination.currency,p_note)
    returning id into incoming_id;
  update public.accounts set balance=balance-p_sent_amount-case when coalesce(p_fee_currency,source.currency)=source.currency then p_fee_amount else 0 end,updated_at=now() where id=source.id;
  update public.accounts set balance=balance+p_received_amount-case when p_fee_currency=destination.currency then p_fee_amount else 0 end,updated_at=now() where id=destination.id;
  insert into public.transfers(household_id,from_account_id,to_account_id,from_transaction_id,to_transaction_id,sent_amount,received_amount,exchange_rate,fee_amount,fee_currency,created_by)
    values(source.household_id,source.id,destination.id,outgoing_id,incoming_id,p_sent_amount,p_received_amount,p_exchange_rate,p_fee_amount,p_fee_currency,(select auth.uid()))
    returning id into transfer_id;
  return transfer_id;
end $$;

create or replace function public.delete_account_transfer(p_transfer_id uuid)
returns void language plpgsql set search_path = public
as $$
declare item public.transfers; source public.accounts; destination public.accounts;
begin
  select * into item from public.transfers where id=p_transfer_id for update;
  if item.id is null or not public.is_household_member(item.household_id) then raise exception 'Transfer not found or access denied'; end if;
  select * into source from public.accounts where id=item.from_account_id for update;
  select * into destination from public.accounts where id=item.to_account_id for update;
  update public.accounts set balance=balance+item.sent_amount+case when coalesce(item.fee_currency,source.currency)=source.currency then item.fee_amount else 0 end,updated_at=now() where id=source.id;
  update public.accounts set balance=balance-item.received_amount+case when item.fee_currency=destination.currency then item.fee_amount else 0 end,updated_at=now() where id=destination.id;
  delete from public.transfers where id=p_transfer_id;
end $$;
