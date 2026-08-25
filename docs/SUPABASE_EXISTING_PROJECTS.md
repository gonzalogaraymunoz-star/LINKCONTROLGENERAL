# Supabase — arquitectura real de los dos proyectos existentes

## Decisión v0.2
No se borra ninguno y no se crea un tercer proyecto.

### Proyecto 1 — LINK PREVIEW
**Nuevo rol:** `LINK CONTROL CENTRAL / Central Data Plane`.

Conserva todo lo existente:
- `clients`
- `projects`
- `client_profiles`
- `requests`
- `project_briefs`
- `commitments`
- `deliverables`
- `design_previews`
- `design_versions`
- `previews`
- `preview_versions`
- `generation_files`
- `agent_sessions`
- `agent_messages`
- `agent_memories`
- `activity_log`
- integraciones y referencias actuales.

La migration `0001_upgrade_link_preview_to_control.sql` **evoluciona estas tablas en lugar de reemplazarlas**.

Se agregan alrededor:
- árbol `controls`;
- `actors` y `control_memberships`;
- `needs`;
- `products`;
- `client_cycles` con las 6 etapas LINK;
- `work_items` (acción / tarea / gesto);
- `folders`;
- `artifacts`;
- `intelligence`;
- `gateways` + `control_gateways`;
- `stage_transitions`;
- `events`.

`agent_memories` se mantiene como memoria local/proyecto y recibe `control_id`, `scope`, evidencia, confianza y estado de promoción.

### Proyecto 2 — gonzalogaraymunoz-star's Project
**Rol:** `Operational Data Plane`.

Se conserva como sistema especializado para información operacional existente: turismo, Hotel Experience, reservas, leads, proveedores, servicios, pagos, comisiones, políticas, postventa y reconciliación.

LINK CONTROL CENTRAL no copia indiscriminadamente esa base. La consulta a través de un **Gateway operacional con scope** y solo registra en Central lo que corresponda a CRM transversal, eventos, artifacts o inteligencia aprobada.

## Regla de costo cero
Los nuevos negocios y clientes **NO crean un Supabase nuevo**.

```text
LINK PREVIEW / CENTRAL
  controls
    root
    link_empresa
    lama
    hotel_experience
    link_cupones
    cliente_x
    cliente_y
```

La separación ocurre mediante `control_id + memberships + RLS`.

## Aplicación de migrations
1. Conectar Supabase CLI al proyecto **LINK PREVIEW**.
2. Aplicar `0001_upgrade_link_preview_to_control.sql`.
3. Verificar que Preview Studio sigue operativo.
4. Crear/authenticar el actor humano root.
5. Recién después aplicar `0002_harden_existing_rls_after_auth.sql`.

La segunda migration reemplaza las políticas antiguas de "cualquier app_member activo puede leer" por políticas por `control_id` para las tablas sensibles.

## Regla de archivos pesados
Postgres guarda metadatos y referencias. Imágenes, videos, builds y archivos pesados deben vivir preferentemente en Storage / Cloudinary / Drive / Vercel según el tipo, y `artifacts` conserva el puntero.
