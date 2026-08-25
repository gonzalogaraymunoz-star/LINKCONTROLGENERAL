export type StageKey =
  | "understand"
  | "organize"
  | "build"
  | "activate"
  | "support"
  | "scale";

export type WorkKind = "action" | "task" | "gesture";
export type Health = "ok" | "warning" | "error" | "offline";
export type MemoryScope = "local" | "candidate" | "central";

export interface StageDefinition {
  key: StageKey;
  order: number;
  name: string;
  outcome: string;
  baseActions: string[];
  exitCriteria: string[];
}

export interface Client360 {
  id: string;
  name: string;
  shortCode: string;
  accent: string;
  stage: StageKey;
  progress: number;
  need: string;
  product: string;
  nextMilestone: string;
  localIntelligence: string;
  actions: Array<{ id: string; title: string; done: boolean }>;
  gestures: Array<{ id: string; title: string; done: boolean; due?: string }>;
}

export interface Artifact {
  id: string;
  type: string;
  name: string;
  version: string;
  stage: StageKey | "system";
  source: string;
  clientId?: string;
  folderId?: string;
}

export interface Gateway {
  id: string;
  name: string;
  description: string;
  health: Health;
  permissions: string[];
}

export interface ControlNode {
  id: string;
  name: string;
  scope: string;
  chatgptConnection: string;
  supabase: Health;
  github: Health;
  vercel: Health;
  mcp: Health;
  owner: string;
}
