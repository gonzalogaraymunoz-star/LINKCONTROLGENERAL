# Auditoría UX · LINK CONTROL CENTRAL

Fecha: 2026-10-03  
Alcance: superficie principal de Control Central + relación con LINKDOT OS.

## Objetivo

Control Central debe permitir entender y dirigir LINK sin obligar al usuario a comprender primero la arquitectura técnica.

Regla de experiencia:

**Arquitectura abajo. Trabajo arriba.**

La arquitectura no se elimina ni se reemplaza. Supabase, runtime, permisos, command bus, event bus, handoffs, memoria y conectores siguen siendo las fuentes y mecanismos reales.

## Hallazgos

### 1. La navegación mezclaba trabajo con infraestructura

La navegación principal exponía al mismo nivel:

- Inicio
- Agentes
- Negocios
- Trabajo
- Calendario
- Actividad
- Integraciones
- Sistema
- LINK Guide

Eso obliga a decidir entre conceptos que pertenecen a niveles diferentes.

### 2. "Agentes" duplicaba la lista de LINKDOT

Los LINKDOT aparecían dentro de Agentes y nuevamente en el lateral. La experiencia no diferenciaba con claridad:

- actor principal;
- especialista LINKSUBDOT;
- espacio de trabajo;
- infraestructura del actor.

### 3. "Trabajo" consultaba una fuente distinta al trabajo LINKDOT

La antigua vista de Trabajo usaba tareas derivadas de `client_gestures`.

Los LINKDOT trabajan con:

- `agent_missions`
- `agent_work_queue`
- `command_bus`
- `agent_mission_evidence`

En la validación del 3 de octubre la API mostró:

- 13 misiones de agentes;
- 7 espacios LINKDOT;
- 6 LINKSUBDOT de workspace;
- 14 artefactos;
- 0 tareas legacy abiertas.

Por eso la interfaz podía decir "No hay trabajo abierto" mientras los actores sí tenían misiones.

### 4. La evidencia aparecía antes que el significado

Términos como "despertares", "command bus", "readiness" y "producción agéntica" eran útiles para diagnóstico, pero aparecían demasiado pronto.

La pregunta humana debe ser primero:

- ¿quién está a cargo?
- ¿qué está haciendo?
- ¿necesita algo de mí?
- ¿dónde sigo trabajando?

### 5. Negocio, espacio y actor no estaban claramente separados

Definición adoptada:

- **Negocio:** célula que LINK acompaña.
- **LINKDOT:** actor responsable de una parte del recorrido.
- **LINKSUBDOT:** especialista delegado por un LINKDOT.
- **Espacio:** contexto/casa de trabajo donde viven artefactos y especialistas.
- **Misión:** trabajo concreto asignado a un actor.
- **Conversación:** hilo persistente de contexto.
- **Evidencia:** prueba de que una acción o misión ocurrió.

### 6. Existían superficies históricas en paralelo

El repositorio conserva componentes y rutas de iteraciones anteriores, incluyendo superficies de misión y versiones históricas de Control Central.

No se eliminan en esta iteración para evitar romper enlaces o capacidades existentes. Dejan de ser el camino principal de navegación.

## Nueva jerarquía

### Trabajar

1. **Inicio** — qué está pasando.
2. **Actores** — quién hace qué.
3. **Trabajo** — qué tiene cada actor entre manos.
4. **Espacios** — dónde está ocurriendo el trabajo.

### Contexto

5. **Negocios** — las células.
6. **Conversaciones** — asuntos que los actores recuerdan.
7. **Calendario** — trabajo que realmente tiene fecha.

### Más

8. **Evidencia** — qué ocurrió de verdad y qué espera aprobación.
9. **Conexiones** — sistemas verificados.
10. **Sistema** — detalles técnicos.
11. **LINK Guide** — mapa y direcciones.

## Regla común para toda la arquitectura LINKDOT

Todo LINKDOT debe poder explicarse con:

**RECIBO → HAGO → ENTREGO**

Después puede mostrar:

- misión actual;
- especialistas;
- espacios;
- conversaciones;
- herramientas;
- memoria;
- evidencia;
- permisos.

Los elementos técnicos nunca deben ser requisito para comprender la responsabilidad del actor.

## Fuentes reales usadas por la nueva experiencia

- Actores: `link_skills` / `ecosystem_entities`
- Misiones: `agent_missions`
- Cola: `agent_work_queue`
- Aprobaciones y acciones: `command_bus`
- Evidencia: `agent_mission_evidence`
- Espacios: `link_dot_workspaces`
- Especialistas de espacio: `link_dot_workspace_subdots`
- Artefactos: `link_dot_artifacts`
- Conversaciones: `agent_sessions`
- Handoffs: `agent_stage_handoffs`
- Negocios: vistas compartidas LINK WORLD + clientes de Control Central
- Tareas con fecha: `client_gestures`

No se crean datos ficticios para completar la interfaz.

## Resultado esperado

Control Central responde:

> ¿Qué está pasando en LINK y con qué actor continúo?

Cada panel LINKDOT responde:

> ¿Quién soy, qué recibo, qué hago, qué entrego y qué tengo entre manos?

Los detalles técnicos quedan disponibles para auditoría y diagnóstico, pero dejan de dominar la experiencia diaria.
