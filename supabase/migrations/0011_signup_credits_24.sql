-- New accounts start with 24 credits instead of 20.
--
-- 24 covers one run of every tool, including Product Studio, which is being
-- repriced upward because each run makes four image generations at fal.ai.
-- Existing accounts are not changed.
--
-- Keep in step with SIGNUP_CREDITS in src/lib/plans.ts; this trigger cannot read it.
-- The body is otherwise identical to the definition in 0001_init.sql, which
-- matched the live project when this was written.

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
    24 -- free signup credits; see SIGNUP_CREDITS in src/lib/plans.ts
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
