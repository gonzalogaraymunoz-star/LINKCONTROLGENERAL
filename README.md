# LINK CONTROL CENTRAL

**v0.2 — primer commit recomendado**

Centro de control multi-negocio para gobernar CRM, memoria, inteligencia, artifacts, tareas, gestos, calendario, infraestructura y conexiones ChatGPT/MCP del ecosistema LINK.

## Decisión de arquitectura real
Este repo **NO requiere crear un Supabase nuevo**.

Se aprovechan los dos proyectos Free que ya existen:

1. **LINK PREVIEW → LINK CONTROL CENTRAL**  
   Central Data Plane: controls/scopes, CRM, Preview Studio, memoria, inteligencia, artifacts, Event Bus y permisos.
2. **gonzalogaraymunoz-star's Project → Operational Data Plane**  
   Operación especializada: Hotel Experience/turismo, reservas, proveedores, servicios, pagos, comisiones, políticas y postventa.

Los nuevos negocios/clientes **no crean un proyecto Supabase por cabeza**. Se crean como `controls` con `control_id + membership + RLS` dentro de LINK PREVIEW.

Lee primero:
- `docs/SUPABASE_EXISTING_PROJECTS.md`
- `docs/FREE_ARCHITECTURE.md`
- `docs/CONSTITUTION.md`
- `docs/STRATEGY.md`

## Qué conserva de LINK PREVIEW
La migration v0.2 es **aditiva**. No reemplaza:

- `clients`
- `projects`
- `design_previews`
- `previews`
- `agent_sessions`
- `agent_messages`
- `agent_memories`
- `requests`
- `commitments`
- `deliverables`
- `activity_log`
- ni el resto de la estructura actual de Preview Studio.

`agent_memories` pasa a ser la memoria local/proyecto canónica y recibe `control_id`, scope, evidencia, confianza y estado de promoción.

## Stack
- Next.js 16
- React 19
- TypeScript
- Supabase JS
- MCP (`mcp-handler`)
- Vercel
- GitHub como fuente de verdad

> Node.js 22+.

## Arranque local
```bash
cp .env.example .env.local
npm install
npm run dev
```

Sin credenciales funciona en modo demo.

## Primer commit
```bash
git init
git add .
git commit -m "feat: bootstrap LINK CONTROL CENTRAL v0.2"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/link-control-central.git
git push -u origin main
```

## Deploy en Vercel
1. Importa el repo.
2. Next.js se detecta automáticamente.
3. Deploy inicial sin variables: modo demo.
4. Luego configura las variables de `.env.example` para **LINK PREVIEW** como Central.
5. El Supabase operacional se configura solo cuando implementemos su Gateway server-side.

## Supabase — orden correcto
### Fase A: evolucionar LINK PREVIEW
Conecta Supabase CLI al proyecto **LINK PREVIEW** y aplica:

```text
supabase/migrations/0001_upgrade_link_preview_to_control.sql
```

Esta migration:
- crea el árbol `controls`;
- añade `control_id` a las entidades centrales existentes;
- conserva Preview Studio;
- evoluciona `agent_memories`;
- agrega Need/Product/6 etapas/Work Items;
- agrega Explorer/Artifacts;
- agrega Intelligence/Gateways/Event Bus.

### Fase B: Auth antes de aislar clientes
Después:
1. autentica al administrador root;
2. crea `actor` + `control_membership=root_admin`;
3. verifica acceso;
4. aplica:

```text
supabase/migrations/0002_harden_existing_rls_after_auth.sql
```

**No ejecutes 0002 antes de tener el root humano configurado.**

## ChatGPT / MCP
- Central: `/mcp`
- Control hijo: `/c/[scope]/mcp`
- Panel hijo: `/c/[scope]`

Ejemplos:
- `/c/link_empresa/mcp`
- `/c/lama/mcp`
- `/c/hotel_experience/mcp`
- `/c/link_cupones/mcp`

La URL aporta el scope inicial; **no sustituye autenticación**.

## Principio técnico
Toda acción externa resuelve:

`identidad → control → scope → política → gateway → ejecución → evento`.

ChatGPT, GitHub, Vercel, Google, Supabase operacional y partners son adaptadores alrededor del núcleo, no partes que puedan reescribirlo.

## Carpetas clave
```text
app/                    UI + rutas API/MCP
components/             Workspace LINK CONTROL
lib/crm/                6 etapas LINK
lib/gateway/            políticas + eventos
lib/memory/             reglas de memoria
lib/supabase/           Central + Operational clients
supabase/migrations/    upgrade aditivo + hardening RLS
docs/                   Constitución y estrategia
```

## Validación
```bash
npm run validate:repo
npm run typecheck
npm run build
```

## Próximo commit después del bootstrap
No agregar más pantallas todavía. El siguiente commit debe conectar **LINK PREVIEW real en modo lectura** y verificar:
- controls;
- clients;
- projects;
- agent_memories;
- design_previews;
- artifacts;
- health.
