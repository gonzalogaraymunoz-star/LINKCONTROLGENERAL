-- LINK CONTROL CENTRAL V5: deep memory + action/event contracts + Twenty bridge
create schema if not exists private;

create or replace function private.lc_is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_members
    where user_id = auth.uid() and status = 'active'
  );
$$;
revoke all on function private.lc_is_active_member() from public;
grant usage on schema private to authenticated;
grant execute on function private.lc_is_active_member() to authenticated;

alter table public.clients add column if not exists global_id text;
update public.clients
set global_id = 'CC-CLIENT-' || upper(substr(replace(id::text, '-', ''), 1, 12))
where global_id is null;
create unique index if not exists clients_global_id_uidx on public.clients(global_id);

create table if not exists public.memory_namespaces (
  id uuid primary key default gen_random_uuid(), control_id uuid null references public.controls(id) on delete set null,
  scope_type text not null, scope_key text not null, label text null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(scope_type, scope_key)
);
create table if not exists public.deep_memories (
  id uuid primary key default gen_random_uuid(), namespace_id uuid not null references public.memory_namespaces(id) on delete cascade,
  memory_key text not null, kind text not null default 'fact', content text not null, structured_data jsonb not null default '{}'::jsonb,
  importance smallint not null default 3 check (importance between 1 and 5), confidence numeric(4,3) null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  source text not null default 'control-central', source_ref text null, supersedes_id uuid null references public.deep_memories(id) on delete set null,
  valid_from timestamptz null, valid_until timestamptz null, embedding vector null,
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(memory_key,'') || ' ' || coalesce(content,''))) stored,
  metadata jsonb not null default '{}'::jsonb, archived_at timestamptz null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists deep_memories_namespace_idx on public.deep_memories(namespace_id, updated_at desc);
create index if not exists deep_memories_search_idx on public.deep_memories using gin(search_vector);
create unique index if not exists deep_memories_active_key_uidx on public.deep_memories(namespace_id, memory_key) where archived_at is null;
create table if not exists public.memory_links (
  id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.deep_memories(id) on delete cascade,
  entity_type text not null, entity_key text not null, relation text not null default 'about', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), unique(memory_id, entity_type, entity_key, relation)
);
create index if not exists memory_links_entity_idx on public.memory_links(entity_type, entity_key);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(), provider text not null, connection_key text not null default 'primary', mode text not null default 'operational',
  status text not null default 'active' check (status in ('active','warning','error','disabled')), webhook_token_hash text null,
  last_seen_at timestamptz null, last_error text null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider, connection_key)
);
create table if not exists public.integration_bindings (
  id uuid primary key default gen_random_uuid(), control_id uuid null references public.controls(id) on delete set null,
  provider text not null, global_id text not null, entity_type text not null, external_object text not null, external_id text not null,
  source_app text null, sync_status text not null default 'connected' check (sync_status in ('connected','pending','warning','error','disconnected')),
  last_synced_at timestamptz null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(provider, external_object, external_id), unique(provider, global_id, external_object)
);
create index if not exists integration_bindings_global_idx on public.integration_bindings(global_id, provider);

create table if not exists public.command_bus (
  id uuid primary key default gen_random_uuid(), control_id uuid null references public.controls(id) on delete set null,
  command_type text not null, action_key text not null, actor text not null default 'link-control', target_provider text null,
  entity_type text null, global_id text null, payload jsonb not null default '{}'::jsonb, idempotency_key text not null,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','cancelled')), attempts integer not null default 0,
  result jsonb not null default '{}'::jsonb, error text null, requested_at timestamptz not null default now(), processed_at timestamptz null, unique(idempotency_key)
);
create index if not exists command_bus_status_idx on public.command_bus(status, requested_at);
create table if not exists public.event_bus (
  id uuid primary key default gen_random_uuid(), control_id uuid null references public.controls(id) on delete set null,
  source_provider text not null, event_type text not null, entity_type text null, global_id text null, external_id text null,
  correlation_id text null, dedupe_key text not null unique, payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz null, received_at timestamptz not null default now()
);
create index if not exists event_bus_global_idx on public.event_bus(global_id, received_at desc);
create index if not exists event_bus_source_idx on public.event_bus(source_provider, received_at desc);

