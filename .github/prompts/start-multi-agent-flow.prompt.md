---
name: start-multi-agent-flow
description: Run the full 7-stage multi-agent SDLC — requirements → architecture → coding → integration-testing → testing → review → deployment.
agent: orchestrator-agent
argument-hint: Describe what you want built (e.g. "a full-stack todo app with auth").
---

Start the full multi-agent workflow for this objective:

${input:goal:Describe what you want built}

If a workflow is already in progress, this prompt must resume from the active in-progress stage or the next untouched stage. It must not restart from requirements unless the workflow has not started.

## Pipeline

1. **requirements-agent** — clarify scope, produce `docs/01-requirements.md`
2. **architecture-agent** — design modules, produce `docs/02-architecture.md`
3. **coding-agent** — implement module-by-module via `module-coding-agent`, produce `docs/03-implementation-log.md`
4. **integration-testing-agent** — start full stack, verify cross-module wiring, produce `docs/03c-integration-test-report.md`
5. **testing-agent** — unit + integration + E2E (Playwright) + accessibility, produce `docs/04-testing-report.md`
6. **review-agent** — OWASP security audit + quality gates, produce `docs/05-review-report.md`
7. **deployment-agent** — Docker build + staging deploy + smoke tests, produce `docs/06-deployment-report.md`

## Constraints

- First ensure workflow mode is selected (`automatic` or `approval`).
- **Automatic mode**: switch Chat permission level to **Autopilot** or **Bypass Approvals** so all phases run without confirmation dialogs.
- **Approval mode**: pause after each phase for explicit user confirmation before proceeding.
- Phases that need terminal or browser execution must run those actions here through the available tools. They must not default to telling the user to run commands locally.
- All phase docs go in `docs/`, screenshots in `docs/screenshots/`.
- Testing phase must write real test cases in the codebase mapped to acceptance criteria IDs (AC-01, AC-02 …).
- Integration testing must pass (no BLOCKERs) before formal testing begins.
- Review must be approved before deployment runs.
- `complete_workflow` is called only after all smoke tests pass in deployment.
- If requirements change mid-flow, use `/request-requirement-change` instead of continuing with stale downstream work.
