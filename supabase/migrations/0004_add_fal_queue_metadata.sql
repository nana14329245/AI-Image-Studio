alter table public.generations
  add column if not exists fal_endpoint text,
  add column if not exists fal_request_id text,
  add column if not exists finalizing_started_at timestamptz,
  add column if not exists generation_metadata jsonb not null default '{}'::jsonb;

alter table public.generations
  drop constraint if exists generations_status_check;

alter table public.generations
  add constraint generations_status_check
  check (status in ('processing', 'finalizing', 'completed', 'failed'));

create index if not exists generations_fal_request_idx
  on public.generations (fal_request_id)
  where fal_request_id is not null;
