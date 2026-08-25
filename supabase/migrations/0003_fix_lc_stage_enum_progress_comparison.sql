create or replace function public.lc_recalculate_cycle_progress(p_cycle_id uuid)
returns smallint
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  total_count integer;
  done_count integer;
  new_progress smallint;
  current_stage public.lc_stage_key;
begin
  select stage into current_stage
  from public.client_cycles
  where id = p_cycle_id;

  select count(*), count(*) filter (where status = 'done')
    into total_count, done_count
  from public.work_items
  where cycle_id = p_cycle_id
    and status <> 'cancelled'
    and stage = current_stage;

  new_progress := case
    when total_count = 0 then 0
    else round((done_count::numeric / total_count::numeric) * 100)::smallint
  end;

  update public.client_cycles
  set progress = new_progress,
      updated_at = now()
  where id = p_cycle_id;

  return new_progress;
end
$function$;

revoke all on function public.lc_recalculate_cycle_progress(uuid) from public;
revoke all on function public.lc_recalculate_cycle_progress(uuid) from anon;
revoke all on function public.lc_recalculate_cycle_progress(uuid) from authenticated;
grant execute on function public.lc_recalculate_cycle_progress(uuid) to service_role;
