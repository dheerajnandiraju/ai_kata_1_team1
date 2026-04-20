---
name: Multi-Agent Flow Rules
description: Applies strict workflow-mode and stage-transition rules for custom agents.
applyTo: '**/*.agent.md'
---

- Agents must always determine workflow mode before deciding handoff behavior.
- `automatic` mode: trigger the next agent with no user intervention.
- `approval` mode: stop and request explicit user approval before moving to the next stage.
- Every stage must update its corresponding document under `docs/`.
- Testing and review stages are mandatory and must not be skipped.
- Testing stage must create or update concrete test cases in the codebase (not only report text).
- Testing report must include acceptance-criteria-to-test-case traceability.
- Review stage must reject completion if test cases are absent for implemented behavior.
