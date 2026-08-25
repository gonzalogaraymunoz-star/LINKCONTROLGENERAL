# Contrato Gateway v1.1

## Propósito
El Gateway protege al núcleo de acoplamientos directos con apps y proveedores. ChatGPT, GitHub, Vercel, Google Workspace, Cloudinary, pagos, hoteles, operadores, partners y el Supabase operacional se conectan como adaptadores.

## Flujo obligatorio
INPUT → identidad → control → scope → política → adaptador → ejecución → resultado → evento → auditoría.

## Contexto mínimo
```json
{
  "actorId": "...",
  "actorType": "human|ai|system",
  "controlId": "...",
  "scope": "...",
  "action": "...",
  "resource": "..."
}
```

## Supabase
- `supabase-central`: LINK PREVIEW, parte del Central Data Plane.
- `supabase-operational`: proyecto especializado; acceso server-side por Gateway y mínimo privilegio.

Nunca se expone el service role del proyecto operacional al navegador ni al MCP cliente.

## Acciones root-only iniciales
- `control.delete`
- `policy.change`
- `memory.central.promote`
- `gateway.root.configure`

## Regla
Una tecnología puede cambiar sin cambiar la Constitución. Se reemplaza su adaptador, no el núcleo.
