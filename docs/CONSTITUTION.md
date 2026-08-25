# Constitución Técnica v1.1 — LINK CONTROL CENTRAL

## Propósito
LINK CONTROL CENTRAL es la autoridad raíz del ecosistema. Su función es gobernar identidades, scopes, reglas, memoria transversal, gateways y controles hijos sin absorber la operación completa de cada negocio.

## Reglas constitucionales
1. LINK CONTROL CENTRAL es la autoridad técnica raíz.
2. El núcleo central es inmutable para controles hijos, apps, clientes, agentes y gateways.
3. Cada negocio recibe un Control propio subordinado al Central.
4. Cada Control de negocio expone una conexión/complemento para el ChatGPT autorizado de ese negocio.
5. El ChatGPT cliente solo puede operar dentro del scope concedido.
6. Toda integración externa entra por un Gateway autorizado.
7. Ninguna app hija escribe directamente en memoria maestra.
8. Datos, memoria e inteligencia son capas diferentes.
9. Toda inteligencia conserva evidencia y fuente; nunca reemplaza el dato original.
10. Toda acción relevante deja trazabilidad: actor, acción, objeto, control, tiempo y resultado.
11. Una app o alianza puede entrar o salir sin romper el núcleo ni otros controles.
12. La arquitectura se hereda; datos privados, secretos y permisos no se heredan automáticamente.
13. Las seis etapas LINK son el método transversal de gestión comercial y de evolución.
14. Una etapa avanza por cumplimiento de criterios de salida, no por tiempo ni por drag-and-drop.
15. El usuario final no necesita comprender la arquitectura técnica para usar el sistema.
16. **No Fake UI:** si una función no ejecuta su trabajo real de principio a fin, no se publica en la interfaz.
17. Ningún panel puede mostrar datos inventados, estados simulados o métricas ficticias como si fueran información operacional.
18. Ningún botón puede limitarse a un `alert`, `prompt`, cambio visual temporal o `localStorage` cuando su significado implica una acción persistente del sistema.
19. Una capacidad futura puede existir en documentación o backlog, pero no en la experiencia del usuario hasta contar con fuente de verdad, permisos, persistencia y resultado verificable.
20. Cada función visible debe superar este contrato mínimo: **entrada real → validación → ejecución → persistencia → actualización de interfaz → evento/auditoría cuando corresponda**.
21. Si una integración está desconectada, el sistema puede mostrar su estado técnico únicamente si ese estado proviene de una comprobación real; nunca debe fingir conexión, salud o actividad.

## Identidades
- **Human**: administrador raíz, administrador de negocio, colaborador, cliente.
- **AI**: ChatGPT Personal, ChatGPT Cliente, agentes especializados.
- **System**: LINK CONTROL CENTRAL, controles hijos, gateways y workers.

## Principio de herencia
CENTRAL → hereda reglas → Control de negocio → especializa operación → produce eventos y aprendizaje → propone conocimiento → filtro central.

## Contrato de publicación de una funcionalidad
Una funcionalidad solo puede aparecer en producción si cumple todos estos puntos:

1. Tiene una fuente de verdad definida.
2. Lee datos reales cuando corresponde.
3. Escribe/persiste el cambio cuando corresponde.
4. Maneja errores sin fingir éxito.
5. Actualiza todas las vistas relacionadas.
6. Respeta scope y permisos.
7. Deja evento o trazabilidad para cambios relevantes.
8. Puede ser verificada después de recargar la aplicación o desde otra sesión autorizada.

Si alguno de estos puntos no existe, la función permanece fuera de la UI.
