# Estándar de Centro de Control por Cliente — v1

LINK CONTROL CENTRAL es el molde maestro para crear y gobernar Sistemas Operativos de Negocio. Ningún cliente parte desde cero: hereda núcleo, reglas y contratos técnicos; especializa datos, módulos, procesos y permisos.

## Fuentes de verdad
- **Supabase**: estado operacional, relaciones, memoria estructurada, permisos, configuración, eventos y referencias.
- **GitHub**: código, arquitectura, documentación técnica y versiones.
- **Google Drive**: archivos originales, documentos, contratos, imágenes y entregables.
- **Vercel**: ejecución y despliegue web.
- **ChatGPT**: interfaz de inteligencia y operación; no reemplaza las fuentes persistentes.

Supabase actúa como índice operacional que relaciona las demás fuentes mediante IDs y metadatos, sin duplicar innecesariamente sus contenidos.

## Flujo oficial
1. Captación y entrevista: entender negocio, necesidad, objetivos, operación y potencial de evolución.
2. Identidad digital: crear o adoptar cuenta propia y proyecto ChatGPT del negocio.
3. Conexiones: registrar GitHub, Supabase, Vercel y Google Drive.
4. Centro de Control: crear instancia subordinada usando el molde vigente.
5. Memoria inicial: estructurar diagnóstico y decisiones y crear el `.md` maestro.
6. Módulos iniciales: instalar solo capacidades reales necesarias.
7. Complemento/MCP: exponer acciones reales a ChatGPT con scope y permisos.
8. Prueba punta a punta: entrada → ejecución → persistencia → lectura posterior → auditoría.

## Registro mínimo
Cada instancia debe poder resolver: `control_id`, `client_id`, `scope`, identidad del negocio, proyecto ChatGPT, GitHub, Supabase, Vercel, carpeta raíz Drive, `.md` maestro, módulos, onboarding, permisos y endpoint MCP. No se guardan secretos aquí; solo referencias seguras.

## Drive gobernado
La estructura la define el sistema. El cliente no crea libremente la arquitectura documental.

```text
/CLIENTE
  /00_ADMIN
  /01_DIAGNOSTICO
  /02_NEGOCIO
  /03_IDENTIDAD
  /04_PRODUCTOS
  /05_WEBSITE
  /06_MARKETING
  /07_OPERACION
  /08_PROYECTOS
  /09_ENTREGABLES
  /99_ARCHIVO
```

Supabase registra IDs de Drive, tipo, propietario lógico, módulo, proyecto, estado y permisos. Drive conserva el archivo original.

## Memoria
La memoria es histórica, acumulativa y trazable. Capas: identidad, estrategia, operación, comercial, técnica, decisiones, temporal y aprendizaje. La IA consume contexto curado para la tarea; no recibe por defecto tablas completas ni secretos.

## Archivo maestro
Cada cliente mantiene un `.md` maestro con misión, negocio, arquitectura, productos, reglas, integraciones, módulos, estado, roadmap y decisiones fundamentales. Es mapa legible y versionable; no reemplaza Supabase.

## Módulos
El núcleo es estable. Las capacidades variables se instalan como módulos. `client_modules` distingue al menos `installed`, `building`, `recommended`, `future`, `disabled`.

## ChatGPT / MCP
Dashboard y ChatGPT son dos interfaces sobre la misma lógica backend. Una función crítica no existe solo como botón: debe ser una operación backend reutilizable y, cuando corresponda, una tool MCP. Ambas interfaces producen la misma persistencia y auditoría.

El Central mantiene el índice maestro de controles. Cada Control conserva su scope y el ChatGPT autorizado opera únicamente dentro del scope concedido.

## Aprendizaje
Datos privados, documentos, secretos y permisos nunca regresan al molde. Solo patrones abstractos y módulos reutilizables pueden proponerse al Central después de revisión.

## Pipeline interno
`captado → entrevista → aprobado → identidad creada → conexiones → centro instalado → memoria inicializada → primer producto → personalización → pruebas → entregado → evolución`

El avance ocurre por criterios verificables, no por apariencia visual ni por tiempo transcurrido.
