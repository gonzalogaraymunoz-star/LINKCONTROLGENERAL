# LINK CONTROL CENTRAL ↔ LINK WORLD · Bridge Contract v1

## Purpose
Make CONTROL CENTRAL and LINK WORLD two surfaces of the same LINK organism without duplicating canonical data.

## Responsibility split
- **LINK CONTROL CENTRAL**: governance root, identities, agents, permissions, evidence, commands and system health.
- **LINK WORLD**: businesses/cells, products, relationships, activity, mycelium and operational context.
- **Supabase LINK CONTROL CENTRAL**: shared live graph and state.
- **GitHub**: versioned doctrine/code.
- **Vercel**: runtimes and user-facing surfaces.

## Shared graph
The bridge is exposed through:
- `public.link_control_world_nodes_v`
- `public.link_control_world_edges_v`
- `public.link_control_world_summary_v`

These views are `security_invoker` and rely on the existing RLS of the underlying tables.

## Canonical relationship
CONTROL CENTRAL does not copy LINK WORLD businesses into a second CRM representation.
LINK WORLD does not create a second agent registry.
Both read the same canonical entities and relations.

Current LINK WORLD businesses are normalized as ecosystem entities and are related to CONTROL CENTRAL through `governed_by`.
LINK Director and the six stage directors live in the CONTROL CENTRAL agent registry and are visible to LINK WORLD through the shared graph.

## Runtime flow
CONTROL CENTRAL → reads shared graph → sees LINK WORLD businesses/relations.
LINK WORLD / LINK Director → reads shared graph → sees CONTROL CENTRAL, agents and stage directors.

## Six stage directors
1. Marketing
2. Ventas
3. Cierre
4. Onboarding
5. Entrega
6. Postventa

They remain governed by LINK Director and start in SHADOW mode.

## Non-duplication rule
If a fact already has a canonical owner table, the other surface references it by `global_id` and relation; it does not create a second source of truth.
