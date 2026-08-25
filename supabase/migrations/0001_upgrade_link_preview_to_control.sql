-- LINK CONTROL CENTRAL v0.2
-- ADDITIVE upgrade for the EXISTING Supabase project "LINK PREVIEW".
-- This migration preserves Preview Studio tables and data.
-- It does NOT create a second clients/projects/memory universe.
-- Existing public.clients, public.projects and public.agent_memories are evolved in place.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 0. Stable enums (created only when missing)
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.lc_actor_type as enum ('human','ai','system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lc_work_kind as enum ('action','task','gesture');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lc_stage_key as enum ('understand','organize','build','activate','support','scale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lc_memory_scope as enum ('local','candidate','central');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lc_health_state as enum ('ok','warning','error','offline');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lc_artifact_status as enum ('draft','review','approved','archived');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 1. Immutable control tree + identities
-- -----------------------------------------------------------------------------
create table if not exists public.controls (
  id uuid primary key default gen_random_uuid(),
  parent_control_id uuid references public.controls(id) on delete restrict,
  name text not null,
  slug text not null unique,
  scope text not null unique,
  is_root boolean not null default false,
  owner_label text not null default 'LINK CONTROL CENTRAL',
  chatgpt_connection_name text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists controls_single_root
  on public.controls (is_root) where is_root = true;

insert into public.controls (
  id, name, slug, scope, is_root, owner_label, chatgpt_connection_name, metadata
) values (
  '00000000-0000-0000-0000-000000000001',
  'LINK CONTROL CENTRAL',
  'link-control-central',
  'root',
  true,
  'LINK CONTROL CENTRAL',
  'Central MCP',
  jsonb_build_object(
    'supabase_role','central',
    'source_project','LINK PREVIEW',
    'architecture_version','0.2'
  )
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  scope = excluded.scope,
  is_root = true,
  owner_label = excluded.owner_label,
  chatgpt_connection_name = excluded.chatgpt_connection_name,
  metadata = public.controls.metadata || excluded.metadata,
  updated_at = now();

create table if not exists public.actors (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  actor_type public.lc_actor_type not null,
  display_name text not null,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.control_memberships (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  actor_id uuid not null references public.actors(id) on delete cascade,
  role text not null check (role in ('root_admin','business_admin','collaborator','client','agent','system')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(control_id, actor_id)
);

insert into public.actors (id, actor_type, display_name, metadata)
values (
  '00000000-0000-0000-0000-000000000010',
  'system',
  'LINK CONTROL CENTRAL',
  '{"identity":"system_root"}'::jsonb
)
on conflict (id) do nothing;

insert into public.control_memberships(control_id, actor_id, role, permissions)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'system',
  array['ROOT','READ','WRITE','AUDIT','MEMORY_REVIEW','GATEWAY']
)
on conflict (control_id, actor_id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Evolve existing LINK PREVIEW entities instead of replacing them
-- -----------------------------------------------------------------------------
alter table public.clients add column if not exists control_id uuid references public.controls(id) on delete restrict;
alter table public.clients add column if not exists short_code text;
alter table public.clients add column if not exists symbol text;
alter table public.clients add column if not exists accent text;
alter table public.clients add column if not exists archived_at timestamptz;
update public.clients
set control_id = '00000000-0000-0000-0000-000000000001'
where control_id is null;
alter table public.clients alter column control_id set not null;
create index if not exists clients_control_idx on public.clients(control_id, status);

alter table public.projects add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.projects
set control_id = coalesce(
  (select c.control_id from public.clients c where c.id = public.projects.client_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.projects alter column control_id set not null;
create index if not exists projects_control_idx on public.projects(control_id, status);

alter table public.agent_sessions add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.agent_sessions s
set control_id = coalesce(
  (select c.control_id from public.clients c where c.id = s.client_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.agent_sessions alter column control_id set not null;

alter table public.agent_messages add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.agent_messages m
set control_id = coalesce(
  (select s.control_id from public.agent_sessions s where s.id = m.session_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.agent_messages alter column control_id set not null;

-- agent_memories remains the canonical LOCAL/PROJECT memory table.
-- Central memory is a promoted state, not a second copy of all conversations.
alter table public.agent_memories add column if not exists control_id uuid references public.controls(id) on delete restrict;
alter table public.agent_memories add column if not exists scope public.lc_memory_scope not null default 'local';
alter table public.agent_memories add column if not exists evidence_refs jsonb not null default '[]'::jsonb;
alter table public.agent_memories add column if not exists confidence numeric(4,3);
alter table public.agent_memories add column if not exists status text not null default 'active';
alter table public.agent_memories add column if not exists promoted_at timestamptz;
alter table public.agent_memories add column if not exists approved_by_actor_id uuid references public.actors(id) on delete set null;
alter table public.agent_memories alter column client_id drop not null;
update public.agent_memories m
set control_id = coalesce(
  (select c.control_id from public.clients c where c.id = m.client_id),
  (select p.control_id from public.projects p where p.id = m.project_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.agent_memories alter column control_id set not null;
create index if not exists agent_memories_control_scope_idx on public.agent_memories(control_id, scope, importance desc);

alter table public.design_previews add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.design_previews d
set control_id = coalesce(
  (select c.control_id from public.clients c where c.id = d.client_id),
  (select p.control_id from public.projects p where p.id = d.project_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.design_previews alter column control_id set not null;

alter table public.previews add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.previews p
set control_id = coalesce(
  (select pr.control_id from public.projects pr where pr.id = p.project_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.previews alter column control_id set not null;

alter table public.assets add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.assets a
set control_id = coalesce(
  (select p.control_id from public.projects p where p.id = a.project_id),
  (select d.control_id from public.previews d where d.id = a.preview_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.assets alter column control_id set not null;

alter table public.requests add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.requests r
set control_id = coalesce(
  (select c.control_id from public.clients c where c.id = r.client_id),
  (select p.control_id from public.projects p where p.id = r.project_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.requests alter column control_id set not null;

alter table public.deliverables add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.deliverables d
set control_id = coalesce(
  (select p.control_id from public.projects p where p.id = d.project_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.deliverables alter column control_id set not null;

alter table public.activity_log add column if not exists control_id uuid references public.controls(id) on delete restrict;
update public.activity_log a
set control_id = coalesce(
  (select p.control_id from public.projects p where p.id = a.project_id),
  '00000000-0000-0000-0000-000000000001'
)
where control_id is null;
alter table public.activity_log alter column control_id set not null;

-- -----------------------------------------------------------------------------
-- 3. CRM execution model: Need → Product → 6 stages → Action/Task/Gesture
-- -----------------------------------------------------------------------------
create table if not exists public.needs (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  name text not null,
  description text,
  product_type text,
  base_price numeric(14,2),
  currency text default 'CLP',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_cycles (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  need_id uuid references public.needs(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  stage public.lc_stage_key not null default 'understand',
  progress smallint not null default 0 check (progress between 0 and 100),
  objective text,
  next_milestone text,
  exit_criteria jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  cycle_id uuid references public.client_cycles(id) on delete cascade,
  stage public.lc_stage_key,
  kind public.lc_work_kind not null,
  title text not null,
  description text,
  owner_actor_id uuid references public.actors(id) on delete set null,
  due_at timestamptz,
  priority smallint not null default 2 check (priority between 1 and 4),
  status text not null default 'pending' check (status in ('pending','doing','blocked','done','cancelled')),
  source text not null default 'manual',
  source_ref text,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists work_items_control_due_idx on public.work_items(control_id, status, due_at);

-- -----------------------------------------------------------------------------
-- 4. Explorer + artifacts. Existing Preview Studio output remains valid.
-- -----------------------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  folder_type text not null default 'general',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists folders_parent_idx on public.folders(control_id, parent_id, sort_order);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  cycle_id uuid references public.client_cycles(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  work_item_id uuid references public.work_items(id) on delete set null,
  design_id uuid references public.design_previews(id) on delete set null,
  deliverable_id uuid references public.deliverables(id) on delete set null,
  artifact_type text not null,
  name text not null,
  version text not null default 'v1',
  status public.lc_artifact_status not null default 'draft',
  source_tool text,
  storage_provider text,
  storage_ref text,
  public_url text,
  preview_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_actor_id uuid references public.actors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists artifacts_control_client_idx on public.artifacts(control_id, client_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Derived intelligence. Facts are never replaced by interpretation.
-- -----------------------------------------------------------------------------
create table if not exists public.intelligence (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  observation text not null,
  recommendation text,
  evidence_refs jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  scope public.lc_memory_scope not null default 'local',
  status text not null default 'draft' check (status in ('draft','candidate','approved','rejected','superseded')),
  proposed_by_actor_id uuid references public.actors(id) on delete set null,
  approved_by_actor_id uuid references public.actors(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- -----------------------------------------------------------------------------
-- 6. Gateway registry + Event Bus
-- -----------------------------------------------------------------------------
create table if not exists public.gateways (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  adapter_type text not null,
  description text,
  health public.lc_health_state not null default 'offline',
  immutable_core boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.control_gateways (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  gateway_id uuid not null references public.gateways(id) on delete cascade,
  enabled boolean not null default true,
  permissions text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  last_health_at timestamptz,
  unique(control_id, gateway_id)
);

create table if not exists public.stage_transitions (
  id uuid primary key default gen_random_uuid(),
  control_id uuid not null references public.controls(id) on delete cascade,
  cycle_id uuid not null references public.client_cycles(id) on delete cascade,
  from_stage public.lc_stage_key,
  to_stage public.lc_stage_key not null,
  criteria_snapshot jsonb not null default '{}'::jsonb,
  approved_by_actor_id uuid references public.actors(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
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
create index if not exists events_control_time_idx on public.events(control_id, occurred_at desc);

insert into public.gateways (key, name, adapter_type, description, health, metadata)
values
('chatgpt','ChatGPT / MCP','mcp','Interfaz conversacional y herramientas por scope','ok','{"tier":"central"}'),
('supabase-central','Supabase · LINK PREVIEW','database','Memoria transversal, CRM, artifacts, controls y Event Bus','ok','{"project_role":"central","free_project":true}'),
('supabase-operational','Supabase · Operación','database','Hotel Experience, turismo, reservas, proveedores, finanzas y políticas','ok','{"project_role":"operational","free_project":true}'),
('github','GitHub','code','Código y versionado técnico','ok','{}'),
('vercel','Vercel','deployment','Preview, producción y estado','ok','{}'),
('google-workspace','Google Workspace','workspace','Calendar, Drive, Gmail y documentos','offline','{}'),
('cloudinary','Cloudinary','media','Imágenes, video y artifacts visuales','offline','{}'),
('partner','Partner / Alianza','adapter','Adaptador neutro para apps y alianzas futuras','offline','{}')
on conflict (key) do update set
  name = excluded.name,
  adapter_type = excluded.adapter_type,
  description = excluded.description,
  metadata = public.gateways.metadata || excluded.metadata,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 7. Control factory. New businesses are rows/scopes, NOT new Supabase projects.
-- -----------------------------------------------------------------------------
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
  if root_id is null then raise exception 'Root control does not exist'; end if;

  insert into public.controls(parent_control_id, name, slug, scope, is_root, owner_label, chatgpt_connection_name)
  values(root_id, p_name, p_slug, p_scope, false, 'LINK CONTROL CENTRAL', p_name || ' MCP')
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.create_child_control(text, text, text) from public;
revoke all on function public.create_child_control(text, text, text) from anon;
revoke all on function public.create_child_control(text, text, text) from authenticated;
grant execute on function public.create_child_control(text, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 8. Root immutability + access helper for NEW tables.
-- Existing Preview Studio RLS is intentionally NOT replaced in this migration.
-- Run 0002_harden_existing_rls.sql only after authenticated root membership exists.
-- -----------------------------------------------------------------------------
create or replace function public.protect_root_control()
returns trigger language plpgsql as $$
begin
  if old.is_root = true and current_user <> 'postgres' then
    raise exception 'LINK CONTROL CENTRAL root is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists controls_protect_root_update on public.controls;
create trigger controls_protect_root_update
before update or delete on public.controls
for each row execute function public.protect_root_control();

create or replace function public.has_control_access(target_control uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.actors a
    join public.control_memberships m on m.actor_id = a.id
    join public.controls member_control on member_control.id = m.control_id
    where a.auth_user_id = auth.uid()
      and (
        m.control_id = target_control
        or (m.role = 'root_admin' and member_control.is_root = true)
      )
  );
$$;

alter table public.controls enable row level security;
alter table public.actors enable row level security;
alter table public.control_memberships enable row level security;
alter table public.needs enable row level security;
alter table public.products enable row level security;
alter table public.client_cycles enable row level security;
alter table public.work_items enable row level security;
alter table public.folders enable row level security;
alter table public.artifacts enable row level security;
alter table public.intelligence enable row level security;
alter table public.gateways enable row level security;
alter table public.control_gateways enable row level security;
alter table public.stage_transitions enable row level security;
alter table public.events enable row level security;

-- Policies are created only when missing, preserving idempotency.
do $$ begin
  create policy lc_controls_select on public.controls for select using (public.has_control_access(id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_actors_self_or_membership on public.actors for select using (auth_user_id = auth.uid() or exists (select 1 from public.control_memberships m where m.actor_id = actors.id and public.has_control_access(m.control_id)));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_memberships_select on public.control_memberships for select using (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_needs_access on public.needs for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_products_access on public.products for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_cycles_access on public.client_cycles for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_work_access on public.work_items for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_folders_access on public.folders for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_artifacts_access on public.artifacts for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_intelligence_access on public.intelligence for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_gateways_select on public.gateways for select using (
    exists (
      select 1 from public.actors a
      join public.control_memberships m on m.actor_id = a.id
      where a.auth_user_id = auth.uid()
    )
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_control_gateways_access on public.control_gateways for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_transitions_access on public.stage_transitions for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy lc_events_select on public.events for select using (public.has_control_access(control_id));
exception when duplicate_object then null; end $$;

comment on table public.agent_memories is 'Canonical LINK local/project memory. Local by default. Candidate/central promotion requires Central review; raw conversations are not automatically promoted.';
comment on table public.intelligence is 'Derived observations and recommendations with provenance. Never replaces source facts.';
comment on table public.events is 'Append-oriented Event Bus for audit and cross-component reactions.';
comment on table public.controls is 'Tenant/control tree. New businesses and clients use scopes here instead of creating new Supabase projects.';
