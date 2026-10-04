-- LINKDOT OS v1
-- Canonical workspace model for LINKDOTs, including multi-DOT access grants.
-- This migration is idempotent because parts of the DOT workspace model were
-- first introduced directly in the live Control Central database.

create table if not exists public.link_dot_workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null unique,
  app_key text not null,
  name text not null,
  description text,
  owner_linkdot_slug text not null,
  owner_director_slug text,
  route text,
  status text not null default 'active'
    check (status in ('active','paused','draft','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.link_dot_workspace_subdots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.link_dot_workspaces(id) on delete cascade,
  subdot_slug text not null,
  name text not null,
  responsibility text not null,
  sort_order integer not null default 100,
  status text not null default 'active'
    check (status in ('active','paused','draft','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, subdot_slug)
);

create table if not exists public.link_dot_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.link_dot_workspaces(id) on delete cascade,
  subdot_id uuid not null references public.link_dot_workspace_subdots(id) on delete restrict,
  business_id uuid references public.link_world_businesses(id) on delete set null,
  artifact_key text not null,
  name text not null,
  description text,
  artifact_type text not null default 'workspace',
  work_definition text not null,
  route text,
  source_system text,
  source_table text,
  source_ref text,
  status text not null default 'active'
    check (status in ('active','attention','building','paused','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, artifact_key)
);

create table if not exists public.link_dot_workspace_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.link_dot_workspaces(id) on delete cascade,
  dot_slug text not null,
  director_slug text,
  access_level text not null default 'work'
    check (access_level in ('read','work','manage')),
  is_default boolean not null default false,
  status text not null default 'active'
    check (status in ('active','paused','revoked')),
  permissions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, dot_slug)
);

create index if not exists link_dot_workspace_access_dot_idx
  on public.link_dot_workspace_access (dot_slug, status);

create index if not exists link_dot_workspace_access_workspace_idx
  on public.link_dot_workspace_access (workspace_id, status);

create unique index if not exists link_dot_workspace_access_one_default_idx
  on public.link_dot_workspace_access (dot_slug)
  where is_default = true and status = 'active';

alter table public.link_dot_workspaces enable row level security;
alter table public.link_dot_workspace_subdots enable row level security;
alter table public.link_dot_artifacts enable row level security;
alter table public.link_dot_workspace_access enable row level security;

drop policy if exists "link members manage dot workspaces" on public.link_dot_workspaces;
create policy "link members manage dot workspaces"
  on public.link_dot_workspaces for all to authenticated
  using ((select public.link_world_is_member()))
  with check ((select public.link_world_is_member()));

drop policy if exists "link members manage dot workspace subdots" on public.link_dot_workspace_subdots;
create policy "link members manage dot workspace subdots"
  on public.link_dot_workspace_subdots for all to authenticated
  using ((select public.link_world_is_member()))
  with check ((select public.link_world_is_member()));

drop policy if exists "link members manage dot artifacts" on public.link_dot_artifacts;
create policy "link members manage dot artifacts"
  on public.link_dot_artifacts for all to authenticated
  using ((select public.link_world_is_member()))
  with check ((select public.link_world_is_member()));

drop policy if exists "link members manage dot workspace access" on public.link_dot_workspace_access;
create policy "link members manage dot workspace access"
  on public.link_dot_workspace_access for all to authenticated
  using ((select public.link_world_is_member()))
  with check ((select public.link_world_is_member()));

-- Normalize the six current stage directors as the six operational LINKDOTs
-- without changing their technical slugs or runtime routes.
update public.link_skills
set metadata = coalesce(metadata, '{}'::jsonb) || case slug
  when 'director-ventas' then jsonb_build_object(
    'agent_kind','linkdot','dot_slug','linkdot-ventas','dot_area','ventas',
    'display_label','LINKDOT · Ventas',
    'responsibility','Custodiar la captación e identificación del prospecto, mantener la integridad del dato comercial y entregar a Cierre cuando existe un prospecto válido.',
    'dot_architecture_version','1.0'
  )
  when 'director-cierre' then jsonb_build_object(
    'agent_kind','linkdot','dot_slug','linkdot-cierre','dot_area','cierre',
    'display_label','LINKDOT · Cierre',
    'responsibility','Custodiar la conversión del prospecto calificado a comprador, resolviendo objeciones, seguimiento y pago con evidencia verificable.',
    'dot_architecture_version','1.0'
  )
  when 'director-onboarding' then jsonb_build_object(
    'agent_kind','linkdot','dot_slug','linkdot-onboarding','dot_area','onboarding',
    'display_label','LINKDOT · Onboarding',
    'responsibility','Custodiar la transición posterior al pago hasta que el cliente quede activado y alcance su primer punto de valor.',
    'dot_architecture_version','1.0'
  )
  when 'director-entrega' then jsonb_build_object(
    'agent_kind','linkdot','dot_slug','linkdot-entrega','dot_area','entrega',
    'display_label','LINKDOT · Entrega',
    'responsibility','Custodiar la ejecución consistente, puntual y verificable del producto o servicio vendido hasta el cumplimiento de la promesa.',
    'dot_architecture_version','1.0'
  )
  when 'director-postventa' then jsonb_build_object(
    'agent_kind','linkdot','dot_slug','linkdot-postventa','dot_area','postventa',
    'display_label','LINKDOT · Postventa',
    'responsibility','Custodiar retención, recompra, expansión de valor, referidos y reputación después de la entrega.',
    'dot_architecture_version','1.0'
  )
  else '{}'::jsonb
end,
name = case slug
  when 'director-ventas' then 'LINKDOT · Ventas'
  when 'director-cierre' then 'LINKDOT · Cierre'
  when 'director-onboarding' then 'LINKDOT · Onboarding'
  when 'director-entrega' then 'LINKDOT · Entrega'
  when 'director-postventa' then 'LINKDOT · Postventa'
  else name
end,
updated_at = now()
where slug in (
  'director-ventas','director-cierre','director-onboarding',
  'director-entrega','director-postventa'
);

-- Base homes only. Operational artifacts are registered only when they exist.
insert into public.link_dot_workspaces
  (workspace_key, owner_linkdot_slug, owner_director_slug, app_key, name, description, route, status, metadata)
values
  ('linkdot-cierre-home','linkdot-cierre','director-cierre','linkcontrolgeneral',
   'LINKDOT CIERRE · Mesa de Conversión',
   'Espacio base de Cierre para organizar seguimiento, objeciones, cotización, pago y evidencia de conversión sin inventar una operación paralela.',
   '/dots/linkdot-cierre','active','{"architecture":"LINKDOT","version":"1.0","workspace_role":"home"}'::jsonb),
  ('linkdot-onboarding-home','linkdot-onboarding','director-onboarding','linkcontrolgeneral',
   'LINKDOT ONBOARDING · Activación',
   'Espacio base de Onboarding para organizar la transición posterior al pago, instrucciones, accesos y primer punto de valor.',
   '/dots/linkdot-onboarding','active','{"architecture":"LINKDOT","version":"1.0","workspace_role":"home"}'::jsonb),
  ('linkdot-entrega-home','linkdot-entrega','director-entrega','linkcontrolgeneral',
   'LINKDOT ENTREGA · Cumplimiento',
   'Espacio base de Entrega para organizar la ejecución del servicio o producto, hitos, incidencias y evidencia de cumplimiento.',
   '/dots/linkdot-entrega','active','{"architecture":"LINKDOT","version":"1.0","workspace_role":"home"}'::jsonb),
  ('linkdot-postventa-home','linkdot-postventa','director-postventa','linkcontrolgeneral',
   'LINKDOT POSTVENTA · Retención',
   'Espacio base de Postventa para organizar satisfacción, recompra, referidos, reseñas y expansión de valor después de la entrega.',
   '/dots/linkdot-postventa','active','{"architecture":"LINKDOT","version":"1.0","workspace_role":"home"}'::jsonb),
  ('link-director-control-central','link-director','link-director','linkcontrolgeneral',
   'LINK DIRECTOR · Control Central',
   'Espacio de dirección para observar el organismo, distribuir responsabilidad, revisar evidencia y coordinar los LINKDOT.',
   '/','active','{"architecture":"LINK_DIRECTOR","version":"1.0","workspace_role":"control"}'::jsonb)
on conflict (workspace_key) do update
set owner_linkdot_slug = excluded.owner_linkdot_slug,
    owner_director_slug = excluded.owner_director_slug,
    app_key = excluded.app_key,
    name = excluded.name,
    description = excluded.description,
    route = excluded.route,
    status = excluded.status,
    metadata = public.link_dot_workspaces.metadata || excluded.metadata,
    updated_at = now();

-- Every owned workspace becomes a managed access grant. Existing MAR and Ventas
-- workspaces are included without needing generated IDs in this migration.
insert into public.link_dot_workspace_access
  (workspace_id, dot_slug, director_slug, access_level, is_default, status, metadata)
select
  w.id,
  w.owner_linkdot_slug,
  w.owner_director_slug,
  'manage',
  case
    when not exists (
      select 1
      from public.link_dot_workspace_access existing
      where existing.dot_slug = w.owner_linkdot_slug
        and existing.is_default = true
        and existing.status = 'active'
        and existing.workspace_id <> w.id
    )
    then true
    else false
  end,
  'active',
  jsonb_build_object('source','linkdot_os_v1_owner_grant')
from public.link_dot_workspaces w
where w.owner_linkdot_slug is not null
on conflict (workspace_id, dot_slug) do update
set director_slug = excluded.director_slug,
    access_level = 'manage',
    status = 'active',
    updated_at = now();
