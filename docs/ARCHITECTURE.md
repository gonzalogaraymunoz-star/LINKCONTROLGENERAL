# Arquitectura LINK CONTROL v0.2

```text
Gonzalo / Root
      │
ChatGPT Personal
      │
LINK CONTROL CENTRAL
┌──────────────┬──────────────┬──────────────┐
│ Gobierno     │ Memoria      │ Gateway      │
│ Identidad    │ Inteligencia │ Event Bus    │
│ Permisos     │ Constitución │ Inbox        │
└──────────────┴──────────────┴──────────────┘
      │
      ├─────────────────────────────────────┐
      │                                     │
Central Data Plane                    Operational Data Plane
LINK PREVIEW                          Supabase operación existente
FREE #1                               FREE #2
      │                                     │
controls / scopes                           Hotel Experience
clients / projects                          turismo / reservas
agent_memories                              proveedores / pagos
Preview Studio                              comisiones / políticas
CRM / artifacts / events                    postventa / conciliación
      │                                     │
      └──────────── Gateway scoped ──────────┘
      │
Controles de negocio (lógicos)
      │
MCP / complemento por scope
      │
ChatGPT cliente
      │
CRM · Explorador · Proyectos · Apps · Artifacts
```

## Fuente de verdad por capa
- **GitHub**: código, documentación, migrations y contrato técnico.
- **Supabase LINK PREVIEW**: Central Data Plane, controls, relaciones, memoria, inteligencia, artifacts y eventos.
- **Supabase operacional**: operación especializada existente; no es memoria maestra.
- **Vercel**: experiencia web + rutas MCP/API.
- **Gateway**: única frontera para herramientas externas y para el Supabase operacional.
- **ChatGPT**: interfaz conversacional y ejecución contextual.

## Regla de escala
Un nuevo cliente o negocio no crea infraestructura física por defecto. Crea:

`control → membership → scope → RLS → MCP scoped`.

## Event Bus inicial
- `client.created`
- `stage.changed`
- `stage.ready`
- `stage.stalled`
- `action.completed`
- `task.completed`
- `gesture.completed`
- `artifact.created`
- `artifact.approved`
- `memory.proposed`
- `memory.promoted`
- `gateway.connected`
- `gateway.disconnected`
- `deployment.failed`
- `deployment.succeeded`
