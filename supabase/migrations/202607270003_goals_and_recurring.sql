create or replace function public.contribute_to_goal(p_goal_id uuid, p_amount numeric)
returns public.goals language plpgsql set search_path = public
as $$
declare item public.goals;
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select * into item from public.goals where id=p_goal_id for update;
  if item.id is null or not public.is_household_member(item.household_id) then raise exception 'Goal not found or access denied'; end if;
  insert into public.goal_contributions(goal_id,amount,created_by) values(item.id,p_amount,(select auth.uid()));
  update public.goals set current_amount=least(target_amount,current_amount+p_amount),
    completed=(current_amount+p_amount>=target_amount) where id=item.id returning * into item;
  return item;
end $$;

create or replace function public.run_due_recurring()
returns integer language plpgsql security definer set search_path = public
as $$
declare rule public.recurring_rules; processed integer := 0;
begin
  for rule in select * from public.recurring_rules where active and auto_create and next_run_at <= now() for update
  loop
    insert into public.transactions(household_id,account_id,category_id,created_by,type,amount,currency,booked_at,note)
      values(rule.household_id,rule.account_id,rule.category_id,rule.created_by,'expense',rule.amount,rule.currency,rule.next_run_at,rule.name);
    update public.accounts set balance=balance-rule.amount,updated_at=now() where id=rule.account_id;
    update public.recurring_rules set next_run_at=case rule.frequency
      when 'daily' then rule.next_run_at+interval '1 day'
      when 'weekly' then rule.next_run_at+interval '1 week'
      when 'monthly' then rule.next_run_at+interval '1 month'
      when 'yearly' then rule.next_run_at+interval '1 year' end
      where id=rule.id;
    processed := processed+1;
  end loop;
  return processed;
end $$;
revoke all on function public.run_due_recurring() from public, anon, authenticated;
grant execute on function public.run_due_recurring() to service_role;

create or replace view public.monthly_category_spending
with (security_invoker=true)
as
select t.household_id, date_trunc('month',t.booked_at)::date as month, t.category_id,
  coalesce(c.name,'Без категорії') as category_name,
  sum(coalesce(t.personal_share,t.amount)) filter(where t.type='expense') as spent,
  sum(t.amount) filter(where t.type='income') as income,
  count(*) filter(where t.is_impulsive) as impulsive_count,
  sum(coalesce(t.personal_share,t.amount)) filter(where t.type='expense' and t.is_impulsive) as impulsive_spent
from public.transactions t left join public.categories c on c.id=t.category_id
group by t.household_id,date_trunc('month',t.booked_at)::date,t.category_id,c.name;
