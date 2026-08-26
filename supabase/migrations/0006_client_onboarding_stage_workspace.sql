create table if not exists public.client_onboarding_stages (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  stage_key text not null,
  stage_order integer not null check (stage_order between 1 and 20),
  title text not null,
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','done')),
  checklist jsonb not null default '[]'::jsonb,
  fields jsonb not null default '{}'::jsonb,
  links jsonb not null default '[]'::jsonb,
  folders jsonb not null default '[]'::jsonb,
  observations text,
  exit_criteria text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, stage_key)
);
create index if not exists client_onboarding_stages_client_idx on public.client_onboarding_stages(client_id, stage_order);
alter table public.client_onboarding_stages enable row level security;
comment on table public.client_onboarding_stages is 'Workspace persistente por cliente y etapa para el instalador de Centros de Control.';
