---
name: request-requirement-change
description: Register a mid-flow requirement change, assess impact, and reroute the workflow from the earliest affected stage.
agent: requirements-agent
argument-hint: Describe the new or changed requirement and why it changed.
---

Apply this requirement change to the in-progress workflow:

${input:change:Describe the requirement change, rationale, and what is now expected}

## Rules

- Register or continue a `CHG-*` change request through the workflowControl change-request tools.
- Update `docs/01-requirements.md` and `docs/01b-change-log.md` before rerouting any downstream work.
- If the base workflow mode is `approval`, ask once whether this specific change should continue automatically after rollback or keep approval pauses.
- If the user chooses automatic continuation for this change, set a temporary execution-mode override so downstream stages continue without extra user approvals.
- If the user chooses to keep approval behavior, clear any temporary override and follow the persisted base mode.
- Choose the earliest impacted rollback stage:
  - `requirements-agent` for scope/persona/platform/scale/NFR baseline changes
  - `architecture-agent` for module/API/data-model/security/deployment changes
  - `coding-agent` for implementation-only behavior changes with valid architecture
  - `testing-agent` when only verification evidence must be regenerated
  - `review-agent` when only sign-off evidence is stale
- In effective `automatic` mode, roll back and continue automatically from the chosen stage.
- In effective `approval` mode, stop after impact assessment and ask for approval before rollback.