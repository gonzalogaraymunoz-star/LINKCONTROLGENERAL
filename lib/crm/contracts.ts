export type ControlGlobalId = string;

export type CrmCompanyInput = { globalId: ControlGlobalId; name: string; sourceApp?: string; domain?: string };
export type CrmOpportunityInput = { globalId: ControlGlobalId; clientGlobalId: ControlGlobalId; name: string; amount?: number; stage?: string; sourceApp?: string };
export type CrmTaskInput = { globalId: ControlGlobalId; clientGlobalId: ControlGlobalId; title: string; dueAt?: string };

export interface CrmAdapter {
  provider: "twenty";
  upsertCompany(input: CrmCompanyInput): Promise<{ externalId: string }>;
  createOpportunity(input: CrmOpportunityInput): Promise<{ externalId: string }>;
  createTask(input: CrmTaskInput): Promise<{ externalId: string }>;
  getTimeline(clientGlobalId: ControlGlobalId): Promise<unknown[]>;
}

/** CRM never owns deep memory. */
export const CRM_MEMORY_OWNERSHIP = "none" as const;
