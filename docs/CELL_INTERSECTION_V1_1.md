# LINK · Contrato celular v1.1

**Estado:** especificación en GitHub, pendiente de instalación/verificación integral. No equiparar `ready` con una integración activa.

## Constitución
- Un objeto, un dueño de verdad: `ecosystem_entities` da identidad; cada dominio conserva su registro canónico.
- No duplicar el registro de identidades ni de gestos: `command_bus.gesture_code` correlaciona resultados en `event_bus`. Eventos legados sin comando conservan su código nulo.
- Barrio guarda estudios y propuestas, jamás crea directamente una realidad en LINK WORLD.
- Control Central observa y aprueba; no reescribe productos, precios ni clientes de otra aplicación.
- La exposición pública de LINK WORLD no autoriza exponer datos privados de Barrio, Factory, proveedores, contratos o personas.
- Una acción visible requiere validación, persistencia, resultado, trazabilidad y comprobación tras recarga; nada ficticio.

## Contrato de cada organelo

| Organelo | Entrada (mínima) | Salida verificable | Fuente dueña |
|---|---|---|---|
| Núcleo | global_id, dominio propietario, registro canónico, constitución | identidad inmutable, propietario, versión | ecosystem_entities / ecosystem_cells |
| Membrana | actor, acción, scope, permisos | decisión autorizada/denegada y motivo | RLS/gateway autorizado |
| Receptores | proveedor, external_id, dato y evidencia | señal candidata con procedencia y deduplicación | gateway externo |
| Citoesqueleto | dos global_id y relación tipada | arista con estado, evidencia y gesto | entity_relations |
| Mitocondria | adquisición pactada, responsabilidad LINK, costos y reparto | viabilidad o bloqueo motivado | link_world_products |
| Ribosoma | brief aprobado, proyecto, gesto | activo o sistema versionado | Factory |
| Retículo | gesto, responsable, secuencia, vencimiento | tarea y resultado persistidos | sistema operativo propietario |
| Golgi | producto, convenio y canal permitido | oferta, atribución y consumo | dominio comercial |
| Memoria | fuente, entidad, hechos clasificados | antecedente referenciable | memoria, no sustituye dato real |
| Inteligencia | snapshot, evidencia, pregunta | hallazgo clasificado u oportunidad | study_* (Barrio) |
| Señalización | consecuencia real, global_id, dedupe, gesture_code si existe | evento único y auditable | event_bus |
| Transporte | action_key, actor, global_id, idempotencia, aprobación | comando y estado | command_bus |

## Estado real auditado
Supabase ya contiene `ecosystem_domains`, `ecosystem_entity_types`, `ecosystem_entities`, `ecosystem_cells`, `ecosystem_organelle_types`, `ecosystem_cell_organelle_bindings`, `command_bus`, `event_bus` y `entity_relations`. LINK Cupones tiene una entidad global, célula y 12 bindings. Algunos bindings están `ready`, no `active`. La salud declarada es `unknown`. Se pudo persistir el contrato de `nucleus`; los demás contratos están **especificados aquí, no instalados en SQL** porque los intentos posteriores quedaron bloqueados.

## Promoción

`study_opportunities` → solicitud con gesto → aprobación → escritura por LINK WORLD → relación `promoted_to` → evento con el gesto correspondiente. No unir por nombre ni promover automáticamente.

## Observabilidad

El observatorio público de Control Central solo debe proyectar negocios `public_workspace=true`, identidad no sensible, estado declarado y conteos de organelos separados por `active` / `ready`. No debe exponer configuración privada, estudios, evidencias ni economía confidencial sin autorización.

**Puerta de producción:** probar una mutación completa, su gesto, su evento, su relación y su reflejo en Control Central. Los contratos son especificación hasta que exista esa prueba.
