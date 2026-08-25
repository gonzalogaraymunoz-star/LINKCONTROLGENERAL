# Reglas de memoria e inteligencia v0.2

## Regla madre
El Central no guarda todo. Guarda lo necesario para operar y aquello que mejora la forma de crear, controlar y evolucionar otros proyectos.

## Implementación sobre LINK PREVIEW
No se crea una segunda tabla paralela para copiar la memoria existente.

`public.agent_memories` continúa como memoria local/proyecto canónica y se amplía con:
- `control_id`;
- `scope = local | candidate | central`;
- `evidence_refs`;
- `confidence`;
- `status`;
- `promoted_at`;
- `approved_by_actor_id`.

## Capas
### 1. Dato
Hecho verificable: pago, cliente, tarea, fecha, artifact, deployment, lead.

### 2. Memoria local
Contexto útil de un negocio o cliente: decisión, preferencia, instrucción, resumen, antecedente.

### 3. Inteligencia
Observación derivada con evidencia, alcance y confianza. Vive en `public.intelligence`.

### 4. Memoria central
Una memoria existente cambia de scope a `central` únicamente después de revisión autorizada. No se promueve una conversación completa ni se elimina su fuente.

## Flujo
Evento / conversación / resultado → extracción → dato / memoria / ruido → `agent_memories(local)` → análisis → `intelligence` → candidato → revisión → promoción central.

## Prohibiciones
- No copiar conversaciones completas a memoria maestra.
- No permitir promoción central automática desde un ChatGPT cliente.
- No borrar la fuente de un aprendizaje.
- No copiar la base operacional de turismo al Central “por si acaso”.
- No mezclar archivos pesados con memoria textual; `artifacts` guarda referencias.
