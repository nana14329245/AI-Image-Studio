-- Record every Stripe subscription status, and whether a subscription is set to end.
--
-- The check constraint only allowed none, active, trialing, past_due, canceled
-- and incomplete. Stripe also sends unpaid, incomplete_expired and paused; an
-- update carrying one of those violated the constraint, the webhook ignored the
-- error and answered 200, so Stripe never retried and the profile silently kept
-- its old plan and status.
--
-- cancel_at_period_end lets the account page say that a subscription stops on a
-- given date instead of showing it as simply active until the day it ends.
-- It is written only by the webhook through the service role; the column-level
-- update grant from 0008 does not include it.

alter table public.profiles drop constraint if exists profiles_subscription_status_check;
alter table public.profiles add constraint profiles_subscription_status_check
  check (subscription_status in (
    'none', 'active', 'trialing', 'past_due', 'canceled',
    'incomplete', 'incomplete_expired', 'unpaid', 'paused'
  ));

alter table public.profiles
  add column if not exists cancel_at_period_end boolean not null default false;
