alter table public.client_gestures alter column client_id drop not null;

alter table public.client_gestures
  add column if not exists scope text not null default 'client',
  add column if not exists planned_minutes integer not null default 30,
  add column if not exists actual_started_at timestamptz,
  add column if not exists actual_completed_at timestamptz,
  add column if not exists accumulated_seconds bigint not null default 0,
  add column if not exists outcome text,
  add column if not exists is_money boolean not null default false,
  add column if not exists sort_order integer not null default 0;

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null,
  gesture_id uuid not null references public.client_gestures(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  elapsed_seconds integer not null default 0,
  planned_minutes integer not null default 30,
  status text not null default 'running',
  note text,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_running_session_per_gesture
  on public.work_sessions(gesture_id) where status='running';
create index if not exists work_sessions_started_idx on public.work_sessions(started_at desc);
create index if not exists work_sessions_gesture_idx on public.work_sessions(gesture_id, started_at desc);

create table if not exists public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null,
  progress_date date not null,
  timezone text not null default 'America/Santiago',
  focused_seconds bigint not null default 0,
  tasks_completed integer not null default 0,
  commercial_moves integer not null default 0,
  closures integer not null default 0,
  body_minimum boolean not null default false,
  mind_minimum boolean not null default false,
  pocket_minimum boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(control_id, progress_date)
);

create table if not exists public.work_alerts (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null,
  gesture_id uuid references public.client_gestures(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium',
  message text not null,
  status text not null default 'open',
  due_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists work_alerts_open_idx on public.work_alerts(status, severity, created_at desc);

create or replace view public.work_attention_v
with (security_invoker = true) as
select
  g.id,
  g.client_id,
  c.name as client_name,
  g.title,
  g.status,
  g.priority,
  g.starts_at,
  g.ends_at,
  g.actual_started_at,
  g.actual_completed_at,
  g.planned_minutes,
  g.accumulated_seconds,
  case
    when g.status in ('completed','cancelled') then 'closed'
    when g.ends_at is not null and g.ends_at < now() then 'overdue'
    when g.starts_at is not null and g.starts_at::date = (now() at time zone 'America/Santiago')::date then 'today'
    when g.starts_at is not null and g.starts_at < now() + interval '24 hours' then 'soon'
    else 'upcoming'
  end as attention_state
from public.client_gestures g
left join public.clients c on c.id=g.client_id
where g.status <> 'cancelled';
