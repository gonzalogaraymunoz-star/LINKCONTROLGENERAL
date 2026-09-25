create table if not exists public.dashboard_preferences (
  id uuid primary key default gen_random_uuid(),
  dashboard_key text not null unique,
  title text not null default 'LINK WORLD',
  visible_widgets text[] not null default array['clients','activity','products','businesses']::text[],
  layouts jsonb not null default '{}'::jsonb,
  client_columns text[] not null default array['name','business','relationship_state','agreement_status','products','updated_at']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_preferences enable row level security;

comment on table public.dashboard_preferences is
  'Preferencias persistentes de paneles CONTROL CENTRAL. Acceso solo por backend autorizado; no se expone directamente al navegador.';

insert into public.dashboard_preferences (dashboard_key, title)
values ('link-world-home', 'LINK WORLD')
on conflict (dashboard_key) do nothing;
