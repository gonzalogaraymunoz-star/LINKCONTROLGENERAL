# MICELIO · Technology Receptor v1

El Micelio no reemplaza Playground, Factory, LINK Digital, GÉNESIS, Cortex, Hipocampo ni Director. Los conecta sin copiar sus datos.

## Contrato

Cada tecnología que entra al ecosistema debe declarar:

1. **qué recibe**;
2. **qué aporta**;
3. **quién es dueño de su verdad**;
4. **qué evidencia produce**;
5. **qué evento anuncia su resultado**;
6. **qué capacidad reusable deja al organismo**.

Ruta canónica:

```text
FUENTE / TECNOLOGÍA
        ↓
     PERCIBIR
        ↓
    IDENTIFICAR
        ↓
   RESOLVER DUEÑO
        ↓
   CONTEXTUALIZAR
        ↓
      DIRECTOR
        ↓
 DOT / GÉNESIS / SERVICIO
        ↓
      EVIDENCIA
        ↓
     EVENT BUS
        ↓
    HIPOCAMPO
```

## Ley de propiedad

El Micelio no crea copias de la verdad de una aplicación.

- identidad: `ecosystem_entities`;
- relaciones: `entity_relations`;
- intención/mutación: `command_bus`;
- resultado/evidencia: `event_bus`;
- memoria: sistema canónico de memoria;
- código: repositorio dueño;
- ejecución: aplicación/deploy dueño.

## Tecnologías iniciales

### Playground
Archivo visual vivo. Conserva previews, versiones y referencias. No dirige ni construye.

### LINK Factory
Taller de GÉNESIS. Construye. Su evolución será pasar de HTML a capacidades verificables.

### LINK Digital
Puerta comercial. Convierte entrevista/necesidad en mapa de negocio y misión candidata.

## Regla NO FAKE

Una tecnología puede aparecer como `partial` o `planned`, pero nunca como `connected` hasta que exista un recorrido real:

`entrada → dueño → ejecución → persistencia → evidencia → evento → lectura`

## API

`GET /api/micelio` expone el contrato, las tecnologías registradas y señales reales de Control Central. Si Supabase no está disponible, responde degradado en vez de inventar estado.

## Orden de integración

1. Playground → índice visual del organismo.
2. Factory → cuerpo de construcción de GÉNESIS.
3. LINK Digital → diagnóstico/prospección que alimenta misiones.
4. REA → instrumento de investigación dentro de GÉNESIS/Factory.
