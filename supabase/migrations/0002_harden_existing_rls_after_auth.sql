-- LINK CONTROL CENTRAL v0.2 — phase 2 security hardening
-- RUN ONLY AFTER:
-- 1) Supabase Auth has the root human user,
-- 2) public.actors has that auth_user_id,
-- 3) public.control_memberships grants root_admin on LINK CONTROL CENTRAL.
--
-- This migration replaces LINK PREVIEW's old "any active app_member can read everything"
-- policies on the most sensitive multi-tenant tables with control-aware policies.

-- Compatibility policies that are too broad for client-facing multi-tenancy.
drop policy if exists members_read_clients on public.clients;
drop policy if exists members_read_client_profiles on public.client_profiles;
drop policy if exists members_read_agent_sessions on public.agent_sessions;
drop policy if exists members_write_agent_sessions on public.agent_sessions;
drop policy if exists members_update_agent_sessions on public.agent_sessions;
drop policy if exists members_delete_agent_sessions on public.agent_sessions;
drop policy if exists members_read_agent_messages on public.agent_messages;
drop policy if exists members_write_agent_messages on public.agent_messages;
drop policy if exists members_update_agent_messages on public.agent_messages;
drop policy if exists members_delete_agent_messages on public.agent_messages;
drop policy if exists members_read_agent_memories on public.agent_memories;
drop policy if exists members_write_agent_memories on public.agent_memories;
drop policy if exists members_update_agent_memories on public.agent_memories;
drop policy if exists members_delete_agent_memories on public.agent_memories;
drop policy if exists members_read_design_previews on public.design_previews;
drop policy if exists members_read_requests on public.requests;
drop policy if exists members_read_deliverables on public.deliverables;

-- clients
create policy lc_clients_scope_select on public.clients for select using (public.has_control_access(control_id));
create policy lc_clients_scope_insert on public.clients for insert with check (public.has_control_access(control_id));
create policy lc_clients_scope_update on public.clients for update using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));

-- client_profiles inherits through client
create policy lc_client_profiles_scope_select on public.client_profiles for select using (
  exists (select 1 from public.clients c where c.id = client_profiles.client_id and public.has_control_access(c.control_id))
);

-- conversations and memory
create policy lc_agent_sessions_scope_all on public.agent_sessions for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy lc_agent_messages_scope_all on public.agent_messages for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));
create policy lc_agent_memories_scope_all on public.agent_memories for all using (public.has_control_access(control_id)) with check (public.has_control_access(control_id));

-- artifacts / requests
create policy lc_design_previews_scope_select on public.design_previews for select using (public.has_control_access(control_id));
create policy lc_requests_scope_select on public.requests for select using (public.has_control_access(control_id));
create policy lc_deliverables_scope_select on public.deliverables for select using (public.has_control_access(control_id));
