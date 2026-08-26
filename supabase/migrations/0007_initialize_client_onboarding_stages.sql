create or replace function public.lc_initialize_client_onboarding(p_client_id uuid, p_control_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client_onboarding_stages (control_id, client_id, stage_key, stage_order, title, status, checklist, fields, exit_criteria)
  values
    (p_control_id,p_client_id,'interview',1,'Entrevista','in_progress','[{"id":"business","label":"Entender qué hace el negocio","done":false},{"id":"need","label":"Definir necesidad principal","done":false},{"id":"goal","label":"Definir objetivo inicial","done":false},{"id":"fit","label":"Confirmar encaje como cliente LINK","done":false}]'::jsonb,'{}'::jsonb,'Diagnóstico inicial y brief base registrados.'),
    (p_control_id,p_client_id,'identity',2,'Identidad','pending','[{"id":"email","label":"Correo propio del negocio definido","done":false},{"id":"chatgpt","label":"Proyecto ChatGPT creado","done":false},{"id":"central_access","label":"Acceso central autorizado","done":false}]'::jsonb,'{}'::jsonb,'Identidad digital del negocio registrada y accesible.'),
    (p_control_id,p_client_id,'connections',3,'Conexiones','pending','[{"id":"github","label":"GitHub registrado","done":false},{"id":"supabase","label":"Supabase registrado","done":false},{"id":"vercel","label":"Vercel registrado","done":false},{"id":"drive","label":"Google Drive registrado","done":false}]'::jsonb,'{}'::jsonb,'Conexiones fundamentales registradas y verificables.'),
    (p_control_id,p_client_id,'control',4,'Centro de Control','pending','[{"id":"scope","label":"Scope del cliente definido","done":false},{"id":"instance","label":"Instancia de Control creada","done":false},{"id":"permissions","label":"Permisos base definidos","done":false}]'::jsonb,'{}'::jsonb,'Centro subordinado identificado y gobernado por el Central.'),
    (p_control_id,p_client_id,'memory',5,'Memoria','pending','[{"id":"master_md","label":"Archivo maestro .md creado","done":false},{"id":"memory","label":"Memoria inicial cargada","done":false},{"id":"decisions","label":"Decisiones iniciales registradas","done":false}]'::jsonb,'{}'::jsonb,'Memoria inicial y mapa maestro disponibles.'),
    (p_control_id,p_client_id,'product',6,'Primer producto','pending','[{"id":"scope_product","label":"Alcance del primer producto definido","done":false},{"id":"build","label":"Producto construido","done":false},{"id":"client_review","label":"Revisión con cliente realizada","done":false}]'::jsonb,'{}'::jsonb,'Primer producto funcional y validado.'),
    (p_control_id,p_client_id,'mcp',7,'ChatGPT / MCP','pending','[{"id":"endpoint","label":"Endpoint MCP registrado","done":false},{"id":"tools","label":"Tools necesarias expuestas","done":false},{"id":"scope_test","label":"Scope y permisos probados","done":false}]'::jsonb,'{}'::jsonb,'Centro operable desde ChatGPT dentro del scope concedido.'),
    (p_control_id,p_client_id,'tests',8,'Pruebas','pending','[{"id":"read","label":"Lectura real verificada","done":false},{"id":"write","label":"Escritura y persistencia verificadas","done":false},{"id":"audit","label":"Evento/auditoría verificado","done":false},{"id":"reload","label":"Estado persiste al recargar","done":false}]'::jsonb,'{}'::jsonb,'Recorrido punta a punta verificado sin Fake UI.'),
    (p_control_id,p_client_id,'delivery',9,'Entrega y evolución','pending','[{"id":"handoff","label":"Entrega formal realizada","done":false},{"id":"roadmap","label":"Roadmap de evolución definido","done":false},{"id":"next","label":"Próxima oportunidad registrada","done":false}]'::jsonb,'{}'::jsonb,'Cliente operando y roadmap de evolución activo.')
  on conflict (client_id, stage_key) do nothing;
end;
$$;

create or replace function public.lc_client_onboarding_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lc_initialize_client_onboarding(new.id, new.control_id);
  return new;
end;
$$;

drop trigger if exists trg_lc_initialize_client_onboarding on public.clients;
create trigger trg_lc_initialize_client_onboarding after insert on public.clients for each row execute function public.lc_client_onboarding_trigger();

do $$
declare r record;
begin
  for r in select id, control_id from public.clients where status='active' loop
    perform public.lc_initialize_client_onboarding(r.id, r.control_id);
  end loop;
end $$;
