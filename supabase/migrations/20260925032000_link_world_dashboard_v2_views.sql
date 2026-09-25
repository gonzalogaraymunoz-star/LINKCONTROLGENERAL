alter table public.dashboard_preferences
  add column if not exists widget_views jsonb not null default '{"clients":"table","products":"list","activity":"timeline","cell":"summary"}'::jsonb;

update public.dashboard_preferences
set
  visible_widgets = array['clients','attention','products','activity','cell','personal']::text[],
  layouts = '{}'::jsonb,
  widget_views = '{"clients":"table","products":"list","activity":"timeline","cell":"summary"}'::jsonb,
  updated_at = now()
where dashboard_key = 'link-world-home';

comment on column public.dashboard_preferences.widget_views is
  'Modo de visualización elegido por widget en CONTROL CENTRAL.';
