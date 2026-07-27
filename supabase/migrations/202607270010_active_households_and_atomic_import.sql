alter table public.profiles
  add column if not exists active_household_id uuid references public.households(id) on delete set null;

update public.profiles p
set active_household_id=(
  select hm.household_id
  from public.household_members hm
  where hm.user_id=p.id
  order by hm.joined_at
  limit 1
)
where p.active_household_id is null;

alter table public.budgets
  add column if not exists period_type text not null default 'month'
  check(period_type in ('month','week'));

alter table public.budgets
  drop constraint if exists budgets_household_id_category_id_month_key;
alter table public.budgets
  add constraint budgets_household_category_period_unique
  unique(household_id,category_id,month,period_type);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare new_household uuid;
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',split_part(new.email,'@',1)));
  insert into public.households(name,created_by)
  values('Мої фінанси',new.id) returning id into new_household;
  insert into public.household_members(household_id,user_id,role)
  values(new_household,new.id,'owner');
  update public.profiles set active_household_id=new_household where id=new.id;
  insert into public.notification_preferences(user_id) values(new.id);
  insert into public.categories(household_id,name,icon,color,kind,created_by) values
    (new_household,'Продукти','Utensils','#FF6B55','expense',new.id),
    (new_household,'Транспорт','Car','#6558E8','expense',new.id),
    (new_household,'Житло','House','#159B70','expense',new.id),
    (new_household,'Здоров’я','HeartPulse','#E0527D','expense',new.id),
    (new_household,'Розваги','Sparkles','#F4B740','expense',new.id),
    (new_household,'Зарплата','BriefcaseBusiness','#159B70','income',new.id);
  return new;
end $$;

create or replace function public.import_finance_transactions(
  p_account_id uuid,
  p_rows jsonb
) returns integer
language plpgsql
set search_path=public
as $$
declare target public.accounts; imported integer; balance_delta numeric;
begin
  select * into target from public.accounts where id=p_account_id for update;
  if target.id is null or not public.is_household_editor(target.household_id) then
    raise exception 'Account not found or access denied';
  end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>2000 then
    raise exception 'Invalid import payload';
  end if;

  with source as (
    select
      case when row->>'type'='income' then 'income'::public.transaction_type else 'expense'::public.transaction_type end as type,
      (row->>'amount')::numeric as amount,
      nullif(row->>'note','') as note,
      coalesce((row->>'booked_at')::timestamptz,now()) as booked_at,
      nullif(row->>'category_id','')::uuid as category_id
    from jsonb_array_elements(p_rows) row
  ), inserted as (
    insert into public.transactions(
      household_id,account_id,category_id,created_by,type,amount,currency,note,booked_at
    )
    select target.household_id,target.id,source.category_id,(select auth.uid()),
      source.type,source.amount,target.currency,source.note,source.booked_at
    from source
    where source.amount>0
      and (source.category_id is null or exists(
        select 1 from public.categories c
        where c.id=source.category_id and c.household_id=target.household_id
      ))
    returning type,amount
  )
  select count(*),
    coalesce(sum(case when type='income' then amount else -amount end),0)
  into imported,balance_delta
  from inserted;

  update public.accounts
  set balance=balance+balance_delta,updated_at=now()
  where id=target.id;
  return imported;
end $$;

grant execute on function public.import_finance_transactions(uuid,jsonb) to authenticated;

create or replace function public.create_service_finance_transaction(
  p_user_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_amount numeric,
  p_note text,
  p_booked_at timestamptz default now()
) returns public.transactions
language plpgsql
security definer
set search_path=public
as $$
declare target public.accounts; result public.transactions;
begin
  if p_amount<=0 then raise exception 'Amount must be positive'; end if;
  select * into target from public.accounts where id=p_account_id for update;
  if target.id is null or not exists(
    select 1 from public.household_members
    where household_id=target.household_id and user_id=p_user_id
      and role in ('owner','admin','member')
  ) then raise exception 'Account not found or access denied'; end if;
  if p_category_id is not null and not exists(
    select 1 from public.categories where id=p_category_id and household_id=target.household_id
  ) then raise exception 'Category does not belong to household'; end if;
  insert into public.transactions(
    household_id,account_id,category_id,created_by,type,amount,currency,note,booked_at
  ) values(
    target.household_id,target.id,p_category_id,p_user_id,'expense',p_amount,
    target.currency,left(p_note,500),p_booked_at
  ) returning * into result;
  update public.accounts set balance=balance-p_amount,updated_at=now() where id=target.id;
  return result;
end $$;

revoke all on function public.create_service_finance_transaction(uuid,uuid,uuid,numeric,text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.create_service_finance_transaction(uuid,uuid,uuid,numeric,text,timestamptz)
  to service_role;

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path=public
as $$
declare row_data jsonb; old_row jsonb; home_id uuid; entity text; actor uuid;
begin
  row_data:=case when tg_op='DELETE' then null else to_jsonb(new) end;
  old_row:=case when tg_op='INSERT' then null else to_jsonb(old) end;
  home_id:=coalesce((row_data->>'household_id')::uuid,(old_row->>'household_id')::uuid);
  entity:=coalesce(row_data->>'id',old_row->>'id');
  actor:=coalesce((select auth.uid()),nullif(row_data->>'created_by','')::uuid,nullif(old_row->>'created_by','')::uuid);
  insert into public.audit_logs(household_id,actor_id,entity_type,entity_id,action,old_data,new_data)
  values(home_id,actor,tg_table_name,entity,lower(tg_op),old_row,row_data);
  return coalesce(new,old);
end $$;

drop view if exists public.active_budget_alerts;
create view public.active_budget_alerts
with (security_invoker=true)
as
select b.id,b.household_id,b.category_id,b.month,b.period_type,b.limit_amount,b.currency,
  b.alert_80_sent,b.alert_100_sent,c.name as category_name,
  coalesce(sum(coalesce(t.personal_share,t.amount)) filter(where t.type='expense'),0) as spent
from public.budgets b
join public.categories c on c.id=b.category_id
left join public.transactions t
  on t.household_id=b.household_id and t.category_id=b.category_id
  and t.booked_at>=b.month
  and t.booked_at<b.month+case when b.period_type='week' then interval '1 week' else interval '1 month' end
where
  (b.period_type='month' and b.month=date_trunc('month',current_date)::date)
  or
  (b.period_type='week' and b.month=date_trunc('week',current_date)::date)
group by b.id,c.name;
