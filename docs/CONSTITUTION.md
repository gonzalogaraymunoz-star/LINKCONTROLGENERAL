# Constitución Técnica v1.2 — LINK CONTROL CENTRAL

## Propósito
LINK CONTROL CENTRAL es la autoridad raíz y el molde maestro para crear y gobernar Sistemas Operativos de Negocio. Gobierna identidades, scopes, reglas, memoria transversal, gateways y controles hijos sin absorber la operación completa de cada negocio.

## Reglas constitucionales
1. LINK CONTROL CENTRAL es la autoridad técnica raíz y el molde base; ningún Control de cliente parte desde cero.
2. El núcleo central es inmutable para controles hijos, apps, clientes, agentes y gateways.
3. Cada negocio recibe un Control propio subordinado al Central y especializado por módulos, configuración y permisos.
4. Cada Control de negocio expone una conexión/complemento para el ChatGPT autorizado de ese negocio.
5. El ChatGPT cliente solo puede operar dentro del scope concedido.
6. Toda integración externa entra por un Gateway autorizado.
7. Ninguna app hija escribe directamente en memoria maestra.
8. Datos, memoria e inteligencia son capas diferentes.
9. Toda inteligencia conserva evidencia y fuente; nunca reemplaza el dato original.
10. Toda acción relevante deja trazabilidad: actor, acción, objeto, control, tiempo y resultado.
11. Una app o alianza puede entrar o salir sin romper el núcleo ni otros controles.
12. La arquitectura se hereda; datos privados, secretos y permisos no se heredan automáticamente.
13. Las seis etapas LINK son el método transversal de gestión comercial y evolución.
14. Una etapa avanza por cumplimiento de criterios de salida, no por tiempo ni drag-and-drop.
15. El usuario final no necesita comprender la arquitectura técnica para usar el sistema.
16. **No Fake UI:** si una función no ejecuta su trabajo real de principio a fin, no se publica en la interfaz.
17. Ningún panel muestra datos inventados, estados simulados o métricas ficticias como información operacional.
18. Ningún botón se limita a `alert`, `prompt`, cambio visual temporal o `localStorage` cuando su significado implica una acción persistente.
19. Una capacidad futura puede existir en documentación o backlog, pero no en la experiencia hasta contar con fuente de verdad, permisos, persistencia y resultado verificable.
20. Cada función visible supera: **entrada real → validación → ejecución → persistencia → actualización de interfaz → evento/auditoría cuando corresponda**.
21. Una integración desconectada solo muestra estado técnico proveniente de una comprobación real.
22. **Fuentes de verdad por dominio:** Supabase gobierna estado operacional, memoria estructurada, relaciones, permisos, configuración y eventos; GitHub gobierna código y versiones; Google Drive gobierna archivos originales; Vercel gobierna ejecución/despliegue. Supabase relaciona estas fuentes mediante IDs y metadatos, no pretende sustituirlas.
23. Cada cliente posee un archivo maestro `.md` legible y versionable que describe misión, arquitectura, productos, reglas, integraciones, módulos, estado, roadmap y decisiones fundamentales. No reemplaza la memoria estructurada.
24. La memoria es histórica, acumulativa y trazable. Una decisión relevante no se pisa sin conservar historia.
25. La IA recibe contexto curado para la tarea y no obtiene por defecto tablas completas, secretos ni datos fuera de scope.
26. La estructura documental de Drive es gobernada por el sistema. Los usuarios solo operan en ubicaciones y permisos autorizados.
27. Toda función crítica debe existir como operación backend reutilizable; dashboard y ChatGPT/MCP consumen la misma lógica y producen la misma persistencia y auditoría.
28. El Central mantiene un índice maestro de Controles subordinados y puede resolver sus conexiones sin mezclar datos privados entre clientes.
29. Los aprendizajes que regresan al molde son patrones abstractos o módulos reutilizables. Datos, documentos, secretos, identidad y permisos privados nunca se propagan a otros Controles.
30. Todo cliente nuevo sigue el estándar de incorporación definido en `docs/CLIENT_CONTROL_STANDARD.md`.

## Identidades
- **Human**: administrador raíz, administrador de negocio, colaborador, cliente.
- **AI**: ChatGPT Personal, ChatGPT Cliente, agentes especializados.
- **System**: LINK CONTROL CENTRAL, controles hijos, gateways y workers.

## Principio de herencia
CENTRAL → hereda reglas y núcleo → Control de negocio → especializa módulos/operación → produce eventos y aprendizaje → propone patrones abstractos → filtro central.

## Contrato de publicación de una funcionalidad
Una funcionalidad solo aparece en producción si:
1. Tiene una fuente de verdad definida.
2. Lee datos reales cuando corresponde.
3. Escribe/persiste el cambio cuando corresponde.
4. Maneja errores sin fingir éxito.
5. Actualiza todas las vistas relacionadas.
6. Respeta scope y permisos.
7. Deja evento o trazabilidad para cambios relevantes.
8. Puede verificarse después de recargar o desde otra sesión autorizada.
9. Si también se expone a ChatGPT, dashboard y MCP ejecutan la misma operación de dominio.

Si alguno de estos puntos no existe, la función permanece fuera de la UI.
