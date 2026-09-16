-- Rate-limit events hold IP addresses and were never deleted.
--
-- The limits look back at most a few minutes, so nothing needs these rows after
-- a day. Keeping IPs longer than their purpose needs goes against the PDPA's
-- storage limitation, and the privacy policy states a one-day retention.

create index if not exists rate_limit_events_created_at_idx
  on public.rate_limit_events (created_at);

-- Same function as 0001, plus the cleanup. CREATE OR REPLACE keeps the existing
-- grants: callable by service_role only.
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
  -- Uses the created_at index; normally removes the handful of rows that aged
  -- out since the previous call.
  delete from public.rate_limit_events where created_at < now() - interval '1 day';

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

delete from public.rate_limit_events where created_at < now() - interval '1 day';
