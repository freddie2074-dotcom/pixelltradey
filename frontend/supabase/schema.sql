-- ============================================================
-- PIXELL TRADE — Supabase schema
-- Non-custodial model: PixellTrade never holds user funds.
-- Users connect their own Binance API key (trade-only, no
-- withdrawal permission — that is set on the Binance side).
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- api_keys ----------
-- Stores ENCRYPTED Binance API key/secret. Encryption/decryption
-- happens only in the backend using a server-side master key.
-- No client (anon or authenticated role) may ever read this table —
-- only the service_role key (used exclusively by the backend) can.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  encrypted_api_key text not null,
  encrypted_api_secret text not null,
  iv text not null,
  auth_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;
-- Intentionally NO policies granting select/insert/update to
-- authenticated/anon roles. RLS with zero policies = zero access
-- for those roles. Only service_role (bypasses RLS) can touch this.

-- ---------- bots ----------
create type bot_type as enum ('btc_accumulation', 'eth_dca_pro');

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_type bot_type not null,
  symbol text not null,                     -- e.g. 'BTCUSDT'
  amount_usdt numeric not null check (amount_usdt > 0),
  interval_hours numeric not null check (interval_hours > 0),
  dip_threshold_pct numeric not null default 0, -- extra buy trigger, e.g. 3 = buy more on a 3% dip
  use_rsi_filter boolean not null default false,
  rsi_buy_below numeric default 35,
  active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bots enable row level security;

create policy "Users manage their own bots"
  on public.bots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- trades ----------
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references public.bots(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('BUY', 'SELL')),
  quantity numeric not null,
  price numeric not null,
  usdt_amount numeric not null,
  binance_order_id text,
  status text not null default 'FILLED',
  reason text,                     -- e.g. 'scheduled', 'dip_trigger', 'rsi_trigger'
  executed_at timestamptz not null default now()
);

alter table public.trades enable row level security;

create policy "Users view their own trades"
  on public.trades for select
  using (auth.uid() = user_id);

-- trades are inserted only by the backend via service_role,
-- so no insert policy is granted to authenticated/anon roles.

-- ---------- helpful index ----------
create index if not exists idx_bots_active on public.bots (active) where active = true;
create index if not exists idx_trades_user on public.trades (user_id, executed_at desc);
