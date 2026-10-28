---
name: link-pixel
description: Guía de auditoría e instrumentación consentida de proveedores de analítica dentro de LINK Commerce.
---
# LINK PIXEL · habilidad en el repositorio

La presencia de este archivo NO instala la habilidad automáticamente en ChatGPT.

Antes de operar:
1. Leer docs/LINK_PIXEL_IMPLEMENTACION_V1.md y docs/CONSTITUTION.md.
2. Resolver empresa/negocio, website y dominio canónico, propietario, fuente de verdad y permisos.
3. Inspeccionar estados reales de LINK Commerce y LINK RRSS; no abrir, reproducir ni exponer secretos.
4. Distinguir Meta Pixel, Meta Ads, Zernio Ads y Google Analytics: son diferentes permisos.
5. Comprobar consentimiento y CMP antes de instalar y emitir píxeles.
6. Utilizar sólo una vía de emisión por destino, con deduplicación event_id si se añade CAPI.
7. Contrastar lo que llega al receptor y lo que se persiste; no declarar venta por un clic.
8. Respetar RLS multicliente, scopes, trazabilidad y no fake UI.

Reportar el estado separado: diseñado; codificado; pruebas locales; conexión autorizada; probado en proveedor; desplegado.
No publicar pantallas ficticias, no introducir tokens en clientes públicos, no cambiar webs sin autorización.
