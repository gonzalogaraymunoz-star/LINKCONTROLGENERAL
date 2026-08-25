# Plan de identidad y autorización

## Regla
Nunca confiar en un nombre, Gmail o `client_id` enviado por el modelo como prueba de identidad. La identidad se valida en el servidor.

## Objetivo de producto
Cada Control de negocio puede ser utilizado desde el ChatGPT del cliente, pero el usuario solo ve y opera el `scope` que LINK CONTROL CENTRAL le concedió.

## Fase 1 — Web
- Supabase Auth para login del dashboard.
- Google puede ser proveedor de login para la cuenta del cliente.
- `actors.auth_user_id` enlaza la identidad autenticada con el modelo LINK.
- `control_memberships` define rol y permisos.
- RLS filtra por `control_id`.

## Fase 2 — MCP privado
Antes de exponer datos reales en `/mcp`:
1. implementar OAuth 2.1 / Protected Resource Metadata compatible con MCP;
2. mapear el usuario autenticado a `actors`;
3. resolver sus `control_memberships`;
4. construir el scope en servidor;
5. aplicar policy por herramienta;
6. usar credenciales de servicio solo detrás de esa autorización;
7. registrar cada write en `events`.

## LINK CONTROL CENTRAL como usuario de sistema
Cada Control reconoce una identidad `system` de LINK CONTROL CENTRAL. Esa identidad permite supervisión técnica y operaciones autorizadas entre controles, pero no debe convertirse en una contraseña compartida.

## Gmail del cliente
El Gmail sirve como identidad humana y puede usarse para onboarding/login. La autorización efectiva pertenece al registro `actor + membership + permissions`, no al texto del correo ni a lo que ChatGPT diga sobre el usuario.

## Estado del repo v0.1
- Dashboard: demo, listo para Auth/RLS.
- MCP: Streamable HTTP real, herramientas read-only sobre datos demo.
- Writes MCP: simulados.
- Datos privados MCP: bloqueados hasta completar esta fase.
