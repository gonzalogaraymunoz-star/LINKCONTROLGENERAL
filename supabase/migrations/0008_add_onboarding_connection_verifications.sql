alter table public.client_onboarding_stages
  add column if not exists verifications jsonb not null default '{}'::jsonb;
