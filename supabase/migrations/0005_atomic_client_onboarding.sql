create or replace function public.lc_onboard_client(
  p_name text,
  p_accent text,
  p_need text,
  p_product text,
  p_plan text,
  p_strategy_title text,
  p_strategy_objective text,
  p_next_milestone text default 'Completar diagnóstico inicial'
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_control_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_client_id uuid;
  v_need_id uuid;
  v_product_id uuid;
  v_cycle_id uuid;
  v_plan_id uuid;
  v_assignment_id uuid;
  v_strategy_id uuid;
  v_slug text;
  v_base_slug text;
  v_action text;
  v_actions text[] := array[
    'Registrar necesidad declarada',
    'Recopilar antecedentes y contexto',
    'Identificar cliente final y recorrido actual',
    'Revisar situación digital y comercial',
    'Detectar cuello de botella principal',
    'Definir objetivo de la intervención'
  ];
begin
  if nullif(trim(p_name),'') is null then raise exception 'client_name_required'; end if;
  if nullif(trim(p_need),'') is null then raise exception 'need_required'; end if;
  if nullif(trim(p_product),'') is null then raise exception 'product_required'; end if;
  if nullif(trim(p_plan),'') is null then raise exception 'plan_required'; end if;
  if nullif(trim(p_strategy_title),'') is null then raise exception 'strategy_title_required'; end if;

  v_base_slug := lower(trim(regexp_replace(unaccent(p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  v_base_slug := trim(both '-' from v_base_slug);
  if v_base_slug = '' then v_base_slug := 'cliente'; end if;
  v_slug := v_base_slug;
  if exists(select 1 from public.clients where slug=v_slug) then
    v_slug := v_base_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  end if;

  insert into public.clients(control_id,name,slug,short_code,accent,status,metadata)
  values(v_control_id,trim(p_name),v_slug,upper(substr(regexp_replace(trim(p_name),'[^A-Za-z0-9]','','g'),1,2)),coalesce(nullif(p_accent,''),'#6c5ce7'),'active',jsonb_build_object('source','link-control-onboarding'))
  returning id into v_client_id;

  select id into v_plan_id from public.service_plans where control_id=v_control_id and lower(name)=lower(trim(p_plan)) and status='active' limit 1;
  if v_plan_id is null then
    insert into public.service_plans(control_id,name,status) values(v_control_id,trim(p_plan),'active') returning id into v_plan_id;
  end if;

  insert into public.client_plan_assignments(control_id,client_id,plan_id,plan_name_snapshot,status)
  values(v_control_id,v_client_id,v_plan_id,trim(p_plan),'active') returning id into v_assignment_id;

  insert into public.needs(control_id,client_id,title,status) values(v_control_id,v_client_id,trim(p_need),'open') returning id into v_need_id;
  insert into public.products(control_id,name,active,metadata) values(v_control_id,trim(p_product),true,jsonb_build_object('client_id',v_client_id)) returning id into v_product_id;

  insert into public.client_cycles(control_id,client_id,need_id,product_id,stage,progress,next_milestone,status)
  values(v_control_id,v_client_id,v_need_id,v_product_id,'understand'::public.lc_stage_key,0,nullif(trim(p_next_milestone),''),'active') returning id into v_cycle_id;

  insert into public.client_strategies(control_id,client_id,cycle_id,plan_assignment_id,title,objective,status)
  values(v_control_id,v_client_id,v_cycle_id,v_assignment_id,trim(p_strategy_title),nullif(trim(p_strategy_objective),''),'active') returning id into v_strategy_id;

  foreach v_action in array v_actions loop
    insert into public.work_items(control_id,client_id,cycle_id,strategy_id,stage,kind,title,priority,status,source)
    values(v_control_id,v_client_id,v_cycle_id,v_strategy_id,'understand'::public.lc_stage_key,'action',v_action,2,'pending','method');
  end loop;

  insert into public.events(control_id,client_id,event_type,actor,object_type,object_id,payload)
  values
    (v_control_id,v_client_id,'client.onboarded','link-control-app','client',v_client_id::text,jsonb_build_object('plan',p_plan,'strategy',p_strategy_title)),
    (v_control_id,v_client_id,'plan.assigned','link-control-app','client_plan_assignment',v_assignment_id::text,jsonb_build_object('plan_id',v_plan_id,'plan',p_plan)),
    (v_control_id,v_client_id,'strategy.activated','link-control-app','client_strategy',v_strategy_id::text,jsonb_build_object('title',p_strategy_title));

  return v_client_id;
end;
$$;

revoke all on function public.lc_onboard_client(text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.lc_onboard_client(text,text,text,text,text,text,text,text) to service_role;
