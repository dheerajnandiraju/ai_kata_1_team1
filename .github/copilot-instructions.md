# Multi-Agent Workflow Conventions

## Pipeline

requirements → architecture → coding (module-by-module via module-coding-agent) → **integration-testing** (cross-module sanity) → testing (unit + integration + E2E + a11y) → bugfix (loop if needed) → review → **deployment** (Docker staging + smoke tests)

## Mode Selection

- Before running the flow, ensure workflow mode is explicitly selected: `automatic` or `approval`.
- Persist and read workflow mode through the `workflowControl` MCP tools rather than assumptions.
- In `automatic` mode: use the **Autopilot** or **Bypass Approvals** permission level in the Chat view (v1.116) to run end-to-end without confirmation dialogs.

## Phase Outputs

Keep phase outputs in `docs/` with these files:
- `docs/01-requirements.md`
- `docs/02-architecture.md`
- `docs/03-implementation-log.md` (updated per module)
- `docs/03b-bugfix-log.md` (if bugfix phase runs)
- `docs/03c-integration-test-report.md` (cross-module sanity — from integration-testing-agent)
- `docs/04-testing-report.md` (unit + integration + E2E + a11y)
- `docs/05-review-report.md`
- `docs/06-deployment-report.md` (Docker build + smoke test results)
- `docs/screenshots/` (E2E + deployment screenshots)

## UML Diagrams (Mermaid)

- Architecture phase must produce three embedded Mermaid diagrams in `docs/02-architecture.md`:
  - **Component diagram** (`graph TD`): all modules and their dependency relationships.
  - **Sequence diagram** (`sequenceDiagram`): primary happy-path user flow end-to-end through the stack.
  - **ER diagram** (`erDiagram`): all persistent entities with fields and cardinality (skip only if no persistent storage).
- Integration-testing phase must embed a Mermaid sequence diagram in `docs/03c-integration-test-report.md` showing the actual verified cross-module call flow.
- All Mermaid diagrams must be validated with `renderMermaidDiagram` before the stage checkpoint is saved. A diagram that fails to render is a blocker for that phase.
- Diagrams are embedded as fenced ` ```mermaid ` blocks directly in the Markdown docs — no external image files needed.

## Context Window Rules (production-critical)

- Use `#codebase` (semantic search — v1.114, now always semantic) for all codebase searches. Do not load entire directories.
- When architecture already provides exact key files, use those paths first. New-project scaffolding should create the named files directly instead of re-running broad semantic search.
- Large projects: coding-agent delegates to `module-coding-agent` one module at a time to keep context focused.
- Each agent reads only the docs and files it needs for its phase.
- Sub-task progress is checkpointed via `workflowControl/register_subtask` and `complete_subtask` so work resumes after interruptions without re-doing completed modules.

## Nested Subagents (v1.113)

- `chat.subagents.allowInvocationsFromSubagents` is enabled in `.vscode/settings.json`.
- coding-agent spawns module-coding-agent per module.
- module-coding-agent should not spawn further subagents; keep nesting depth capped at coding-agent → module-coding-agent.
- bugfix-agent re-invokes testing-agent after fixes.
- All nested subagent invocations are legal and tracked.

## MCP Workflow State

- Attach `workflow://state` (MCP Resource) as context before each phase to get current stage, mode, and sub-task progress.
- MCP server exposes Resources and Prompts in addition to Tools (v1.100+).
- Server auto-restarts when `mcp/workflow-control-server.mjs` is saved (dev mode in `.vscode/mcp.json`).
- Every `advance_stage` call must happen only after the phase artifact exists, and should pass the phase artifact path explicitly.
- `complete_workflow` is valid only after successful deployment, or after an explicit deployment skip in `approval` mode with a recorded reason.
- Every formal stage should call `start_stage` when it begins and `save_stage_checkpoint` during long-running work so interruption recovery resumes from the right place.
- Orchestrator resume behavior must prefer `activeStage` over `currentStageIndex`; if no stage is active, resume from the next untouched stage rather than restarting.

## Mid-Flow Changes

- Requirement changes after the workflow has started must be logged in `docs/01b-change-log.md` with IDs `CHG-01`, `CHG-02`, and so on.
- Use workflowControl change-request tools to register, assess, and apply requirement changes.
- When the base workflow mode is `approval`, `/request-requirement-change` should ask once whether that change reroute should continue automatically or keep approval pauses.
- Automatic continuation for a change request should use a temporary execution-mode override rather than mutating the persisted base workflow mode.
- Impact-based rollback is the default strategy:
	- requirements rollback for scope/persona/platform/NFR baseline changes
	- architecture rollback for module/API/data-model/security/deployment changes
	- coding rollback for implementation changes with stable architecture
	- testing rollback when only verification evidence is stale
	- review rollback when only sign-off evidence is stale
- After a change is applied, downstream stages must be regenerated from the earliest affected stage.

## Resume Semantics

- If Copilot is interrupted mid-stage, re-running `/start-multi-agent-flow` should continue from `activeStage` using the latest stage checkpoint.
- Coding resume relies on both `activeStage` and `get_subtasks`; completed modules must not be re-implemented.
- If a change request was interrupted mid-assessment, re-run `/request-requirement-change` and continue the latest open or assessed `CHG-*` item.
- If a change request enabled automatic continuation through an execution-mode override, that override should persist for the resumed reroute until it is explicitly cleared or the workflow is reset.

## Cross-Platform Execution Rules

