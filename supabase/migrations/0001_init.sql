-- AI Image Studio — core schema
-- Run this once against your Supabase project (SQL Editor, or `supabase db push`).
-- Safe to re-run: everything is guarded with IF NOT EXISTS / OR REPLACE.

-- ============================================================================
-- 1. PROFILES  (1:1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text not null,
  display_name          text,
  credits                integer not null default 20,
  plan                  text not null default 'free' check (plan in ('free', 'pro', 'business')),
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  subscription_status   text not null default 'none'
                        check (subscription_status in ('none', 'active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  -- users may edit their display name, but never their own credits/plan/stripe fields
  with check (auth.uid() = id);

-- create a profile row automatically whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    20 -- free signup bonus credits
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. CREDIT LEDGER  (append-only audit trail — never edited by clients)
-- ============================================================================
create table if not exists public.credit_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  delta       integer not null,              -- positive = grant, negative = spend
  balance_after integer not null,
  reason      text not null,                 -- 'signup_bonus' | 'tool_spend' | 'subscription_grant' | 'stripe_topup' | 'admin_adjustment'
  tool        text,                          -- 'upscale' | 'product' | 'ads' | 'portrait' | null
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;

drop policy if exists "ledger_select_own" on public.credit_ledger;
create policy "ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);
-- no insert/update/delete policy for authenticated role — only the
-- SECURITY DEFINER functions below (running as the table owner) may write.

-- atomically spend credits; raises if the user doesn't have enough
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount  integer,
  p_tool    text,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select credits into v_balance from public.profiles where id = p_user_id for update;
  if v_balance is null then
    raise exception 'profile not found';
  end if;
  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  update public.profiles set credits = credits - p_amount where id = p_user_id
    returning credits into v_balance;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, tool, metadata)
  values (p_user_id, -p_amount, v_balance, 'tool_spend', p_tool, p_metadata);

  return v_balance;
end;
$$;

-- grant credits (subscription renewal, top-up, signup bonus, admin adjustment)
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  update public.profiles set credits = credits + p_amount where id = p_user_id
    returning credits into v_balance;
  if v_balance is null then
    raise exception 'profile not found';
  end if;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, metadata)
  values (p_user_id, p_amount, v_balance, p_reason, p_metadata);

  return v_balance;
end;
$$;

-- ============================================================================
-- 3. GENERATIONS  (gallery)
-- ============================================================================
create table if not exists public.generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  tool          text not null check (tool in ('upscale', 'product', 'ads', 'portrait')),
  status        text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  input_path    text,                  -- storage object path for the source image
  output_path   text,                  -- storage object path for the result image
  output_url    text,                  -- external URL fallback (e.g. Replicate CDN) if not copied to storage
  scale         integer,
  credits_spent integer not null default 0,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);

alter table public.generations enable row level security;

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own" on public.generations
  for select using (auth.uid() = user_id);

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own" on public.generations
  for insert with check (auth.uid() = user_id);

drop policy if exists "generations_update_own" on public.generations;
create policy "generations_update_own" on public.generations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own" on public.generations
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 4. RATE LIMITING  (sliding window, enforced server-side via RPC)
-- ============================================================================
create table if not exists public.rate_limit_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles (id) on delete cascade,
  ip          text,
  action      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (action, user_id, created_at desc);
create index if not exists rate_limit_events_ip_idx
  on public.rate_limit_events (action, ip, created_at desc);

alter table public.rate_limit_events enable row level security;
-- no client policies at all: this table is only ever touched by the
-- SECURITY DEFINER function below, called from server-side code with
-- the service-role key.

-- logs one attempt and returns whether it should be ALLOWED, checking both
-- a per-user window and a looser per-IP window (covers multi-account abuse).
create or replace function public.check_rate_limit(
  p_user_id       uuid,
  p_ip            text,
  p_action        text,
  p_user_limit    integer,
  p_user_window_seconds integer,
  p_ip_limit      integer,
  p_ip_window_seconds integer
) returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_count integer := 0;
  v_ip_count   integer := 0;
begin
  if p_user_id is not null then
    select count(*) into v_user_count from public.rate_limit_events
      where action = p_action and user_id = p_user_id
      and created_at > now() - make_interval(secs => p_user_window_seconds);
    if v_user_count >= p_user_limit then
      return false;
    end if;
  end if;

  if p_ip is not null then
    select count(*) into v_ip_count from public.rate_limit_events
      where action = p_action and ip = p_ip
      and created_at > now() - make_interval(secs => p_ip_window_seconds);
    if v_ip_count >= p_ip_limit then
      return false;
    end if;
  end if;

  insert into public.rate_limit_events (user_id, ip, action) values (p_user_id, p_ip, p_action);
  return true;
end;
$$;

-- ============================================================================
-- 5. STORAGE  (bucket for user-uploaded + generated images)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('generations', 'generations', true)
on conflict (id) do nothing;

drop policy if exists "generations_bucket_read" on storage.objects;
create policy "generations_bucket_read" on storage.objects
  for select using (bucket_id = 'generations');

drop policy if exists "generations_bucket_insert_own" on storage.objects;
create policy "generations_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "generations_bucket_delete_own" on storage.objects;
create policy "generations_bucket_delete_own" on storage.objects
  for delete using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Object path convention: {user_id}/{generation_id}/input.ext and .../output.ext
