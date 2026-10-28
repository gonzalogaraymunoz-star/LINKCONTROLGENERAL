# LINK Pixel · adaptador web (piloto sin despliegue)

Contrato de eventos que sólo despacha con consentimiento publicitario explícito. **No instala Meta, no configura Zaraz ni guarda métricas**. Las acciones Zaraz no se incluyen todavía: un especialista autorizado debe mapear link_pixel_page_view, link_pixel_view_item, link_pixel_whatsapp_click y link_pixel_begin_checkout a las herramientas correctas. No inferir venta de un clic.

Ejecutar pruebas: node --test modules/link-pixel/link-pixel.test.mjs

Uso futuro desde una website autorizada: importar createWebEvent y sendMarketingEvent de link-pixel.mjs; crear el evento con businessId y siteId canónicos, nombre allowlisted, ruta pública y campaña UTM sin PII; llamar sendMarketingEvent(event, { marketingConsent: CMP.marketing === true, zaraz: window.zaraz }). La respuesta queued=true significa llamada local, NO recepción verificada por Meta.

El gateway propio debe validar que businessId + siteId + origen pertenecen al mismo sitio; las conversiones confirmadas sólo vienen desde el backend operativo. Documento: docs/LINK_PIXEL_IMPLEMENTACION_V1.md.

## Registro por negocio (fase 2: propuesta, sin migración)

Archivo registry.mjs: validación determinista del plan negocio → cuenta analítica → activo → website. Requiere que los datos provengan de un backend autorizado que consulte registros canónicos; no se puede confiar en IDs enviados por el navegador. planSiteBinding nunca activa ni verifica una etiqueta: solo devuelve estado proposed.

Permite reutilizar el mismo Meta Pixel en distintas websites del mismo negocio, pero rechaza asociación de activos de otro negocio, perfiles de proveedor incorrectos, websites de referencia y una segunda instalación del mismo activo en la misma website. Evita doble etiquetado por vía directa y Zaraz.

La estructura de tablas potenciales está en docs/LINK_PIXEL_REGISTRY_SQL_DRAFT.sql. Es un borrador de diseño, NO una migración ejecutada. Está en schema privado, RLS activado y sin acceso cliente. No desplegar ni fusionar hasta definir autorización por negocio, backend y pruebas de aislamiento.

Pruebas locales: node --test modules/link-pixel/registry.test.mjs (12 casos aprobados en el entorno de preparación).
