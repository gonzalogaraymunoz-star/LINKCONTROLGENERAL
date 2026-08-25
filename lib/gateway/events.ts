export const EVENT_TYPES = [
  "client.created",
  "need.created",
  "stage.changed",
  "stage.ready",
  "stage.stalled",
  "action.completed",
  "task.completed",
  "gesture.completed",
  "artifact.created",
  "artifact.approved",
  "memory.proposed",
  "memory.promoted",
  "gateway.connected",
  "gateway.disconnected",
  "deployment.failed",
  "deployment.succeeded",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface LinkEvent {
  id: string;
  type: EventType;
  controlId: string;
  actorId: string;
  objectType: string;
  objectId: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}
