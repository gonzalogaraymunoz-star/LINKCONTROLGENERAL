# ChatGPT + MCP — Contrato inicial

## Rol de ChatGPT
ChatGPT es la interfaz inteligente de operación. El dashboard sirve para ver, ordenar, controlar y auditar; ChatGPT sirve para consultar, razonar y ejecutar herramientas dentro del scope activo.

## Superficie inicial de herramientas
### Identidad
- `get_scope`
- `health`

### CRM
- `search_clients`
- `get_client_360`
- `create_task`
- `create_gesture`
- `complete_work_item`

### Explorador
- `list_folders`
- `create_folder`

### Memoria
- `search_memory`
- `save_local_memory`
- `propose_central_memory`

### Artifacts
- `list_artifacts`
- `register_artifact`

### Sistema
- `list_gateways`
- `gateway_status`
- `activity_log`

## Contexto automático
Cuando el usuario abre un cliente, proyecto, carpeta o etapa, la app debe entregar a ChatGPT IDs estables (`control_id`, `client_id`, `cycle_id`, `stage`, `folder_id`) para no depender de nombres ambiguos.

## Cliente ChatGPT
Cada Control de negocio tendrá una URL/conexión MCP propia o una ruta multi-tenant que resuelva el scope después de autenticar al usuario. El Gmail/cuenta del cliente identifica al operador; no transfiere propiedad del núcleo.
