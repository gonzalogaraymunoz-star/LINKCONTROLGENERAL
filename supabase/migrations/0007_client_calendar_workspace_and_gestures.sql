create table if not exists public.client_calendar_workspaces (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null,
  client_id uuid not null unique references public.clients(id) on delete cascade,
  provider text not null default 'google_calendar',
  google_calendar_id text,
  calendar_name text,
  timezone text not null default 'America/Santiago',
  status text not null default 'awaiting_connection' check (status in ('awaiting_connection','connected','error','disabled')),
  sync_mode text not null default 'two_way' check (sync_mode in ('two_way','read_only','write_only')),
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.client_gestures (
  id uuid primary key default gen_random_uuid(), control_id uuid not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  calendar_workspace_id uuid references public.client_calendar_workspaces(id) on delete set null,
  title text not null, description text, gesture_type text not null default 'task',
  status text not null default 'planned' check (status in ('planned','scheduled','completed','cancelled')),
  starts_at timestamptz, ends_at timestamptz, timezone text not null default 'America/Santiago', recurrence_rule text,
  google_event_id text,
  sync_status text not null default 'pending_calendar_connection' check (sync_status in ('pending_calendar_connection','pending_sync','synced','sync_error','local_only')),
  source text not null default 'control_central', priority smallint not null default 2 check (priority between 1 and 5),
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists client_gestures_client_starts_idx on public.client_gestures(client_id, starts_at);
create index if not exists client_gestures_status_idx on public.client_gestures(status, starts_at);
create index if not exists client_gestures_google_event_idx on public.client_gestures(google_event_id) where google_event_id is not null;
alter table public.client_calendar_workspaces enable row level security;
alter table public.client_gestures enable row level security;
create policy "service_role_calendar_workspaces" on public.client_calendar_workspaces for all to service_role using (true) with check (true);
create policy "service_role_client_gestures" on public.client_gestures for all to service_role using (true) with check (true);
create or replace view public.control_client_360_v2 as
select c.id,c.global_id,c.name,c.slug,c.status,c.accent,c.created_at,c.updated_at,base.integration_count,base.memory_count,base.last_activity_at,
ccw.status as calendar_status,ccw.google_calendar_id,ccw.calendar_name,ccw.last_synced_at,
(select count(*) from public.client_gestures g where g.client_id=c.id and g.status in ('planned','scheduled')) as open_gestures,
(select min(g.starts_at) from public.client_gestures g where g.client_id=c.id and g.status in ('planned','scheduled') and g.starts_at>=now()) as next_gesture_at
from public.clients c left join public.control_client_360 base on base.id=c.id left join public.client_calendar_workspaces ccw on ccw.client_id=c.id where c.archived_at is null;
