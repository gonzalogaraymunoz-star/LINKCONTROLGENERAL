# Estrategia de implementación v0.2

## Fase 0 — Primer commit correcto
Objetivo: congelar desde GitHub la arquitectura real que ya existe.

- LINK PREVIEW se declara Central Data Plane.
- El Supabase operacional existente se conserva intacto.
- No se crea un tercer Supabase.
- Nuevo negocio = `control + scope`, no nueva infraestructura.
- Constitución v1, IDs, 6 etapas, Acción/Tarea/Gesto, Gateway y Event Bus quedan como contrato.

## Fase 1 — Evolucionar LINK PREVIEW sin romper Preview Studio
1. Conectar el repo al proyecto Supabase **LINK PREVIEW**.
2. Aplicar `0001_upgrade_link_preview_to_control.sql`.
3. Verificar tablas originales y Preview Studio.
4. Conectar la UI primero en modo lectura.
5. Crear Auth + actor humano root + membership `root_admin`.
6. Aplicar `0002_harden_existing_rls_after_auth.sql`.

## Fase 2 — Central operativo
Con datos reales:
1. Controls.
2. Clients existentes + nuevos.
3. Need / Product.
4. Client cycle / 6 etapas.
5. Work items / acciones-tareas-gestos.
6. Calendar.
7. Folders + artifacts.
8. Control Inbox + events.
9. Intelligence review.

## Fase 3 — Gateways
- ChatGPT/MCP.
- GitHub.
- Vercel.
- Google Workspace.
- Supabase operacional existente.
- Cloudinary / media.
- Partners futuros.

## Fase 4 — Primer Control hijo
Recomendación: LINK Empresa.

El control hijo usa el mismo Supabase Central y recibe:
- `scope=link_empresa`;
- memberships;
- memoria local;
- CRM 360;
- MCP `/c/link_empresa/mcp`;
- panel `/c/link_empresa`.

## Fase 5 — Replica
Crear scopes para Lama, Hotel Experience, Cupones y clientes externos. No crear Supabase nuevos salvo que una limitación real lo justifique en el futuro.

## Métrica inicial de éxito
Central debe responder con datos reales:
1. ¿Qué necesita mi atención hoy?
2. ¿En qué etapa está cada cliente?
3. ¿Qué prometí hacer y cuándo?
4. ¿Qué produjo el sistema?
5. ¿Qué está detenido y por qué?
6. ¿Qué aprendizaje puede reutilizarse?
7. ¿Qué Gateway o infraestructura tiene problemas?
