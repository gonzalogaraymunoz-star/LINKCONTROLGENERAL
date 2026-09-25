
alter table public.gesture_tasks
  add column if not exists workflow_state text not null default 'to_resolve',
  add column if not exists responsible text,
  add column if not exists waiting_for text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists resolution_note text,
  add column if not exists started_at timestamptz,
  add column if not exists workflow_updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='gesture_tasks_workflow_state_check'
  ) then
    alter table public.gesture_tasks
      add constraint gesture_tasks_workflow_state_check
      check (workflow_state in (
        'inbox',
        'to_resolve',
        'scheduled',
        'in_progress',
        'waiting',
        'resolved',
        'financially_closed'
      ));
  end if;
end $$;

update public.gesture_tasks
set workflow_state = case
  when status='done' then 'resolved'
  when due_at is not null and status='open' then 'scheduled'
  else 'to_resolve'
end,
workflow_updated_at = now()
where workflow_state is null
   or workflow_state='to_resolve';

create index if not exists gesture_tasks_workflow_idx
  on public.gesture_tasks(workflow_state, priority, due_at, created_at desc);

comment on column public.gesture_tasks.workflow_state is
  'Estado humano de la Pizarra Operativa; status mantiene compatibilidad técnica.';
