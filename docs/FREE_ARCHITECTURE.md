# Estrategia de infraestructura gratuita

## Objetivo
Mantener el núcleo del ecosistema sin costo fijo mientras el volumen permanezca dentro de los límites de los planes gratuitos de cada proveedor.

## Principio
**Compartir infraestructura; aislar por identidad y scope.**

No se replica una base de datos por cliente. Se replica el contrato lógico del Control:

`control → membership → scope → RLS → gateway → event`.

## Supabase
Se usan los dos proyectos Free ya existentes:

1. **LINK PREVIEW → LINK CONTROL CENTRAL**: datos transversales, CRM, memoria, inteligencia, Preview Studio y artifacts.
2. **Proyecto operacional existente**: Hotel Experience / turismo / operación.

Nuevos controles se crean como filas en `controls`, no como proyectos Supabase.

## GitHub
Un repo principal para LINK CONTROL. Los productos que necesiten código independiente pueden tener repo propio, pero Central registra la relación mediante Gateway / `project_integrations`.

## Vercel
Una aplicación multi-scope puede servir:
- `/` → Central;
- `/c/link_empresa` → panel LINK Empresa;
- `/c/lama` → panel Lama;
- `/mcp` → Central MCP;
- `/c/lama/mcp` → MCP scoped de Lama.

Esto evita crear un deployment separado únicamente para dar una vista distinta.

## Media
No almacenar archivos binarios grandes dentro de Postgres como regla general. Usar almacenamiento adecuado y guardar referencias en `artifacts`.

## Escalamiento
Cuando una cuota gratuita se vuelva realmente insuficiente, se escala el componente que lo necesita. La arquitectura no debe obligar a pagar antes de tener uso real.
