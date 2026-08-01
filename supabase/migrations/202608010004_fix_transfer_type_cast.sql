-- create_account_transfer built its transaction "type" via a CASE
-- expression, which Postgres resolves to text rather than the
-- transaction_type enum, causing:
--   column "type" is of type transaction_type but expression is of type text
-- Recreated with explicit casts on both branches of the CASE.
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
declare source public.accounts; destination public.accounts; outgoing_id uuid; incoming_id uuid; transfer_id uuid; move_type public.transaction_type;
begin
  if p_from_account_id = p_to_account_id then raise exception 'Accounts must differ'; end if;
  if p_sent_amount <= 0 or p_received_amount <= 0 or p_fee_amount < 0 then raise exception 'Invalid amounts'; end if;
  select * into source from public.accounts where id = p_from_account_id for update;
  select * into destination from public.accounts where id = p_to_account_id for update;
  if source.id is null or destination.id is null or source.household_id <> destination.household_id or not public.is_household_member(source.household_id) then
    raise exception 'Accounts not found or access denied';
  end if;
  move_type := case when source.currency = destination.currency then 'transfer'::public.transaction_type else 'exchange'::public.transaction_type end;
  insert into public.transactions(household_id,account_id,created_by,type,amount,currency,note)
    values(source.household_id,source.id,(select auth.uid()),move_type,p_sent_amount,source.currency,p_note)
    returning id into outgoing_id;
  insert into public.transactions(household_id,account_id,created_by,type,amount,currency,note)
    values(source.household_id,destination.id,(select auth.uid()),move_type,p_received_amount,destination.currency,p_note)
    returning id into incoming_id;
  update public.accounts set balance=balance-p_sent_amount-case when coalesce(p_fee_currency,source.currency)=source.currency then p_fee_amount else 0 end,updated_at=now() where id=source.id;
  update public.accounts set balance=balance+p_received_amount-case when p_fee_currency=destination.currency then p_fee_amount else 0 end,updated_at=now() where id=destination.id;
  insert into public.transfers(household_id,from_account_id,to_account_id,from_transaction_id,to_transaction_id,sent_amount,received_amount,exchange_rate,fee_amount,fee_currency,created_by)
    values(source.household_id,source.id,destination.id,outgoing_id,incoming_id,p_sent_amount,p_received_amount,p_exchange_rate,p_fee_amount,p_fee_currency,(select auth.uid()))
    returning id into transfer_id;
  return transfer_id;
end $$;
