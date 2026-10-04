# LINKDOT OS v1

## Propósito

LINKDOT OS formaliza el cuerpo operativo de un DOT dentro de la arquitectura existente de LINK. Toma como referencia las ideas útiles de OpenDots —identidad persistente, espacios, artefactos, conversaciones, memoria, capacidades, permisos, trabajo recurrente y evidencia— sin incorporar CopilotKit ni crear una segunda fuente de verdad.

**Fuente de verdad:** Supabase de LINK CONTROL CENTRAL.

## Regla principal

Un LINKDOT no es una pantalla ni un prompt. Es una identidad operativa persistente que:

1. tiene una responsabilidad clara;
2. trabaja dentro de uno o más espacios;
3. delega especialidades a LINKSUBDOT;
4. mantiene misiones y conversaciones persistentes;
5. usa capacidades y permisos explícitos;
6. deja evidencia de lo que hizo;
7. conserva memoria separada del historial de conversación;
8. puede recibir trabajo recurrente;
9. entrega responsabilidad mediante handoffs;
10. reporta su estado a LINK Director.

## Mapa OpenDots → LINK existente

| Cuerpo del DOT | Fuente LINK |
| --- | --- |
| Identidad, rol e instrucciones | `link_skills` + metadata |
| Estado operativo | `agent_scope_state` / `agent_operating_state_v` |
| Spaces | `link_dot_workspaces` |
| LINKSUBDOT asignados | `link_dot_workspace_subdots` |
| Páginas / artefactos | `link_dot_artifacts` |
| Threads | `agent_sessions` |
| Mensajes del thread | `agent_messages` |
| Memoria | `memory_namespaces` + `deep_memories` |
| Capacidades | `link_skill_capabilities` |
| Permisos / tools | `agent_action_grants` |
| Misiones | `agent_missions` |
| Evidencia | `agent_mission_evidence` |
| Delegación / handoff | `agent_stage_handoffs` |
| Acciones propuestas/ejecutadas | `command_bus` |
| Señales y auditoría | `event_bus` |
| Trabajo recurrente | `link_cron_registry` + `link_cron_runs` |
| Gobierno | LINK Director + relaciones del ecosistema |

## Jerarquía

```
LINK DIRECTOR
    ↓
LINKDOT
    ↓
WORKSPACES
    ↓
LINKSUBDOTS
    ↓
ARTEFACTOS / MISIONES / THREADS
    ↓
EVIDENCIA
    ↓
HANDOFF / REPORTE
```

El LINKDOT es responsable del área. El LINKSUBDOT recibe trabajo especializado. Un artefacto es una superficie o mecanismo operado dentro de un Workspace. La fuente transaccional original de cada negocio se conserva: LINK no copia datos sensibles si no es necesario.

## Constitución mínima de un LINKDOT

La identidad principal vive en `link_skills`. La metadata de un LINKDOT debe procurar incluir:

- `agent_kind: "linkdot"`
- `dot_slug`
- `dot_area`
- `parent_agent: "link-director"`
- `responsibility`
- `entry_boundary`
- `exit_boundary` o `handoff_boundary`
- `autonomy_mode`
- `source_of_truth`
- `execution_enabled`
- `runtime` cuando tenga ejecución propia
- `runtime_model` cuando corresponda
- `dot_architecture_version`

La identidad técnica del director histórico puede conservar su slug (`director-ventas`, por ejemplo); `dot_slug` define la identidad operacional nueva (`linkdot-ventas`).

## Constitución mínima de un LINKSUBDOT

- `agent_kind: "linksubdot"`
- `parent_dot`
- `parent_agent_slug`
- `specialty`
- `responsibility`
- `autonomy_mode`
- `source_of_truth`
- `execution_enabled`
- límite de handoff si corresponde

## Panel estándar

La ruta dinámica es:

`/dots/[slug]`

Debe aceptar tanto el slug técnico del agente como su `dot_slug` operacional.

Secciones estándar:

- **Inicio:** identidad, responsabilidad, estado y misión actual.
- **Trabajo:** misiones, artefactos y evidencia.
- **Espacios:** Workspaces, LINKSUBDOT y artefactos por espacio.
- **Conversaciones:** `agent_sessions` + `agent_messages`.
- **Memoria:** memoria profunda separada del historial.
- **Capacidades:** capacidades, permisos, handoffs y constitución.
- **Actividad:** command bus, event bus y cron asociados.

No debe inventar actividad ni rellenar casillas con datos ficticios. Cuando una capacidad todavía no exista, el panel debe mostrarla vacía.

## Thread LINK

No se incorpora Copilot Threads.

Para LINK:

```
agent_sessions
      ↓
agent_messages
```

es la conversación persistente.

Una sesión puede vincularse a DOT, negocio, misión, canal u origen mediante metadata. La memoria durable no debe depender del historial completo: lo que realmente debe conservarse pasa a `deep_memories`.

## Permisos y aprobación

El DOT no recibe permisos implícitos por tener acceso a un Workspace.

`agent_action_grants` define qué puede proponer o ejecutar. Las acciones con efectos externos continúan bajo gobierno de `command_bus` y aprobación cuando corresponda.

## Persistencia

Supabase continúa siendo la fuente de verdad del organismo.

Vercel ejecuta las superficies y runtimes. GitHub conserva código y doctrina. Las apps de negocio mantienen su propia verdad transaccional cuando corresponda.

## Regla para nuevos DOT

Antes de construir una app o una tabla nueva:

1. registrar/actualizar la identidad en `link_skills`;
2. crear o asignar su Workspace;
3. definir LINKSUBDOT si necesita especialidades;
4. registrar artefactos existentes;
5. enlazar capacidades y permisos;
6. enlazar misiones, evidencia y cron existentes;
7. usar `/dots/[slug]` como panel estándar;
8. crear tecnología nueva solo para una capacidad que no exista en LINK.

