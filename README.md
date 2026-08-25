# LINK CONTROL CENTRAL

## Regla principal — NO FAKE UI

**Si una función no ejecuta su trabajo real de principio a fin, no aparece en la interfaz.**

Esto significa:

- no mostrar datos inventados como si fueran reales;
- no mostrar estados de conexión simulados;
- no publicar botones que solo hagan `alert`, cambien el DOM o guarden en `localStorage` cuando la acción debería persistirse;
- no publicar un panel futuro hasta que tenga fuente de verdad, permisos, persistencia y resultado verificable;
- si el backend no está conectado, la app debe decirlo claramente y no rellenar la pantalla con mocks.

Contrato mínimo de una funcionalidad visible:

`entrada real → validación → ejecución → persistencia → actualización de interfaz → evento/auditoría cuando corresponda`

## v0.3 — Operational Core

La app se reduce temporalmente a cuatro superficies que pueden trabajar con el backend real:

1. **Clientes** — necesidad, producto, etapa, acciones, tareas y gestos.
2. **Trabajo** — Kanban calculado desde ciclos y `work_items` reales.
3. **Calendario** — solo trabajo con `due_at` real.
4. **Actividad** — eventos reales del backend.

Las capacidades futuras — Gateways, Infraestructura, Controles hijos, Inteligencia, Productos, Explorador y ChatGPT integrado — permanecen en arquitectura y documentación, pero **no vuelven a la UI hasta completar su conexión real**.

## Backend central

Proyecto Supabase central existente:

`https://zgbnjlrxzvzpigmwidsp.supabase.co`

Tablas operacionales actuales:

- `clients`
- `needs`
- `products`
- `client_cycles`
- `work_items`
- `events`

API de la app:

- `GET /api/central` — lee estado operacional real.
- `POST /api/central` — crea/actualiza clientes, ciclos, necesidades, productos y trabajo.

## Arquitectura gratuita

Se conservan dos proyectos Supabase Free:

1. **LINK CONTROL CENTRAL** — CRM, controles/scopes, memoria, Preview Studio, inteligencia, artifacts y Event Bus.
2. **Operational Data Plane** — Hotel Experience/turismo, reservas, proveedores, servicios, pagos, comisiones, políticas y postventa.

Los nuevos negocios/clientes no requieren otro proyecto Supabase: se modelan mediante `control_id + membership + RLS` cuando el aislamiento multi-tenant esté implementado y verificado.

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase JS
- Vercel
- GitHub como fuente de verdad

## Desarrollo

```bash
cp .env.example .env.local
npm install
npm run dev
```

La `SUPABASE_SERVICE_ROLE_KEY` solo vive en servidor/Vercel. Nunca debe llegar al navegador ni al repositorio.

## Constitución

Lee `docs/CONSTITUTION.md`. La regla **No Fake UI** forma parte de la Constitución Técnica desde v1.1.

## Próxima prioridad

No agregar otra pantalla. Primero verificar en producción:

1. carga real de `/api/central`;
2. crear cliente y ciclo;
3. editar necesidad/producto/hito;
4. crear acción/tarea/gesto;
5. completar trabajo y recalcular progreso;
6. avanzar etapa;
7. ver el evento real en Actividad.

Solo después de que ese recorrido funcione de extremo a extremo se habilita la siguiente capacidad.
