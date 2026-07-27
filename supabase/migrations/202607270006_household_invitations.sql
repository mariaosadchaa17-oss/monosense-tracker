create table public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now()+interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index household_invitations_household_idx on public.household_invitations(household_id);
alter table public.household_invitations enable row level security;
create policy "admins view invitations" on public.household_invitations for select to authenticated
using(exists(select 1 from public.household_members m where m.household_id=household_invitations.household_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));

-- A viewer can read shared finances but cannot change them. Invitations are
-- accepted through the server with the service role, so arbitrary self-join is removed.
drop policy if exists "join self" on public.household_members;
create or replace function public.is_household_editor(target_household uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(
  select 1 from public.household_members m
  where m.household_id=target_household
    and m.user_id=(select auth.uid())
    and m.role in ('owner','admin','member')
) $$;

drop policy if exists "household categories" on public.categories;
drop policy if exists "household accounts" on public.accounts;
drop policy if exists "household transactions" on public.transactions;
drop policy if exists "household tags" on public.tags;
drop policy if exists "transaction tag access" on public.transaction_tags;
drop policy if exists "transaction split access" on public.transaction_splits;
drop policy if exists "household transfers" on public.transfers;
drop policy if exists "household recurring" on public.recurring_rules;
drop policy if exists "household budgets" on public.budgets;
drop policy if exists "household goals" on public.goals;
drop policy if exists "goal contributions" on public.goal_contributions;
drop policy if exists "household debts" on public.debts;
drop policy if exists "custom rates" on public.exchange_rates;

create policy "read categories" on public.categories for select to authenticated using(public.is_household_member(household_id));
create policy "edit categories" on public.categories for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read accounts" on public.accounts for select to authenticated using(public.is_household_member(household_id));
create policy "edit accounts" on public.accounts for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read transactions" on public.transactions for select to authenticated using(public.is_household_member(household_id));
create policy "edit transactions" on public.transactions for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read tags" on public.tags for select to authenticated using(public.is_household_member(household_id));
create policy "edit tags" on public.tags for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read transaction tags" on public.transaction_tags for select to authenticated using(exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_member(t.household_id)));
create policy "edit transaction tags" on public.transaction_tags for all to authenticated using(exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_editor(t.household_id))) with check(exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_editor(t.household_id)));
create policy "read transaction splits" on public.transaction_splits for select to authenticated using(exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_member(t.household_id)));
create policy "edit transaction splits" on public.transaction_splits for all to authenticated using(exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_editor(t.household_id))) with check(exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_editor(t.household_id)));
create policy "read transfers" on public.transfers for select to authenticated using(public.is_household_member(household_id));
create policy "edit transfers" on public.transfers for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read recurring" on public.recurring_rules for select to authenticated using(public.is_household_member(household_id));
create policy "edit recurring" on public.recurring_rules for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read budgets" on public.budgets for select to authenticated using(public.is_household_member(household_id));
create policy "edit budgets" on public.budgets for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read goals" on public.goals for select to authenticated using(public.is_household_member(household_id));
create policy "edit goals" on public.goals for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "read goal contributions" on public.goal_contributions for select to authenticated using(exists(select 1 from public.goals g where g.id=goal_id and public.is_household_member(g.household_id)));
create policy "edit goal contributions" on public.goal_contributions for all to authenticated using(exists(select 1 from public.goals g where g.id=goal_id and public.is_household_editor(g.household_id))) with check(exists(select 1 from public.goals g where g.id=goal_id and public.is_household_editor(g.household_id)));
create policy "read debts" on public.debts for select to authenticated using(public.is_household_member(household_id));
create policy "edit debts" on public.debts for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));
create policy "edit custom rates" on public.exchange_rates for all to authenticated using(public.is_household_editor(household_id)) with check(public.is_household_editor(household_id));

create or replace function public.remove_household_member(p_household_id uuid,p_user_id uuid)
returns void language plpgsql set search_path=public
as $$
begin
  if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=(select auth.uid()) and role in ('owner','admin')) then raise exception 'Access denied'; end if;
  if exists(select 1 from public.household_members where household_id=p_household_id and user_id=p_user_id and role='owner') then raise exception 'Owner cannot be removed'; end if;
  delete from public.household_members where household_id=p_household_id and user_id=p_user_id;
end $$;
