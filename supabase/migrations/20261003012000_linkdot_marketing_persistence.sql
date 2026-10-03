-- LINKDOT MAR persistence layer
create table if not exists public.link_marketing_briefs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.link_world_businesses(id) on delete cascade,
  plan_id uuid references public.link_rrss_operation_plans(id) on delete set null,
  product_id uuid references public.link_world_products(id) on delete set null,
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  audience text,
  benefit text,
  hook text,
  offer text,
  capture_rule text,
  primary_channel text,
  target_leads integer check (target_leads is null or target_leads >= 0),
  budget_clp integer check (budget_clp is null or budget_clp >= 0),
  source text not null default 'linkdot-marketing',
  created_by_agent text references public.link_skills(slug) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists link_marketing_briefs_identity_uidx
on public.link_marketing_briefs (
  business_id,
  name,
  coalesce(plan_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index if not exists link_marketing_briefs_business_status_idx
on public.link_marketing_briefs (business_id,status,updated_at desc);

alter table public.link_marketing_briefs enable row level security;

create table if not exists public.link_marketing_learnings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.link_world_businesses(id) on delete cascade,
  brief_id uuid references public.link_marketing_briefs(id) on delete set null,
  observed_at timestamptz not null default now(),
  signal_type text not null,
  finding text not null,
  decision text,
  metrics jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  source_ref text,
  created_by_agent text references public.link_skills(slug) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists link_marketing_learnings_business_observed_idx
on public.link_marketing_learnings (business_id,observed_at desc);

alter table public.link_marketing_learnings enable row level security;
