create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy "own push subscriptions" on public.push_subscriptions for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create or replace view public.active_budget_alerts
with (security_invoker=true)
as
select b.id,b.household_id,b.category_id,b.month,b.limit_amount,b.currency,
  b.alert_80_sent,b.alert_100_sent,c.name as category_name,
  coalesce(sum(coalesce(t.personal_share,t.amount)) filter(where t.type='expense'),0) as spent
from public.budgets b join public.categories c on c.id=b.category_id
left join public.transactions t on t.household_id=b.household_id and t.category_id=b.category_id
  and t.booked_at>=b.month and t.booked_at<b.month+interval '1 month'
where b.month=date_trunc('month',current_date)::date
group by b.id,c.name;
