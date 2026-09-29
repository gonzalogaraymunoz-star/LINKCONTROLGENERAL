# LINK Agent Action Environment v1

## Goal
Move LINK agents from observation to governed action without granting unrestricted mutation access.

## Action path
Agent observation → diagnosis → governed action proposal → command_bus → human approval → internal executor → event_bus → evidence → verification.

## Canonical tables
- agent_action_grants: per-agent action authority and autonomy level.
- agent_missions: missions created by Directors or LINK Director.
- agent_mission_evidence: evidence requirements and validation state.
- action_registry: registered actions and executor metadata.
- command_bus: proposed/approved/executed commands.
- event_bus: auditable action evidence.

## Current Director actions
1. stage.diagnosis.record
2. mission.create
3. agent.assign
4. evidence.request
5. stage.escalate
6. stage.block_scale
7. stage.verify

All six stage Directors start with approval_required=true. LINK Director has the governance subset.

## Safety rule
A proposal is not execution. The internal executor runs only after approval. External actions such as publishing, charging money, sending messages or destructive writes are not enabled by this environment unless a real executor and permission contract exists.

## Evidence rule
stage.verify refuses closure when the mission has no evidence requirements or any evidence remains unvalidated.

## Authentication
The Control Central action API requires a valid LINK Supabase session and active app_members membership. Approval and evidence validation require owner/admin role.

## Internal RPCs
- link_agent_propose_action_v1
- link_control_decide_agent_action_v1
- link_execute_internal_agent_action_v1
- link_submit_mission_evidence_v1
- link_validate_mission_evidence_v1
