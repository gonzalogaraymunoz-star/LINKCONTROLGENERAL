# LINK Commerce Worker

Esta carpeta contiene el código completo de `link-commerce`, cuyo despliegue vive en Cloudflare y no proviene actualmente de este repositorio. Las versiones aquí preservadas permiten revisión y rollback. **No confundir código GitHub con despliegue realizado.**

LINK Pixel añade una pantalla administrativa en `/pixel` y APIs autenticadas con Supabase. RLS verifica `app_members` dueño/administrador. Las credenciales de marketing no se almacenan en esta aplicación. No hay seguimiento de visitantes ni envíos a Meta/Google en el panel administrativo.
