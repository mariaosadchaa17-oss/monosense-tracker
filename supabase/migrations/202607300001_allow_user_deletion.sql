-- Allow deleting users even if they created households/accounts/etc.
-- Historical records keep existing but created_by becomes null instead of blocking deletion.

alter table public.households alter column created_by drop not null;
alter table public.households drop constraint if exists households_created_by_fkey;
alter table public.households add constraint households_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.categories alter column created_by drop not null;
alter table public.categories drop constraint if exists categories_created_by_fkey;
alter table public.categories add constraint categories_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.accounts alter column created_by drop not null;
alter table public.accounts drop constraint if exists accounts_created_by_fkey;
alter table public.accounts add constraint accounts_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.transactions alter column created_by drop not null;
alter table public.transactions drop constraint if exists transactions_created_by_fkey;
alter table public.transactions add constraint transactions_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.transfers alter column created_by drop not null;
alter table public.transfers drop constraint if exists transfers_created_by_fkey;
alter table public.transfers add constraint transfers_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.recurring_rules alter column created_by drop not null;
alter table public.recurring_rules drop constraint if exists recurring_rules_created_by_fkey;
alter table public.recurring_rules add constraint recurring_rules_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.budgets alter column created_by drop not null;
alter table public.budgets drop constraint if exists budgets_created_by_fkey;
alter table public.budgets add constraint budgets_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.goals alter column created_by drop not null;
alter table public.goals drop constraint if exists goals_created_by_fkey;
alter table public.goals add constraint goals_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.goal_contributions alter column created_by drop not null;
alter table public.goal_contributions drop constraint if exists goal_contributions_created_by_fkey;
alter table public.goal_contributions add constraint goal_contributions_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.debts alter column created_by drop not null;
alter table public.debts drop constraint if exists debts_created_by_fkey;
alter table public.debts add constraint debts_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.household_invitations alter column invited_by drop not null;
alter table public.household_invitations drop constraint if exists household_invitations_invited_by_fkey;
alter table public.household_invitations add constraint household_invitations_invited_by_fkey
  foreign key (invited_by) references auth.users(id) on delete set null;
