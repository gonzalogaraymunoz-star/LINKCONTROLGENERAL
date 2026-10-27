# LINK PIXEL · Arquitectura e implementación v1
Fecha: 27 de octubre de 2026. Estado: **fundación técnica en una rama de revisión, no desplegada**.

## Ubicación y propósito
LINK WORLD → Cliente → Negocio → LINK COMMERCE → LINK PIXEL → LINK INSIGHTS.

LINK PIXEL administra por negocio sus websites, fuentes de analítica, etiquetas, identificadores no secretos, permisos y evidencias. Un mismo dataset/píxel de Meta puede asociarse con múltiples websites de un negocio, cuando es apropiado y autorizado. LINK RRSS administra publicaciones. LINK Ventas conserva las ventas y cierres como fuente de verdad.

## Flujo técnico
Publicación RRSS/Zernio → enlace etiquetado con UTM → Website registrada en Commerce → Zaraz (solo con consentimiento correspondiente) → Meta Pixel / GA4.
En paralelo: eventos comerciales verificados → gateway propio validado → Supabase → Insights. Las APIs de Meta, GA4 o Zernio Ads **consultan métricas y permisos**, pero no equivalen al píxel de la web. Enviar con Zaraz no prueba llegada a Meta ni persistencia en Supabase.

## Inventario verificado en Supabase, sin cambio
Proyecto LINK CONTROL CENTRAL zgbnjlrxzvzpigmwidsp. Existen link_commerce_sites (10 sitios: referencias y captaciones), link_commerce_rrss_links, link_commerce_attribution_events (2 registros, ambos acquisition_created), link_commerce_acquisitions (2), sales_leads, sales_events, event_bus y tablas RRSS.
LINK RRSS registra conexiones Zernio con 3 cuentas Instagram, 1 TikTok y 1 WhatsApp. No hay una cuenta metaads en ese registro local. Esto **no permite inferir** que la cuenta externa Zernio no tenga Ads; requiere inspección del proveedor.

## Zernio / Meta
La conexión normal Facebook-Instagram Zernio posibilita publicación, mensajería y analítica según scopes. El complemento Ads de Zernio permite cuentas metaads, campañas, reportes y relay de conversiones según plan y permisos. **No suponer que tokens sociales de Zernio pueden reutilizarse para Meta Pixel o Ads**.
Documentación: https://docs.zernio.com/platforms/facebook ; https://docs.zernio.com/guides/connecting-accounts ; https://docs.zernio.com/changelog

## Registro de proveedor propuesto, todavía no migrado
Referenciar business_id; site_id opcional; provider; resource_id público (Pixel ID, measurement ID, zone ID); external_owner; credential_ref *server-only*; permission_scope; domain; connection_status; last_verified_at; last_verified_evidence y error sanitizado. Estados estrictos: not_configured, awaiting_authorization, configured, verified, degraded, revoked. **Nunca almacenar tokens o claves en tablas públicas ni ponerlos en frontend.** Diseñar membresías y RLS antes de cualquier migración. El navegador puede falsificar IDs; un futuro gateway validará propiedad sitio/negocio, dominio, esquema, tasa y eventos duplicados.

## Primer contrato web, probado localmente
Adaptador en modules/link-pixel/link-pixel.mjs; eventos page_view, view_item, whatsapp_click, begin_checkout. Únicamente despacha al objeto Zaraz ya configurado cuando el llamador entrega marketingConsent=true. No carga scripts, no consulta APIs, no persiste y no confirma llegada a un proveedor. El panel no debe publicar métricas sin fuente verificable.
No permitir datos personales, formularios, queries privadas ni tokens. Una vista de producto no es una compra; un clic de WhatsApp no es un lead confirmado. La compra/lead real viene solo del backend operativo con evidencia. Compartir un event_id entre browser + CAPI si se habilita deduplicación en Meta.
Distinguir consentimiento analítico y publicitario por destino. No instalar simultáneamente Meta Pixel directo y Meta Pixel vía Zaraz para el mismo evento.

