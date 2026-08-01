-- Admin variant of create_finance_transaction for server-to-server callers
-- (e.g. the Telegram webhook) that use the Supabase service-role client and
-- therefore have no auth.uid() / RLS session. The caller must resolve and
-- pass the acting user's id explicitly; membership is checked against that
-- id instead of auth.uid().
create or replace function public.create_finance_transaction_admin(
  p_user_id uuid,
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
security definer
set search_path = public
as $$
declare
  target_account public.accounts;
  result public.transactions;
  effective_amount numeric;
  is_member boolean;
begin
  if p_user_id is null then raise exception 'User id is required'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select * into target_account from public.accounts where id = p_account_id for update;
  if target_account.id is null then
    raise exception 'Account not found or access denied';
  end if;

  select exists(
    select 1 from public.household_members m
    where m.household_id = target_account.household_id and m.user_id = p_user_id
  ) into is_member;
  if not is_member then
    raise exception 'Account not found or access denied';
  end if;

  if upper(p_currency) <> upper(target_account.currency) then raise exception 'Currency must match account currency'; end if;

  effective_amount := coalesce(p_personal_share, p_amount);
  insert into public.transactions(
    household_id, account_id, category_id, created_by, type, amount, currency,
    note, booked_at, is_impulsive, split_total, personal_share
  ) values (
    target_account.household_id, p_account_id, p_category_id, p_user_id, p_type,
    p_amount, upper(p_currency), p_note, p_booked_at, p_is_impulsive, p_split_total, p_personal_share
  ) returning * into result;

  update public.accounts set
    balance = balance + case when p_type = 'income' then effective_amount else -effective_amount end,
    updated_at = now()
  where id = p_account_id;

  return result;
end $$;

-- Only the service role should call this; it bypasses auth.uid()-based checks
-- by design, so it must never be reachable by ordinary authenticated users.
revoke all on function public.create_finance_transaction_admin(
  uuid, uuid, uuid, public.transaction_type, numeric, text, text, timestamptz, boolean, numeric, numeric
) from public, anon, authenticated;
grant execute on function public.create_finance_transaction_admin(
  uuid, uuid, uuid, public.transaction_type, numeric, text, text, timestamptz, boolean, numeric, numeric
) to service_role;
