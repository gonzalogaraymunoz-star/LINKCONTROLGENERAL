# LINK PIXEL · ESTADO DE EJECUCIÓN · 2026-10-27

## Completado realmente
- Inspeccionados repositorios existentes, Cloudflare LINK Commerce y LINK RRSS, permisos Zernio y Supabase.
- Migración `link_pixel_registry` aplicada satisfactoriamente a Supabase Central (`zgbnjlrxzvzpigmwidsp`).
- Tabla `public.link_pixel_connections`: RLS activo; ANON sin SELECT; políticas owner/admin SELECT, INSERT, UPDATE; 0 conexiones, 0 datos inventados.
- Código preparado para el Worker Cloudflare `link-commerce` en `workers/link-commerce/link-commerce-pixel-v1.mjs`: pantalla `/pixel`, GET/POST/PATCH administrados con JWT y RLS, sin instalación automática de tags.
- Copia exacta previa del Worker en `workers/link-commerce/link-commerce-backup-20261027.mjs` (respaldo).
- Contrato de eventos y tests bajo `modules/link-pixel`; habilidad inicial bajo `.agents/skills/link-pixel`.

## Bloqueadores reales
- Publicación de Worker Cloudflare **NO ejecutada**. Intento de upload preview por el conector rechazado por controles de seguridad de OpenAI; no se hizo segundo despliegue. Commerce sigue como estaba.
- Cloudflare account autorizada tiene 21 Workers pero **0 zonas de dominios propias**. Zaraz por zona requiere un dominio incorporado correctamente; la app `workers.dev` no implica automáticamente que Zaraz se encuentre activo.
- Vercel para `linkcontrolgeneral` marca TODOS los despliegues recientes como **BLOCKED** (comprobado). GitHub impone estado Vercel exitoso antes de merge y responde HTTP 405 `Required status check "Vercel" is failing`. **PR 56 sigue abierto, no fusionado**. No alterar protección de rama ni declarar CI exitoso.
- No hemos autorizado Meta Business/Ads, Pixel/dataset, GA4 ni acceso a Zernio Tracking Tags de Meta Ads. No hay eventos en esas plataformas, ni pixels instalados.

## Próximo orden
1. Resolver estado BLOCKED del proyecto Vercel `linkcontrolgeneral` en cuenta `gonzalogaraymunoz-8382s-projects`; una vez check pase, fusionar PR. Este bloqueo no proviene necesariamente del código.
2. Para desplegar la interfaz de LINK Pixel en Commerce, cargar la versión `workers/link-commerce/link-commerce-pixel-v1.mjs` a Cloudflare tras revisión y prueba previa (o restaurar backup si falla). Mantener variables públicas Supabase existentes; no incluir credenciales secretas en scripts.
3. Probar login owner/admin, GET vacío y POST con ID público de prueba realmente autorizado, refrescar, deshabilitar, denegar ANON, y comprobar que jamás emite eventos. Sin aprobación no activar terceros.
4. Seleccionar website REAL del negocio y dominio gestionado. Añadir zona Cloudflare si se elige Zaraz y confirmar DNS/proxy sin afectar servicios.
5. Conectar Meta/GA4/Zernio Ads con consentimiento y titularidad; comprobar eventos reales en receptor y solo entonces estado verified.
6. Solo después: atribución real (RRSS→web→evento→contacto→venta), seguridad gateway e Insights.
