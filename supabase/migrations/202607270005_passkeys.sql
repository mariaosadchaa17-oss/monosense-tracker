create table public.passkey_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_name text,
  backed_up boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index passkey_credentials_user_idx on public.passkey_credentials(user_id);
alter table public.passkey_credentials enable row level security;
create policy "own passkeys" on public.passkey_credentials for select to authenticated using(user_id=(select auth.uid()));
create policy "delete own passkeys" on public.passkey_credentials for delete to authenticated using(user_id=(select auth.uid()));

create table public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  challenge text not null,
  purpose text not null check(purpose in ('registration','authentication')),
  expires_at timestamptz not null default now()+interval '5 minutes',
  created_at timestamptz not null default now()
);
alter table public.webauthn_challenges enable row level security;

alter table public.profiles add column if not exists pin_enabled boolean not null default false;
alter table public.profiles add column if not exists pin_updated_at timestamptz;