create table if not exists public.action_registry (
  action_key text primary key, provider text not null, description text not null, permission_key text not null,
  mode text not null check (mode in ('read','write')), input_schema jsonb not null default '{}'::jsonb,
  success_event text null, failure_event text null, enabled boolean not null default true, metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.view_definitions (
  view_key text primary key, label text not null, object_type text not null,
  view_type text not null check (view_type in ('table','list','kanban','calendar','detail','dashboard')),
  data_source text not null default 'control-central', config jsonb not null default '{}'::jsonb,
  permission_key text not null default 'view:read', enabled boolean not null default true, updated_at timestamptz not null default now()
);

insert into public.integration_connections(provider, connection_key, mode, status, webhook_token_hash, metadata)
values ('twenty','primary','crm','active','2f46b972d862b33730466215477b078f721cb71d484342c34659a450deadd82e', jsonb_build_object('role','operational_crm','memory_owner',false))
on conflict (provider, connection_key) do update set mode=excluded.mode,status=excluded.status,webhook_token_hash=excluded.webhook_token_hash,metadata=public.integration_connections.metadata || excluded.metadata,updated_at=now();

insert into public.action_registry(action_key,provider,description,permission_key,mode,success_event,failure_event,input_schema) values
('client.create','core','Crear una identidad cliente en CONTROL CENTRAL','client:create','write','CLIENT_CREATED','CLIENT_CREATE_FAILED','{}'),
('client.update','core','Actualizar identidad y metadatos del cliente','client:update','write','CLIENT_UPDATED','CLIENT_UPDATE_FAILED','{}'),
('client.archive','core','Archivar la relación central sin destruir memorias','client:archive','write','CLIENT_ARCHIVED','CLIENT_ARCHIVE_FAILED','{}'),
('project.connect','core','Conectar un proyecto hijo a una identidad global','project:connect','write','PROJECT_CONNECTED','PROJECT_CONNECT_FAILED','{}'),
('memory.remember','supabase','Guardar o actualizar memoria profunda independiente del CRM','memory:write','write','MEMORY_STORED','MEMORY_STORE_FAILED','{}'),
('memory.recall','supabase','Recuperar memoria profunda por namespace y consulta','memory:read','read',null,'MEMORY_RECALL_FAILED','{}'),
('crm.company.upsert','twenty','Crear o sincronizar Company en Twenty usando Control Central ID','crm:company:write','write','CRM_COMPANY_SYNCED','CRM_COMPANY_SYNC_FAILED','{}'),
('crm.opportunity.create','twenty','Crear oportunidad comercial en Twenty','crm:opportunity:write','write','CRM_OPPORTUNITY_CREATED','CRM_OPPORTUNITY_CREATE_FAILED','{}'),
('crm.task.create','twenty','Crear tarea operacional en Twenty','crm:task:write','write','CRM_TASK_CREATED','CRM_TASK_CREATE_FAILED','{}'),
('crm.timeline.read','twenty','Leer actividad CRM para la ficha 360','crm:timeline:read','read',null,'CRM_TIMELINE_READ_FAILED','{}'),
('integration.sync','core','Sincronizar bindings y estado de una integración','integration:sync','write','INTEGRATION_SYNCED','INTEGRATION_SYNC_FAILED','{}')
on conflict (action_key) do update set provider=excluded.provider,description=excluded.description,permission_key=excluded.permission_key,mode=excluded.mode,success_event=excluded.success_event,failure_event=excluded.failure_event,input_schema=excluded.input_schema,enabled=true,updated_at=now();

insert into public.view_definitions(view_key,label,object_type,view_type,data_source,config,permission_key) values
('clients.active','Clientes activos','client','table','control-central','{"fields":["name","global_id","status","updated_at"],"filters":{"status":"active"}}','client:read'),
('client.360','Ficha 360','client','detail','federated','{"tabs":["summary","crm","projects","activity","documents","memory","integrations"],"sources":{"summary":"control-central","crm":"twenty","memory":"supabase-deep-memory"}}','client:read'),
('crm.pipeline','Pipeline comercial','opportunity','kanban','twenty','{"groupBy":"stage","fields":["name","company","amount","stage","controlCentralId"]}','crm:opportunity:read'),
('tasks.calendar','Calendario operacional','task','calendar','federated','{"dateField":"dueAt","sources":["control-central","twenty"]}','task:read'),
('control.overview','CONTROL CENTRAL','control','dashboard','federated','{"widgets":["clients","crmPipeline","tasks","activity","integrationHealth"]}','control:read')
on conflict (view_key) do update set label=excluded.label,object_type=excluded.object_type,view_type=excluded.view_type,data_source=excluded.data_source,config=excluded.config,permission_key=excluded.permission_key,enabled=true,updated_at=now();

comment on table public.deep_memories is 'Memoria profunda de LINK CONTROL CENTRAL. Independiente del CRM; se relaciona mediante namespaces y memory_links genéricos.';
comment on table public.integration_bindings is 'Mapa entre identidades globales de CONTROL CENTRAL y registros de motores externos como Twenty.';

do $$ declare t text; begin
  foreach t in array array['memory_namespaces','deep_memories','memory_links','integration_connections','integration_bindings','command_bus','event_bus','action_registry','view_definitions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists lc_member_select on public.%I', t);
    execute format('create policy lc_member_select on public.%I for select to authenticated using ((select private.lc_is_active_member()))', t);
    execute format('drop policy if exists lc_member_insert on public.%I', t);
    execute format('create policy lc_member_insert on public.%I for insert to authenticated with check ((select private.lc_is_active_member()))', t);
    execute format('drop policy if exists lc_member_update on public.%I', t);
    execute format('create policy lc_member_update on public.%I for update to authenticated using ((select private.lc_is_active_member())) with check ((select private.lc_is_active_member()))', t);
    execute format('drop policy if exists lc_member_delete on public.%I', t);
    execute format('create policy lc_member_delete on public.%I for delete to authenticated using ((select private.lc_is_active_member()))', t);
    execute format('grant select,insert,update,delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;

do $$ begin alter publication supabase_realtime add table public.command_bus; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.event_bus; exception when duplicate_object then null; end $$;

create or replace view public.control_client_360 with (security_invoker = true) as
select c.id,c.global_id,c.name,c.slug,c.status,c.accent,c.created_at,c.updated_at,
  coalesce((select count(*) from public.integration_bindings b where b.global_id=c.global_id),0) as integration_count,
  coalesce((select count(*) from public.memory_links ml join public.deep_memories dm on dm.id=ml.memory_id where ml.entity_key=c.global_id and dm.archived_at is null),0) as memory_count,
  coalesce((select max(e.received_at) from public.event_bus e where e.global_id=c.global_id),c.updated_at) as last_activity_at
from public.clients c;
grant select on public.control_client_360 to authenticated,service_role;
