# LINK CONTROL CENTRAL

## Misión
LINK CONTROL CENTRAL es el **molde maestro y autoridad raíz para crear y gobernar Sistemas Operativos de Negocio**. Cada cliente recibe un Centro de Control subordinado que hereda el núcleo y especializa módulos, procesos, datos y permisos.

## Regla principal — NO FAKE UI
**Si una función no ejecuta su trabajo real de principio a fin, no aparece en la interfaz.**

Contrato mínimo:
`entrada real → validación → ejecución → persistencia → actualización de interfaz → evento/auditoría cuando corresponda`

## Fuentes de verdad
La arquitectura usa autoridad por dominio, no una única fuente para todo:

- **Supabase** — estado operacional, memoria estructurada, relaciones, permisos, configuración, eventos y referencias.
- **GitHub** — código, arquitectura, documentación técnica y versiones.
- **Google Drive** — archivos originales y documentos humanos.
- **Vercel** — ejecución y despliegue web.
- **ChatGPT** — interfaz de inteligencia y operación sobre las fuentes persistentes.

Supabase relaciona las demás fuentes mediante IDs y metadatos; no reemplaza GitHub, Drive ni Vercel.

## Operational Core actual
La UI de producción mantiene solo superficies conectadas al backend real:
1. **Clientes** — necesidad, producto, etapa, acciones, tareas y gestos.
2. **Trabajo** — Kanban desde ciclos y `work_items` reales.
3. **Calendario** — trabajo con `due_at` real.
4. **Actividad** — eventos reales del backend.

Las capacidades de fábrica — onboarding guiado, Drive gobernado, índice de Controles, memoria avanzada, módulos e integraciones — se implementan primero en backend y documentación. Solo entran a UI cuando cumplen No Fake UI.

## Backend central
Supabase central: `https://zgbnjlrxzvzpigmwidsp.supabase.co`

Tablas operacionales actuales:
- `clients`
- `needs`
- `products`
- `client_cycles`
- `work_items`
- `events`

API actual:
- `GET /api/central` — lee estado operacional real.
- `POST /api/central` — crea/actualiza clientes, ciclos, necesidades, productos y trabajo.

## Modelo de fábrica
Pipeline oficial:
`captado → entrevista → aprobado → identidad creada → conexiones → centro instalado → memoria inicializada → primer producto → personalización → pruebas → entregado → evolución`

Cada cliente debe poder resolver su `control_id`, scope, cuenta/identidad, proyecto ChatGPT, GitHub, Supabase, Vercel, Drive, archivo maestro `.md`, módulos, permisos y endpoint MCP cuando esas conexiones estén instaladas.

Consulta `docs/CLIENT_CONTROL_STANDARD.md` para el manual arquitectónico de incorporación.

## Arquitectura Supabase
Se conservan dos proyectos Supabase Free:
1. **LINK CONTROL CENTRAL** — CRM, controles/scopes, memoria, Preview Studio, inteligencia, artifacts y Event Bus.
2. **Operational Data Plane** — Hotel Experience/turismo, reservas, proveedores, servicios, pagos, comisiones, políticas y postventa.

Los nuevos negocios se modelan mediante `control_id + membership + RLS` cuando el aislamiento multi-tenant esté implementado y verificado. Un proyecto Supabase independiente solo se justifica cuando exista una necesidad real de aislamiento, escala o propiedad del cliente.

## ChatGPT / MCP
Dashboard y ChatGPT deben ser dos interfaces sobre la misma lógica de dominio. Ninguna función crítica existe únicamente como botón: la operación backend es reutilizable y, cuando corresponde, se expone como tool MCP con scope y permisos.

## Stack
- Next.js 16
- React 19
- TypeScript
- Supabase JS
- Vercel
- GitHub

## Desarrollo
```bash
cp .env.example .env.local
npm install
npm run dev
```

La `SUPABASE_SERVICE_ROLE_KEY` solo vive en servidor/Vercel. Nunca llega al navegador ni al repositorio.

## Constitución
Lee `docs/CONSTITUTION.md` y `docs/CLIENT_CONTROL_STANDARD.md`.

## Próxima prioridad
No agregar pantallas decorativas. Primero verificar el recorrido operacional existente de punta a punta. Después, la siguiente capacidad a implementar es **Onboarding de Cliente**, comenzando por persistencia de identidad, conexiones y estado de instalación; solo entonces se publica su interfaz guiada.
