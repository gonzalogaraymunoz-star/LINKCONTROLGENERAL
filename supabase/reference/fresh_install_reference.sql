-- LINK CONTROL CENTRAL — Core schema v1
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

create type public.actor_type as enum ('human','ai','system');
create type public.work_kind as enum ('action','task','gesture');
create type public.stage_key as enum ('understand','organize','build','activate','support','scale');
create type public.memory_scope as enum ('local','candidate','central');
create type public.health_state as enum ('ok','warning','error','offline');
create type public.artifact_status as enum ('draft','review','approved','archived');

create table public.controls (
  id uuid primary key default gen_random_uuid(),
  parent_control_id uuid references public.controls(id) on delete restrict,
  name text not null,
  slug text not null unique,
  scope text not null unique,
  is_root boolean not null default false,
  owner_label text not null default 'LINK CONTROL CENTRAL',
  chatgpt_connection_name text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create unique index controls_single_root on public.controls (is_root) where is_root = true;

create table public.actors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  actor_type public.actor_type not null,
  display_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table public.control_memberships (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  actor_id uuid not null references public.actors(id) on delete cascade,
  role text not null check (role in ('root_admin','business_admin','collaborator','client','agent','system')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(control_id, actor_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  name text not null,
  short_code text,
  symbol text,
  accent text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  name text not null,
  description text,
  product_type text,
  base_price numeric(14,2),
  currency text default 'CLP',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.client_cycles (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  need_id uuid references public.needs(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  stage public.stage_key not null default 'understand',
  progress smallint not null default 0 check (progress between 0 and 100),
  objective text,
  next_milestone text,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.work_items (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  cycle_id uuid references public.client_cycles(id) on delete cascade,
  stage public.stage_key,
  kind public.work_kind not null,
  title text not null,
  description text,
  owner_actor_id uuid references public.actors(id) on delete set null,
  due_at timestamptz,
  priority smallint not null default 2 check (priority between 1 and 4),
  status text not null default 'pending' check (status in ('pending','doing','blocked','done','cancelled')),
  source text not null default 'manual',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  folder_type text not null default 'general',
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index folders_parent_idx on public.folders(control_id, parent_id);

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  cycle_id uuid references public.client_cycles(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  work_item_id uuid references public.work_items(id) on delete set null,
  artifact_type text not null,
  name text not null,
  version text not null default 'v1',
  status public.artifact_status not null default 'draft',
  source_tool text,
  storage_provider text,
  storage_ref text,
  public_url text,
  preview_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_actor_id uuid references public.actors(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  cycle_id uuid references public.client_cycles(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  scope public.memory_scope not null default 'local',
  memory_type text not null check (memory_type in ('fact','preference','decision','protocol','pattern','architecture','evolution','summary')),
  title text not null,
  content text not null,
  source_type text not null,
  source_ref text,
  evidence_refs jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'active',
  created_by_actor_id uuid references public.actors(id) on delete set null,
  created_at timestamptz not null default now(),
  promoted_at timestamptz
);

create index memories_search_idx on public.memories using gin (to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(content,'')));

create table public.intelligence (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  observation text not null,
  recommendation text,
  evidence_refs jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  scope public.memory_scope not null default 'local',
  status text not null default 'draft' check (status in ('draft','candidate','approved','rejected','superseded')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table public.gateways (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  adapter_type text not null,
  description text,
  health public.health_state not null default 'offline',
  immutable_core boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.control_gateways (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  gateway_id uuid not null references public.gateways(id) on delete cascade,
  enabled boolean not null default true,
  permissions text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  last_health_at timestamptz,
  unique(control_id, gateway_id)
);

create table public.stage_transitions (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  cycle_id uuid not null references public.client_cycles(id) on delete cascade,
  from_stage public.stage_key,
  to_stage public.stage_key not null,
  criteria_snapshot jsonb not null default '{}'::jsonb,
  approved_by_actor_id uuid references public.actors(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.actors(id) on delete set null,
  object_type text not null,
  object_id text not null,
  payload jsonb not null default '{}'::jsonb,
  result text,
  occurred_at timestamptz not null default now()
);

create index events_control_time_idx on public.events(control_id, occurred_at desc);


-- Controlled factory for child Controls. The application should call this instead of inserting ad-hoc.
create or replace function public.create_child_control(
  p_name text,
  p_slug text,
  p_scope text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  root_id uuid;
  new_id uuid;
begin
  select id into root_id from public.controls where is_root = true limit 1;
  if root_id is null then
    raise exception 'Root control does not exist';
  end if;

  insert into public.controls(parent_control_id, name, slug, scope, is_root, owner_label, chatgpt_connection_name)
  values(root_id, p_name, p_slug, p_scope, false, 'LINK CONTROL CENTRAL', p_name || ' MCP')
  returning id into new_id;

  return new_id;
end;
$$;

-- The root control cannot be modified or deleted through normal application roles.
create or replace function public.protect_root_control()
returns trigger language plpgsql as $$
begin
  if old.is_root = true and current_user <> 'postgres' then
    raise exception 'LINK CONTROL CENTRAL root is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger controls_protect_root_update
before update or delete on public.controls
for each row execute function public.protect_root_control();

-- Access helper. A user sees only controls where their authenticated actor has membership.
create or replace function public.has_control_access(target_control uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.actors a
    join public.control_memberships m on m.actor_id = a.id
    where a.auth_user_id = auth.uid()
      and m.control_id = target_control
  );
$$;

alter table public.controls enable row level security;
alter table public.clients enable row level security;
alter table public.needs enable row level security;
alter table public.products enable row level security;
alter table public.client_cycles enable row level security;
alter table public.work_items enable row level security;
alter table public.folders enable row level security;
alter table public.artifacts enable row level security;
alter table public.memories enable row level security;
alter table public.intelligence enable row level security;
alter table public.control_gateways enable row level security;
alter table public.stage_transitions enable row level security;
alter table public.events enable row level security;

create policy controls_select_members on public.controls for select using (public.has_control_access(id));
create policy clients_control_access on public.clients for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy needs_control_access on public.needs for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy products_control_access on public.products for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy cycles_control_access on public.client_cycles for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy work_control_access on public.work_items for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy folders_control_access on public.folders for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy artifacts_control_access on public.artifacts for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy memories_control_access on public.memories for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy intelligence_control_access on public.intelligence for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy control_gateways_access on public.control_gateways for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy transitions_control_access on public.stage_transitions for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy events_control_access on public.events for select using (public.has_control_access(control_id));

comment on table public.memories is 'Context with provenance. Local by default; apps may propose candidates but cannot directly promote themselves to central memory.';
comment on table public.intelligence is 'Derived observations/recommendations. Never replaces source facts.';
comment on table public.events is 'Append-oriented event log for auditing and cross-component reactions.';
