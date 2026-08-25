# Fábrica de Controles v0.2

Un nuevo Control no se diseña desde cero ni crea un Supabase nuevo. Se provisiona desde el contrato central sobre LINK PREVIEW.

## Entrada mínima
- nombre del negocio;
- slug;
- scope único;
- administrador humano autorizado;
- Gmail/cuenta que usará el ChatGPT cliente cuando corresponda.

## Provisionamiento
1. Crear Control hijo con `create_child_control`.
2. Crear actor/membership del administrador.
3. Crear carpetas base.
4. Crear Need/Product/ciclo inicial si corresponde.
5. Registrar gateways permitidos.
6. Aplicar RLS por `control_id`.
7. Registrar MCP `/c/[scope]/mcp`.
8. Entregar panel `/c/[scope]` al usuario autorizado.
9. Hacer health check.
10. Registrar `control.created`.

## Excepción
Solo se considera aislamiento físico con otro Supabase cuando exista una razón real de escala, regulación o separación contractual. No es la estrategia base y no se usa para replicar clientes mientras el objetivo sea mantener costo cero.

## Regla
El cliente opera su scope. LINK CONTROL CENTRAL conserva autoridad técnica y trazabilidad sin exponer memoria central ni otros negocios.
