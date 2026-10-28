-- LINK PIXEL · BORRADOR DE ESQUEMA / NO EJECUTAR EN PRODUCCION SIN REVISION
-- Los activos de analitica son propiedad de un negocio; el acceso se resuelve mediante servidor autorizado.
-- Las tablas privadas NO reciben politicas de lectura/escritura para anon/authenticated.
-- Requiere validacion de ownership multicliente, permisos, credenciales y migraciones existentes antes de aplicar.

create schema if not exists private;

create table if not exists private.link_pixel_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.link_world_businesses(id) on delete restrict,
  provider text not null check (provider in ('meta','google_analytics','cloudflare')),
  external_account_id text not null check (length(external_account_id) between 1 and 200),
  display_label text not null check (length(display_label) between 1 and 120),
  authorization_state text not null default 'discovered' check
    (authorization_state in ('discovered','awaiting_authorization','authorized','revoked')),
  -- opaque reference only, NEVER a token / OAuth code / private key
  secret_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  unique (business_id,provider,external_account_id)
);

create table if not exists private.link_pixel_analytics_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.link_world_businesses(id) on delete restrict,
  provider_account_id uuid not null,
  asset_kind text not null check
    (asset_kind in ('meta_pixel','meta_dataset','ga4_property','ga4_web_stream','zaraz_zone','web_analytics_site')),
  external_asset_id text not null check (length(external_asset_id) between 1 and 200),
  display_label text not null check (length(display_label) between 1 and 120),
  validation_state text not null default 'discovered' check
    (validation_state in ('discovered','awaiting_authorization','verified','revoked')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (provider_account_id,business_id)
    references private.link_pixel_provider_accounts(id,business_id) on delete restrict,
  unique (id,business_id),
  unique (provider_account_id,asset_kind,external_asset_id)
);

create table if not exists private.link_pixel_site_bindings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.link_world_businesses(id) on delete restrict,
  site_id uuid not null,
  asset_id uuid not null,
  install_method text not null check (install_method in ('zaraz','direct','reporting_only')),
  status text not null default 'proposed' check
    (status in ('proposed','awaiting_authorization','installed','verified','disabled','revoked')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id,business_id)
    references public.link_commerce_sites(id,business_id) on delete restrict,
  foreign key (asset_id,business_id)
    references private.link_pixel_analytics_assets(id,business_id) on delete restrict,
  unique (site_id,asset_id)
);

create index if not exists link_pixel_provider_accounts_business_idx
  on private.link_pixel_provider_accounts(business_id,provider);
create index if not exists link_pixel_assets_business_idx
  on private.link_pixel_analytics_assets(business_id,asset_kind);
create index if not exists link_pixel_site_bindings_business_idx
  on private.link_pixel_site_bindings(business_id,site_id,status);

alter table private.link_pixel_provider_accounts enable row level security;
alter table private.link_pixel_analytics_assets enable row level security;
alter table private.link_pixel_site_bindings enable row level security;

revoke all on private.link_pixel_provider_accounts from public, anon, authenticated;
revoke all on private.link_pixel_analytics_assets from public, anon, authenticated;
revoke all on private.link_pixel_site_bindings from public, anon, authenticated;

-- No service_role grant nor exposed RPC in this draft: design backend authorization first.
-- TODO before adoption: review private schema usage privileges, migrations baseline,
-- server-side authorized business membership, sanitized error/audit evidence, and RLS tests.
