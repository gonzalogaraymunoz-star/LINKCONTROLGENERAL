# LINK CONTROL — Protocolo de conexión con ChatGPT

## Objetivo
Conectar cada Control de LINK con ChatGPT sin exponer credenciales de Supabase y respetando el scope del cliente.

## Flujo

```text
ChatGPT
  ↓
Usuario autenticado
  ↓
Membership / permisos
  ↓
LINK MCP remoto HTTPS
  ↓
Scope
  ↓
Supabase LINK CONTROL CENTRAL
  ↓
Datos / trabajo / eventos
```

## Endpoints
- Central: `/mcp`
- Cliente: `/c/<client-slug>/mcp`

Las rutas están protegidas. La URL de acceso privada no debe publicarse ni generarse para usuarios no autenticados.

## Herramientas MCP actuales — lectura real
- `get_scope`
- `health`
- `search_clients`
- `get_client_360`
- `list_work_items`
- `list_activity`

## Orden de conexión
1. Autenticar al usuario de LINK CONTROL.
2. Resolver su `control_id` / scope autorizado.
3. Emitir acceso MCP privado para ese scope.
4. En ChatGPT compatible con apps MCP personalizadas, habilitar Developer Mode.
5. Crear la app personalizada y registrar la URL HTTPS autorizada.
6. Analizar/actualizar herramientas.
7. Probar `get_scope`.
8. Probar `health`.
9. Probar lectura con `search_clients` / `get_client_360`.
10. Habilitar escritura solo después de OAuth/autorización por usuario y scope.

## Regla de escritura
Nunca conectar ChatGPT directamente con `SUPABASE_SERVICE_ROLE_KEY`.

Toda escritura debe seguir:

```text
ChatGPT → Auth → Policy → MCP tool → API/Gateway → Supabase → Event
```

Herramientas de escritura previstas:
- `create_gesture`
- `create_task`
- `complete_work_item`
- `update_need`
- `update_product`
- `update_strategy`
- `move_stage`
- `schedule_work`

No se publicará ninguna herramienta hasta que ejecute la operación real y deje trazabilidad en `events`.

## Estado actual
- Supabase real: listo.
- MCP remoto: listo.
- Scopes por cliente: listos.
- Lectura MCP: implementada, protegida.
- Login/autorización de usuario: pendiente.
- Escritura desde ChatGPT: bloqueada hasta autorización.

## Regla de producto
Si una capacidad no funciona extremo a extremo, no se presenta como activa en LINK CONTROL.
