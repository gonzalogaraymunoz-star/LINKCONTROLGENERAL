-- LINK PIXEL · registro de integraciones sin secretos.
-- Additive; no altera sitios, cuentas, píxeles ni datos previos.
create table if not exists public.link_pixel_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.link_world_businesses(id) on delete restrict,
  site_id uuid null,
  provider text not null check (provider in
    ('meta_pixel','meta_ads','ga4','cloudflare_zaraz','cloudflare_web_analytics','zernio_meta_ads','microsoft_clarity')),
  label text not null check (length(trim(label)) between 1 and 100),
  resource_id text not null check (length(trim(resource_id)) between 1 and 180),
  domain text null check (domain is null or (length(domain) between 4 and 253 and domain !~ '[/:?#@ ]')),
  status text not null default 'configured' check (status in ('configured','awaiting_authorization','verified','degraded','disabled')),
  last_verified_at timestamptz null,
  verification_evidence text null check (verification_evidence is null or length(verification_evidence)<=500),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists link_commerce_sites_id_business_unique
 on public.link_commerce_sites(id,business_id);
do $$
begin
 if not exists (select 1 from pg_constraint where conname='link_pixel_connections_site_business_fk') then
  alter table public.link_pixel_connections
  add constraint link_pixel_connections_site_business_fk
  foreign key(site_id,business_id) references public.link_commerce_sites(id,business_id) on delete restrict;
 end if;
end $$;
create index if not exists link_pixel_connections_business_idx on public.link_pixel_connections(business_id,provider,status);
create unique index if not exists link_pixel_connections_dedupe_idx on public.link_pixel_connections
 (business_id,provider,resource_id,coalesce(site_id,'00000000-0000-0000-0000-000000000000'::uuid));
alter table public.link_pixel_connections enable row level security;
revoke all on public.link_pixel_connections from anon;
grant select, insert, update on public.link_pixel_connections to authenticated;
drop policy if exists "link_pixel_connections_owner_select" on public.link_pixel_connections;
create policy "link_pixel_connections_owner_select" on public.link_pixel_connections
 for select to authenticated
 using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','admin')));
drop policy if exists "link_pixel_connections_owner_insert" on public.link_pixel_connections;
create policy "link_pixel_connections_owner_insert" on public.link_pixel_connections
 for insert to authenticated with check
 (created_by=(select auth.uid())
  and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','admin'))
  and status in ('configured','awaiting_authorization','disabled') and last_verified_at is null and verification_evidence is null);
drop policy if exists "link_pixel_connections_owner_update" on public.link_pixel_connections;
create policy "link_pixel_connections_owner_update" on public.link_pixel_connections
 for update to authenticated
 using (exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','admin')))
 with check (created_by=(select auth.uid())
  and exists(select 1 from public.app_members m where m.user_id=(select auth.uid()) and m.status='active' and m.role in ('owner','admin'))
  and status in ('configured','awaiting_authorization','disabled') and last_verified_at is null and verification_evidence is null);
comment on table public.link_pixel_connections is 'LINK Pixel: solo recursos e IDs no secretos. Estado verified reservado a proceso de comprobacion real a implementar con backend autorizado; panel no puede marcarlo.';
