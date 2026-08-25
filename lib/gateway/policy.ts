export type ActorType = "human" | "ai" | "system";

export interface GatewayContext {
  actorId: string;
  actorType: ActorType;
  controlId: string;
  scope: string;
  action: string;
  resource?: string;
}

const ROOT_ONLY = new Set([
  "control.delete",
  "policy.change",
  "memory.central.promote",
  "gateway.root.configure",
]);

export function authorizeGatewayAction(context: GatewayContext) {
  if (!context.actorId || !context.controlId || !context.scope || !context.action) {
    return { allowed: false, reason: "missing_context" as const };
  }
  if (ROOT_ONLY.has(context.action) && context.scope !== "root") {
    return { allowed: false, reason: "root_required" as const };
  }
  return { allowed: true, reason: "policy_passed" as const };
}
