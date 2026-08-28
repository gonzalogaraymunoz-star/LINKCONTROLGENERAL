export type ControlActionMode = "read" | "write";
export type ControlProvider = "core" | "supabase" | "twenty";

export type ControlActionDefinition = {
  actionKey: string;
  provider: ControlProvider;
  description: string;
  permissionKey: string;
  mode: ControlActionMode;
  successEvent?: string;
  failureEvent?: string;
};

export const CONTROL_ACTIONS: ControlActionDefinition[] = [
  { actionKey: "client.create", provider: "core", description: "Crear identidad cliente", permissionKey: "client:create", mode: "write", successEvent: "CLIENT_CREATED", failureEvent: "CLIENT_CREATE_FAILED" },
  { actionKey: "client.update", provider: "core", description: "Actualizar identidad cliente", permissionKey: "client:update", mode: "write", successEvent: "CLIENT_UPDATED", failureEvent: "CLIENT_UPDATE_FAILED" },
  { actionKey: "client.archive", provider: "core", description: "Archivar cliente sin destruir memoria", permissionKey: "client:archive", mode: "write", successEvent: "CLIENT_ARCHIVED", failureEvent: "CLIENT_ARCHIVE_FAILED" },
  { actionKey: "project.connect", provider: "core", description: "Conectar proyecto hijo", permissionKey: "project:connect", mode: "write", successEvent: "PROJECT_CONNECTED", failureEvent: "PROJECT_CONNECT_FAILED" },
  { actionKey: "work_item.create", provider: "core", description: "Crear tarea, acción o gesto operacional", permissionKey: "work_item:create", mode: "write", successEvent: "WORK_ITEM_CREATED", failureEvent: "WORK_ITEM_CREATE_FAILED" },
  { actionKey: "memory.remember", provider: "supabase", description: "Guardar memoria profunda", permissionKey: "memory:write", mode: "write", successEvent: "MEMORY_STORED", failureEvent: "MEMORY_STORE_FAILED" },
  { actionKey: "memory.recall", provider: "supabase", description: "Recuperar memoria profunda", permissionKey: "memory:read", mode: "read", failureEvent: "MEMORY_RECALL_FAILED" },
  { actionKey: "crm.company.upsert", provider: "twenty", description: "Sincronizar Company en Twenty", permissionKey: "crm:company:write", mode: "write", successEvent: "CRM_COMPANY_SYNCED", failureEvent: "CRM_COMPANY_SYNC_FAILED" },
  { actionKey: "crm.opportunity.create", provider: "twenty", description: "Crear oportunidad en Twenty", permissionKey: "crm:opportunity:write", mode: "write", successEvent: "CRM_OPPORTUNITY_CREATED", failureEvent: "CRM_OPPORTUNITY_CREATE_FAILED" },
  { actionKey: "crm.task.create", provider: "twenty", description: "Crear tarea en Twenty", permissionKey: "crm:task:write", mode: "write", successEvent: "CRM_TASK_CREATED", failureEvent: "CRM_TASK_CREATE_FAILED" },
  { actionKey: "crm.timeline.read", provider: "twenty", description: "Leer actividad CRM", permissionKey: "crm:timeline:read", mode: "read", failureEvent: "CRM_TIMELINE_READ_FAILED" },
  { actionKey: "integration.sync", provider: "core", description: "Sincronizar integración", permissionKey: "integration:sync", mode: "write", successEvent: "INTEGRATION_SYNCED", failureEvent: "INTEGRATION_SYNC_FAILED" },
];

export const ACTION_BY_KEY = new Map(CONTROL_ACTIONS.map((action) => [action.actionKey, action]));