## Cloudflare
Zaraz tiene soporte oficial para Facebook Pixel y Google Analytics 4. Configuración por dominio/zona y acciones de evento. No asumir que una URL workers.dev recibe inyección Zaraz automáticamente; verificar modo dominios no proxied o loader adecuado.
https://developers.cloudflare.com/zaraz/get-started/
https://developers.cloudflare.com/zaraz/reference/supported-tools/
https://developers.cloudflare.com/zaraz/consent-management/

## Investigación repos externos
- tanukijs/meta-pixel: wrapper TypeScript MIT, client-side, React/Nuxt, múltiples píxeles y consentimiento. Referencia útil para integración DIRECTA; innecesario si usamos Zaraz como único emisor.
- facebook/facebook-nodejs-business-sdk: SDK oficial Meta Marketing/Business API, solo si es necesario consultar o remitir desde backend.
- manucaralmo/GlowCookies: banner consent JS; preferir CMP integrada a Zaraz si cubre las necesidades.
- seeden/react-facebook: componentes React; no esencial para LINK Pixel transversal.
- magepal/magento2-google-tag-manager: específica de Magento, no adecuada para nuestro stack.
No importar librerías desconocidas sin revisión de licencias, seguridad y mantenimiento.

## Implementación por fases
**A. Inventario:** confirmar website piloto REAL, dominio, negocio, titularidad, relación RRSS; distinguir vistas previas y archivos.
**B. Conexiones:** titular Meta Business/Pixel/Ads, GA4 y Cloudflare; comprobar Zernio Ads activo o no; obtener autorización sin copiar tokens en chats.
**C. Instrumentación consentida:** CMP y acciones Zaraz por destino; evento piloto en una sola web y pruebas en receptor.
**D. Datos LINK:** gateway/server validado + registro de conversiones reales en tablas existentes o migración RLS revisada, sin llenar el event_bus con clics crudos.
**E. Auditoría:** pantalla LINK Insights solo con métricas reales y fuentes, campañas/post/conversiones separadas.
Ninguna fase se declara completada por diseño o por una prueba local.

## Pendientes del administrador
Confirmar dominio y website piloto de producción; conceder permisos desde Meta/Google/Cloudflare/Zernio; verificar Ads addon si interesa; aprobar política de privacidad, CMP y despliegue. Los IDs externos, tokens y titularidad no están creados ni validados en este paquete.

Constitución aplicable: docs/CONSTITUTION.md; no fake UI, permisos y evidencia.

## Descubrimiento validado: Zernio Tracking Tags API (27-10-2026)
Documentación oficial: https://docs.zernio.com/guides/pixels

Zernio ofrece endpoint neutro por plataforma GET /v1/accounts/{accountId}/tracking-tags para **listar los Meta Pixels existentes**, leer código, diagnósticos, estadísticas, usuarios, socios y eventos, sujeto a permisos y conexión Ads. Requiere el accountId de la conexión publicitaria metaads; **NO** sirve pasar el accountId de Instagram o Facebook de publicación. Meta permite compartir píxeles con cuentas Ads si hay Business Manager propietario. Crear un píxel en Meta mediante Zernio NO es idempotente y Meta no permite eliminarlo por esa API: primero listar, comprobar titularidad, y crear solo tras aprobación. Nunca hacer reintentos ciegos de create.

Zernio puede instalar etiquetas en Shopify/WordPress/Wix/Webflow conectados; esto NO sustituye el mecanismo Zaraz para nuestros sitios Cloudflare. Registrar en LINK Pixel source_adapter=zernio_tracking_tags cuando haya metaads autorizado y evitar integrar dos veces Meta con API directa. Usar diagnósticos reales del proveedor para estado verified. El plan/Addon Ads y la autorización continúan pendientes de verificar en la cuenta externa.
