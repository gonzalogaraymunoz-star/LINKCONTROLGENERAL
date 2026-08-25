create table if not exists public.service_plans (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  name text not null,
  description text,
  billing_model text not null default 'custom' check (billing_model in ('one_time','monthly','recurring','custom')),
  currency text not null default 'CLP',
  base_price numeric(14,2),
  status text not null default 'active' check (status in ('active','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(control_id,name)
);

create table if not exists public.client_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id uuid references public.service_plans(id) on delete set null,
  plan_name_snapshot text not null,
  agreed_price numeric(14,2),
  currency text not null default 'CLP',
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  objectives jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_strategies (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  cycle_id uuid references public.client_cycles(id) on delete cascade,
  plan_assignment_id uuid references public.client_plan_assignments(id) on delete set null,
  title text not null,
  objective text,
  diagnosis text,
  approach text,
  success_metrics jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','completed','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_active_strategy_per_cycle on public.client_strategies(cycle_id) where status='active' and cycle_id is not null;
alter table public.work_items add column if not exists strategy_id uuid references public.client_strategies(id) on delete set null;
create index if not exists idx_client_plan_assignments_client on public.client_plan_assignments(client_id,status);
create index if not exists idx_client_strategies_client on public.client_strategies(client_id,status);
create index if not exists idx_client_strategies_cycle on public.client_strategies(cycle_id);
create index if not exists idx_work_items_strategy on public.work_items(strategy_id);
