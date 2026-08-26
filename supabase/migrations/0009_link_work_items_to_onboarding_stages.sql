alter table public.work_items
  add column if not exists onboarding_stage_id uuid references public.client_onboarding_stages(id) on delete set null;

create index if not exists work_items_onboarding_stage_idx
  on public.work_items(onboarding_stage_id);
