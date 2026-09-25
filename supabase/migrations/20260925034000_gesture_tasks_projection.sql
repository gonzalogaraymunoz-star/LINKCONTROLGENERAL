create table if not exists public.gesture_tasks (
  id uuid primary key default gen_random_uuid(),
  gesture_code text not null unique,
  parent_gesture_code text,
  source_domain text not null default 'control',
  entity_type text,
  global_id text,
  title text not null,
  note text,
  status text not null default 'open' check (status in ('open','done','snoozed','cancelled')),
  priority smallint not null default 2 check (priority between 1 and 3),
  due_at timestamptz,
  origin_event_type text,
  origin_event_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gesture_tasks_status_idx on public.gesture_tasks(status, due_at, created_at desc);
create index if not exists gesture_tasks_global_idx on public.gesture_tasks(global_id);
create index if not exists gesture_tasks_parent_idx on public.gesture_tasks(parent_gesture_code);

alter table public.gesture_tasks enable row level security;

comment on table public.gesture_tasks is
  'Proyección operacional simple de gestos para CONTROL CENTRAL. La trazabilidad vive en gesture_code/parent_gesture_code y cada cambio se devuelve a command_bus/event_bus.';
