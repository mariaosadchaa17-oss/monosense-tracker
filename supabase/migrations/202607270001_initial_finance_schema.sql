create extension if not exists "pgcrypto";

create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.transaction_type as enum ('expense', 'income', 'transfer', 'exchange', 'adjustment');
create type public.recurring_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.debt_direction as enum ('owed_to_me', 'i_owe');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  base_currency text not null default 'UAH',
  locale text not null default 'uk',
  pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'UAH',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create or replace function public.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.household_members m where m.household_id = target_household and m.user_id = (select auth.uid())) $$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text not null default 'CircleDollarSign',
  color text not null default '#6558E8',
  kind public.transaction_type not null default 'expense',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(household_id, name, kind)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  bank text,
  owner_label text,
  currency text not null default 'UAH',
  balance numeric(16,2) not null default 0,
  credit_limit numeric(16,2) not null default 0,
  grace_period_end date,
  icon text,
  color text,
  archived boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  created_by uuid not null references auth.users(id),
  type public.transaction_type not null,
  amount numeric(16,2) not null check (amount >= 0),
  currency text not null,
  booked_at timestamptz not null default now(),
  note text,
  is_impulsive boolean not null default false,
  split_total numeric(16,2),
  personal_share numeric(16,2),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_household_booked_idx on public.transactions(household_id, booked_at desc);
create index transactions_account_idx on public.transactions(account_id);
create index transactions_category_idx on public.transactions(category_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  unique(household_id, name)
);

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key(transaction_id, tag_id)
);

create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  participant text not null,
  amount numeric(16,2) not null check (amount >= 0),
  is_mine boolean not null default false
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id),
  to_account_id uuid not null references public.accounts(id),
  from_transaction_id uuid references public.transactions(id),
  to_transaction_id uuid references public.transactions(id),
  sent_amount numeric(16,2) not null,
  received_amount numeric(16,2) not null,
  exchange_rate numeric(18,8) not null default 1,
  fee_amount numeric(16,2) not null default 0,
  fee_currency text,
  booked_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  check (from_account_id <> to_account_id)
);

create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id),
  category_id uuid references public.categories(id),
  name text not null,
  amount numeric(16,2) not null,
  currency text not null,
  frequency public.recurring_frequency not null,
  next_run_at timestamptz not null,
  auto_create boolean not null default false,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null,
  limit_amount numeric(16,2) not null check (limit_amount > 0),
  currency text not null,
  alert_80_sent boolean not null default false,
  alert_100_sent boolean not null default false,
  created_by uuid not null references auth.users(id),
  unique(household_id, category_id, month)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  target_amount numeric(16,2) not null check (target_amount > 0),
  current_amount numeric(16,2) not null default 0,
  currency text not null,
  target_date date,
  color text,
  completed boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  amount numeric(16,2) not null check (amount > 0),
  contributed_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person text not null,
  direction public.debt_direction not null,
  amount numeric(16,2) not null check (amount > 0),
  currency text not null,
  due_date date,
  note text,
  settled boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.exchange_rates (
  id bigint generated always as identity primary key,
  rate_date date not null,
  base_currency text not null default 'UAH',
  quote_currency text not null,
  official_rate numeric(18,8) not null,
  custom_rate numeric(18,8),
  household_id uuid references public.households(id) on delete cascade,
  source text not null default 'NBU',
  unique(rate_date, quote_currency, household_id)
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  budget_80 boolean not null default true,
  budget_100 boolean not null default true,
  recurring_reminders boolean not null default true,
  push_enabled boolean not null default false,
  telegram_chat_id text
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  household_id uuid references public.households(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_household_created_idx on public.audit_logs(household_id, created_at desc);

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare row_data jsonb; old_row jsonb; home_id uuid; entity text;
begin
  row_data := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  old_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  home_id := coalesce((row_data->>'household_id')::uuid, (old_row->>'household_id')::uuid);
  entity := coalesce(row_data->>'id', old_row->>'id');
  insert into public.audit_logs(household_id, actor_id, entity_type, entity_id, action, old_data, new_data)
  values(home_id, (select auth.uid()), tg_table_name, entity, lower(tg_op), old_row, row_data);
  return coalesce(new, old);
end $$;

create trigger audit_transactions after insert or update or delete on public.transactions for each row execute function public.audit_row_change();
create trigger audit_accounts after insert or update or delete on public.accounts for each row execute function public.audit_row_change();
create trigger audit_transfers after insert or update or delete on public.transfers for each row execute function public.audit_row_change();
create trigger audit_budgets after insert or update or delete on public.budgets for each row execute function public.audit_row_change();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare new_household uuid;
begin
  insert into public.profiles(id, display_name) values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.households(name, created_by) values('Мої фінанси', new.id) returning id into new_household;
  insert into public.household_members(household_id, user_id, role) values(new_household, new.id, 'owner');
  insert into public.notification_preferences(user_id) values(new.id);
  insert into public.categories(household_id, name, icon, color, kind, created_by) values
    (new_household, 'Продукти', 'Utensils', '#FF6B55', 'expense', new.id),
    (new_household, 'Транспорт', 'Car', '#6558E8', 'expense', new.id),
    (new_household, 'Житло', 'House', '#159B70', 'expense', new.id),
    (new_household, 'Здоров’я', 'HeartPulse', '#E0527D', 'expense', new.id),
    (new_household, 'Розваги', 'Sparkles', '#F4B740', 'expense', new.id),
    (new_household, 'Зарплата', 'BriefcaseBusiness', '#159B70', 'income', new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.transfers enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.debts enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs enable row level security;

create policy "own profile" on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "member households" on public.households for select to authenticated using (public.is_household_member(id));
create policy "create households" on public.households for insert to authenticated with check (created_by = (select auth.uid()));
create policy "member list" on public.household_members for select to authenticated using (public.is_household_member(household_id));
create policy "join self" on public.household_members for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own notifications" on public.notification_preferences for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "household categories" on public.categories for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household accounts" on public.accounts for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household transactions" on public.transactions for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household tags" on public.tags for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "transaction tag access" on public.transaction_tags for all to authenticated using (exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_member(t.household_id))) with check (exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_member(t.household_id)));
create policy "transaction split access" on public.transaction_splits for all to authenticated using (exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_member(t.household_id))) with check (exists(select 1 from public.transactions t where t.id=transaction_id and public.is_household_member(t.household_id)));
create policy "household transfers" on public.transfers for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household recurring" on public.recurring_rules for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household budgets" on public.budgets for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household goals" on public.goals for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "goal contributions" on public.goal_contributions for all to authenticated using (exists(select 1 from public.goals g where g.id=goal_id and public.is_household_member(g.household_id))) with check (exists(select 1 from public.goals g where g.id=goal_id and public.is_household_member(g.household_id)));
create policy "household debts" on public.debts for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "rates read" on public.exchange_rates for select to authenticated using (household_id is null or public.is_household_member(household_id));
create policy "custom rates" on public.exchange_rates for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household audit" on public.audit_logs for select to authenticated using (public.is_household_member(household_id));
