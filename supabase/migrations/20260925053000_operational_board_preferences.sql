
create table if not exists public.operational_board_preferences (
  preference_key text primary key,
  view_mode text not null default 'kanban',
  calendar_mode text not null default 'week',
  filters jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.operational_board_preferences(preference_key,view_mode,calendar_mode,filters)
values ('default','kanban','week','{}'::jsonb)
on conflict (preference_key) do nothing;

alter table public.operational_board_preferences enable row level security;
