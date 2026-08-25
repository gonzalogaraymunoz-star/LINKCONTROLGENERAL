# Centro de Acciones — LINK CONTROL CENTRAL

## Objetivo

Convertir LINK CONTROL CENTRAL en una superficie de mando con botones que ejecutan acciones reales a través de Gateways gobernados. Un botón no representa una idea futura: representa una capacidad verificable.

## Contrato de un botón

Todo botón visible debe cumplir:

`clic → contexto de actor/scope → política → adaptador real → resultado → auditoría → respuesta UI`

Si falla la configuración, autorización, fuente de verdad o auditoría, la acción no se publica como botón.

## Acciones v1

### Atención
- `central.attention`
- Lee `work_items` reales.
- Devuelve vencidos y próximos a 48 horas.
- Registra `gateway.action` en `events`.

### Supabase Central
- `supabase.central.health`
- Consulta real contra `clients`.
- Informa latencia y cantidad de registros.
- Registra auditoría.

### Operational Data Plane
- `supabase.operational.health`
- Comprueba el endpoint PostgREST del segundo proyecto Supabase.
- Solo aparece si existen URL y service role en entorno servidor.

### GitHub
- `github.repo.health`
- Consulta el repositorio configurado mediante GitHub REST API.
- Puede operar en lectura pública sin token; `LINK_GITHUB_TOKEN` queda reservado para futuras acciones autenticadas.
- Nunca se escribe en GitHub desde esta UI hasta existir autenticación administrativa de usuario.

### Vercel
- `vercel.project.health`
- Consulta el proyecto real por API.
- Solo aparece con `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`.

## Capacidades deliberadamente no publicadas aún

No deben aparecer como botones hasta disponer de fuente, permisos y persistencia real:

- Gmail / personas y conversaciones.
- Google Calendar / creación o edición de eventos.
- Meta / adquisición y contenido.
- Movimientos financieros y cobros.
- Notificaciones salientes.
- Escrituras GitHub o Vercel desde navegador.
- Cambios de políticas o infraestructura raíz.

Estas capacidades se incorporan como nuevos adaptadores sin modificar el núcleo del Gateway.

## Seguridad

1. Secrets solo en variables de entorno del servidor.
2. Ninguna service role llega al navegador.
3. Las acciones v1 son de lectura/verificación.
4. Toda acción publicada requiere que Supabase Central esté disponible para auditoría.
5. Las escrituras externas requieren una futura capa de autenticación administrativa antes de habilitar botones.

## Cómo agregar un nuevo botón

1. Crear un adaptador real en `lib/gateway/adapters.ts`.
2. Declarar su capability y condición de disponibilidad.
3. Pasar por `authorizeGatewayAction`.
4. Ejecutar con timeout y manejo explícito de error.
5. Persistir evento de auditoría.
6. Recién entonces la UI lo mostrará automáticamente como acción disponible.