- Use terminal tool async mode instead of shell background operators such as `&`.
- Use shell-native commands for the current workspace OS; do not assume Bash features on Windows.
- On Windows PowerShell, prefer `npm.cmd` if execution policy blocks `npm.ps1`.
- Stages that require terminal or browser execution must execute those steps inside the agent flow by using the available tools. Do not hand runnable commands back to the user as the default path.
- In `automatic` mode: execute required terminal and browser steps directly.
- In `approval` mode: ask once for approval to proceed with the phase or the blocked execution step, then run the commands here after approval. Do not ask the user to run them manually unless they explicitly choose a manual fallback.
- If a terminal or browser step is blocked, first attempt the tool call and capture the actual failure. Report the concrete blocked tool or command, then ask for approval or permission changes to retry here. Do not fabricate placeholder success, placeholder blocker reports, or "run these locally" instructions as the primary behavior.
- After a phase has already reported its outcome, do not repeat the same start/blocker/completion summary again. Emit one concise outcome summary, then hand off or stop.

## Test Case Authoring (mandatory)

- The workflow must produce explicit test cases (unit/integration/e2e as applicable).
- Test cases must be linked to acceptance criteria IDs (AC-01, AC-02 …).
- Traceability matrix in `docs/04-testing-report.md`: AC-01 → test file:line.
- If tests are missing for any AC, workflow cannot be approved as complete.

## Clarification Gates

- Requirements-agent: if the goal is ambiguous, stop and ask before proceeding.
- Architecture-agent: if a major design decision has high-impact tradeoffs, stop and ask.
- Never make large architectural assumptions silently.

## Review Gates

- Architecture drift (modules specified but not implemented) → `changes required`.
- Missing test coverage for any AC → `changes required`.
- Critical/high security findings → `changes required`.

## New VS Code Features in Use (2026)

- v1.109: Agent Skills GA (`chat.useAgentSkills`) — `.github/skills/` directory; skills as slash commands; `user-invocable`/`disable-model-invocation`/`agents` agent frontmatter; multiple model fallback `model: [...]`; `askQuestions` tool carousel for clarification gates; message steering/queueing (`chat.requestQueuing.enabled`); Copilot Memory (`github.copilot.chat.copilotMemory.enabled`); search subagent (`github.copilot.chat.searchSubagent.enabled`); agent hooks lifecycle events; MCP Apps; session type picker; parallel subagents; model parameter on handoffs
- v1.110: Context compaction `/compact [focus instructions]`; agent plugins marketplace (`chat.plugins.enabled`); Explore subagent for Plan agent research; fork sessions `/fork`; `/create-skill`, `/create-agent` slash commands; `usages` + `rename` code-aware tools; session memory persistence across turns; agentic browser tools (`workbench.browser.enableChatTools`); Agent Debug panel
- v1.111: **Autopilot** permission level (`chat.autopilot.enabled`) — auto-approves all tools, auto-responds to questions, iterates until `task_complete`; **Bypass Approvals** level; agent-scoped hooks in `.agent.md` frontmatter (`hooks:` section, `chat.useCustomAgentHooks`); `#debugEventsSnapshot` context attachment for debugging
- v1.112: `/troubleshoot` skill reads JSONL debug logs to explain agent behavior (`github.copilot.chat.agentDebugLog.fileLogging.enabled` required); export/import agent debug logs; image/binary file support for agents; MCP server sandboxing in `mcp.json` (`sandboxEnabled: true`, macOS/Linux only); monorepo customizations discovery (`chat.useCustomizationsInParentRepositories`); automatic symbol references on paste
- v1.113: `chat.subagents.allowInvocationsFromSubagents` — nested subagents (subagents can invoke subagents); MCP servers bridged to Copilot CLI & Claude agents; fork sessions in CLI/Claude agents; Chat Customizations editor (single UI for all `.agent.md`/`.instructions.md`/skills); configurable thinking effort in model picker; `#sym:Name` automatic symbol references
- v1.114: `#codebase` purely semantic, simplified workspace search
- v1.115: VS Code Agents app for parallel sessions across repos
- v1.116: Autopilot permission level in UI, foreground terminal tools, debug logs, `github.copilot.chat.agent.autoFix`
- v1.100: MCP Resources/Prompts, `readOnlyHint` tool annotations, Streamable HTTP MCP

## Agent Hooks (v1.109/v1.111)

- Hooks run deterministically at lifecycle points: `PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `SubagentStart`, `SubagentStop`.
- Define them in agent frontmatter (`hooks:` section) for agent-scoped hooks, or in `.github/hooks/` for workspace-wide hooks.
- Use `PreToolUse` hooks to enforce security policies (block dangerous commands, validate tool inputs).
- Use `PostToolUse` hooks to run linting/formatting after file edits.
- Use `/hooks` slash command in chat to configure a new hook interactively.

## Workflow Self-Validation

- Run `npm run validate` before shipping workflow changes.
- The validation script is expected to catch known bad prompt patterns such as non-existent tool references and raw Playwright browser launches inside integrated-browser skills.

## Agent Skills (v1.109 GA)

- Skills live in `.github/skills/<skill-name>/SKILL.md`.
- Phase-specific skills are lazy-loaded by the owning stage only: `e2e-testing` in testing, `security-review` in review. Do not load them during `/start-multi-agent-flow`, requirements, architecture, coding, or integration-testing.
- Invoke as slash commands: `/security-review`, `/webapp-testing` etc.
- This workflow ships with: `.github/skills/security-review/SKILL.md` — invoked by review-agent for OWASP Top 10 audits.
- Add new skills via `/create-skill` in chat or create `SKILL.md` manually.

## Context Compaction (v1.110)

- When context window fills during a long session: type `/compact` to summarize history.
- Add focus instructions: `/compact focus on module interfaces and error messages`.
- Session memory persists the plan so the agent can resume after compaction.
- The context window indicator in the chat input shows token usage breakdown.
