# LINK CONTROL CENTRAL V5 — Twenty + Deep Memory

## Production rule

- **CONTROL CENTRAL** owns governance, identity, action contracts and orchestration.
- **Supabase** owns **deep memory** independently of CRM. Memory is stored in `memory_namespaces`, `deep_memories` and `memory_links`; these tables have no CRM foreign keys.
- **Twenty** is the operational CRM for companies, people, opportunities, tasks and commercial activity.
- **GitHub** is the technical source of truth.
- **Vercel** runs the UI/API.
- Child Controls and apps only communicate through governed gateways and global IDs.

## Shared action language

UI and ChatGPT use the same action keys: `client.create`, `project.connect`, `memory.remember`, `crm.company.upsert`, `crm.opportunity.create`, `crm.task.create`, etc.

Every action is auditable through `command_bus`; external facts/events enter through `event_bus`.

## Identity

Every central client receives a deterministic `global_id` (`CC-CLIENT-*`). Twenty stores that value in the custom `controlCentralId` fields. `integration_bindings` maps the central identity to external records without making Twenty the memory owner.

## Declarative experience

`view_definitions` contains reusable table, Kanban, calendar, detail and dashboard definitions. `client.360` declares the seven surfaces: summary, CRM, projects, activity, documents, memory and integrations.

## Twenty inbound events

Twenty posts events to `/api/integrations/twenty/webhook`. The endpoint authenticates against a hashed token held only in Supabase, deduplicates events, updates bindings, and never writes CRM data into deep memory automatically.

## Non-negotiable invariants

1. Child apps never modify the root constitution/governance.
2. CRM records may be archived/deleted without deleting deep memory.
3. No UI button may create an unregistered side effect; writes use an action key.
4. Every external integration uses global identity + binding + event audit.
5. Secrets never live in GitHub.
