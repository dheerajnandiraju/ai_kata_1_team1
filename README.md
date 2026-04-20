# VS Code Copilot Multi-Agent Flow

This workspace provides a complete 7-stage multi-agent Copilot SDLC flow with:

- `orchestrator-agent`
- `requirements-agent`
- `architecture-agent`
- `coding-agent`
- `module-coding-agent` (spawned per module by coding-agent)
- `integration-testing-agent`
- `testing-agent`
- `bugfix-agent` (invoked on failures, loops back to testing)
- `review-agent`
- `deployment-agent`

It supports two execution modes:

- `automatic`: each agent triggers the next agent automatically end-to-end.
- `approval`: each agent pauses and asks for approval before the next stage.

Mode is persisted through the `workflowControl` MCP server.

Test-case policy:

- The testing phase must create or update real test cases in the codebase.
- Test cases must map to acceptance criteria.
- Final review must return `changes required` if coverage is missing.

## Included Components

- Workspace instructions: `.github/copilot-instructions.md`
- Scoped instructions: `.github/instructions/multi-agent-flow.instructions.md`
- Custom agents: `.github/agents/*.agent.md`
- Prompt entry point: `.github/prompts/start-multi-agent-flow.prompt.md`
- MCP server code: `mcp/workflow-control-server.mjs`
- Workspace MCP config: `.vscode/mcp.json`
- Plugin manifest/config: `plugin.json`, `.mcp.json`

## Setup

1. Install dependencies:

```bash
npm install
```

On Windows PowerShell, use `npm.cmd install` if execution policy blocks `npm.ps1`.

2. Open VS Code in this workspace.

3. Ensure MCP server is trusted and running:
   - Command Palette -> `MCP: List Servers`
   - Start `workflowControl` if needed

4. Open Chat in Agent mode and run:

```text
/start-multi-agent-flow
```

5. Provide your goal when prompted.

6. Validate the workflow before first use:

```bash
npm run validate
```

On Windows PowerShell, use `npm.cmd run validate` if needed.

## Workflow Artifacts

Each stage writes to:

- `docs/01-requirements.md`
- `docs/01b-change-log.md` (mid-flow requirement changes)
- `docs/02-architecture.md`
- `docs/03-implementation-log.md`
- `docs/03b-bugfix-log.md` (if bugfix phase runs)
- `docs/03c-integration-test-report.md`
- `docs/04-testing-report.md`
- `docs/05-review-report.md`
- `docs/06-deployment-report.md`
- `docs/screenshots/` (E2E + deployment screenshots)

## Validation Checklist

Use this quick checklist after running `/start-multi-agent-flow`:

1. Confirm `workflowControl` is running via `MCP: List Servers`.
2. Confirm all 7 phase docs exist and are populated.
3. Confirm test files were created or updated in the repository.
4. Confirm `docs/04-testing-report.md` includes a criteria-to-test traceability matrix and E2E screenshots.
5. Confirm `docs/03c-integration-test-report.md` shows no BLOCKERs.
6. Confirm `docs/05-review-report.md` includes approve/changes required with OWASP security findings.
7. Confirm `docs/06-deployment-report.md` shows all smoke tests passed and staging is live.

## Resume And Change Flow

If Copilot stops in the middle of a run, the workflow is not supposed to restart blindly.

- Re-run `/start-multi-agent-flow`.
- The orchestrator now resumes from the active in-progress stage when one exists.
- If no stage is active, it continues from the next untouched stage after the last completed stage.
- Coding additionally resumes from the first pending module using recorded subtasks.

If you need to add or modify requirements mid-flow:

1. Run `/request-requirement-change`.
2. Describe the new or changed requirement and why it changed.
3. If the base workflow is in `approval` mode, the workflow asks once whether this change should continue automatically or keep approval pauses.
4. The workflow registers a `CHG-*` item, updates `docs/01-requirements.md` and `docs/01b-change-log.md`, chooses the earliest impacted rollback stage, and clears stale downstream state.
5. If you chose automatic continuation for the change, the reroute continues from that stage without extra approval prompts.
6. If you keep approval mode, it stops after impact assessment and waits for your approval before rollback.

Rollback target rules:

- `requirements-agent`: scope, personas, scale, target platform, or foundational NFRs changed
- `architecture-agent`: modules, APIs, data model, security design, or deployment assumptions changed
- `coding-agent`: implementation behavior changed but architecture remains valid
- `testing-agent`: only verification evidence must be regenerated
- `review-agent`: only review/sign-off evidence is stale

## Production Hardening

This workflow now enforces several runtime guarantees through the MCP server instead of relying only on prompt text:

- A stage cannot be advanced unless its expected artifact file exists.
- Rolling back to a stage clears artifacts and subtask state for that stage and every downstream stage.
- `complete_workflow` is blocked until review is finished and deployment has succeeded, unless deployment is explicitly skipped in `approval` mode with a recorded reason.
- Browser automation guidance is aligned to VS Code browser tools instead of launching a separate Playwright browser.
- Cross-platform terminal guidance avoids Bash-only operators and documents the Windows `npm.cmd` fallback.

## Optional: Use As Local Agent Plugin

This repository also contains plugin metadata (`plugin.json`) and plugin MCP config (`.mcp.json`) so it can be loaded through local plugin locations.
