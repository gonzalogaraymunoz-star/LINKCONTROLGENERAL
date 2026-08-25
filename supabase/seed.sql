-- LINK CONTROL CENTRAL v0.2 seed
-- The root Control and system actor are already created by migration 0001.
-- This file creates example child Controls only. Remove any you do not want.

select public.create_child_control('LINK Empresa', 'link-empresa', 'link_empresa')
where not exists (select 1 from public.controls where scope = 'link_empresa');

select public.create_child_control('Lama Travelers', 'lama-travelers', 'lama')
where not exists (select 1 from public.controls where scope = 'lama');

select public.create_child_control('Hotel Experience', 'hotel-experience', 'hotel_experience')
where not exists (select 1 from public.controls where scope = 'hotel_experience');

select public.create_child_control('LINK Cupones', 'link-cupones', 'link_cupones')
where not exists (select 1 from public.controls where scope = 'link_cupones');
