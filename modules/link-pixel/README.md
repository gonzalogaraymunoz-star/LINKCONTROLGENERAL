# LINK Pixel · adaptador web (piloto sin despliegue)

Contrato de eventos que sólo despacha con consentimiento publicitario explícito. **No instala Meta, no configura Zaraz ni guarda métricas**. Las acciones Zaraz no se incluyen todavía: un especialista autorizado debe mapear link_pixel_page_view, link_pixel_view_item, link_pixel_whatsapp_click y link_pixel_begin_checkout a las herramientas correctas. No inferir venta de un clic.

Ejecutar pruebas: node --test modules/link-pixel/link-pixel.test.mjs

Uso futuro desde una website autorizada: importar createWebEvent y sendMarketingEvent de link-pixel.mjs; crear el evento con businessId y siteId canónicos, nombre allowlisted, ruta pública y campaña UTM sin PII; llamar sendMarketingEvent(event, { marketingConsent: CMP.marketing === true, zaraz: window.zaraz }). La respuesta queued=true significa llamada local, NO recepción verificada por Meta.

El gateway propio debe validar que businessId + siteId + origen pertenecen al mismo sitio; las conversiones confirmadas sólo vienen desde el backend operativo. Documento: docs/LINK_PIXEL_IMPLEMENTACION_V1.md.
