alter table public.profiles
  add column if not exists username text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists planning_period text not null default 'month'
    check (planning_period in ('month','week')),
  add column if not exists primary_goal text;

create unique index if not exists profiles_username_unique
  on public.profiles(lower(username))
  where username is not null;

update public.profiles p set onboarding_completed=true
where exists(
  select 1 from public.household_members hm
  join public.accounts a on a.household_id=hm.household_id
  where hm.user_id=p.id
);

alter table public.accounts
  add column if not exists card_color text;

alter table public.household_invitations
  alter column email drop not null,
  add column if not exists username text,
  add constraint invitation_target_required
    check (email is not null or username is not null);
