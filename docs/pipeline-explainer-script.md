# Multi-Agent SDLC Pipeline — End-to-End Explainer Script

---

## SECTION 1 — WHAT IS THIS?

This is a **fully automated Software Development Lifecycle (SDLC) pipeline** built on top of **GitHub Copilot's multi-agent framework** inside VS Code.

Instead of a single AI assistant helping you write code, this system orchestrates **a team of specialized AI agents**, each owning a distinct phase of software delivery — from gathering requirements all the way to deploying a containerized application to a staging environment.

The pipeline covers:
- Requirements analysis
- Architecture design (with UML diagrams)
- Module-by-module implementation
- Cross-module integration testing
- Formal unit + E2E testing
- Security & quality review (OWASP Top 10)
- Docker-based staging deployment with smoke tests

---

## SECTION 2 — THE MCP SERVER (THE BRAIN)

Before we walk through the agents, we need to understand the **MCP server** — because it is the shared memory and control plane that makes everything work together.

### What is MCP?

**MCP = Model Context Protocol.** It is an open protocol (by Anthropic) that lets AI models communicate with external tools and services in a structured way. VS Code Copilot supports MCP servers natively (since v1.100).

### What does this project's MCP server do?

The file `mcp/workflow-control-server.mjs` is a **custom Node.js MCP server** called `workflowControl`.

It exposes three things to all agents:

| MCP Primitive | What it provides |
|---|---|
| **Tools** | Functions agents call to read/write workflow state |
| **Resources** | `workflow://state` — a live snapshot agents attach as context |
| **Prompts** | Reusable prompt templates the agents can invoke |

### How is it wired in?

The file `.vscode/mcp.json` registers this server so VS Code starts it automatically. The server stores its state in `.workflow/state.json` — a JSON file that persists across agent handoffs.

### Key tools exposed by the MCP server

| Tool | Purpose |
|---|---|
| `set_execution_mode` | Set `automatic` or `approval` mode for the run |
| `get_execution_mode` | Read the current effective mode |
| `set_execution_mode_override` | Temporarily override mode for a change request |
| `clear_execution_mode_override` | Remove the temporary override |
| `get_workflow_state` | Get the full current state (stage, subtasks, history) |
| `get_resume_target` | Figure out where to resume after an interruption |
| `start_stage` | Mark a stage as active; set its artifact path |
| `advance_stage` | Mark a stage as complete and move the pointer forward |
| `save_stage_checkpoint` | Save a progress summary mid-stage for recovery |
| `get_stage_checkpoint` | Read back the saved checkpoint when resuming |
| `register_subtask` | Register a module/subtask under a stage |
| `complete_subtask` | Mark a module/subtask complete |
| `get_subtasks` | List all subtasks and their statuses for a stage |
| `create_change_request` | Open a `CHG-NN` mid-flow requirement change |
| `get_change_requests` | List all change requests |
| `update_change_request` | Progress a change request through statuses |
| `rollback_to_stage` | Roll the pipeline back to an earlier stage |
| `reset_workflow` | Wipe state and start fresh |
| `complete_workflow` | Mark the entire workflow done after smoke tests pass |

### Why does this matter?

Every agent in the pipeline **reads and writes through this MCP server**. That means:
- Agents don't need to re-read every doc from scratch — they query state.
- If a run is interrupted, the next run knows exactly where to resume.
- Module-level progress is tracked individually so completed modules are never re-implemented.

---

## SECTION 3 — THE TWO EXECUTION MODES

Before the pipeline runs, the user chooses a mode. This choice is persisted in MCP state.

### `automatic` mode
Every agent hands off to the next one automatically, without pausing. The user enables **Autopilot** or **Bypass Approvals** in the VS Code Chat permission picker so there are no confirmation dialogs. The whole pipeline from requirements to deployment runs unattended.

### `approval` mode
Every agent completes its phase and then **pauses**, waiting for the user to say "continue". This gives full human control at every transition. Agents do not hand commands back to the user — they execute all terminal/browser steps themselves and simply pause before moving to the next stage.

**Important**: mid-flow, if a change request is raised in `approval` mode, the user is asked exactly once whether that specific reroute should continue automatically. If yes, a **temporary mode override** is set in MCP state just for that reroute, without mutating the base mode.

---

## SECTION 4 — THE PIPELINE, STAGE BY STAGE

### Entry Point: `/start-multi-agent-flow`

The user types `/start-multi-agent-flow` in VS Code Chat (Agent mode) and provides their goal. This prompt is defined in `.github/prompts/start-multi-agent-flow.prompt.md` and it immediately hands off to the **orchestrator-agent**.

---

### STAGE 0 — orchestrator-agent

**File**: `.github/agents/orchestrator.agent.md`

**Role**: The traffic controller. It is the only agent the user directly invokes.

**What it does**:
1. Attaches `workflow://state` (the live MCP resource) as context.
2. Calls `get_workflow_state` and `get_resume_target` to decide what to do.
3. If the workflow is **already complete**: prints a final delivery summary with links to all 7 docs and stops.
4. If there is an **active stage in progress**: resumes that exact stage (hands off to the right agent with the saved checkpoint).
5. If no mode is set: asks the user one question — automatic or approval?
6. Persists the choice with `set_execution_mode`.
7. Triggers **requirements-agent** (or the correct resume target).

**Key design**: The orchestrator never restarts from requirements if work is already done. It reads `activeStage` first, then `nextAgent`, and only falls back to requirements if nothing has started.

---

### STAGE 1 — requirements-agent

**File**: `.github/agents/requirements.agent.md`

**Artifact**: `docs/01-requirements.md`

**Role**: Understand and document what needs to be built.

**What it does**:
1. Calls `start_stage` in MCP to mark requirements as active.
2. Reads any existing change requests to check if this is a mid-flow change.
3. **Clarification gate**: if the goal is ambiguous (no target platform, no user roles defined, scale unclear), it uses the `askQuestions` tool to present a structured carousel of questions. It asks ALL open questions at once — never one by one.
4. Searches the codebase (`#codebase`) to check for relevant existing code.
5. Produces `docs/01-requirements.md` with:
   - Problem statement
   - Functional requirements (FR-01, FR-02 …)
   - Non-functional requirements (NFR-01, NFR-02 …)
   - Acceptance criteria (AC-01, AC-02 … — one per FR/NFR)
   - Testability notes per criterion
6. Calls `save_stage_checkpoint` mid-write for recovery.
7. Calls `advance_stage` to mark requirements complete.
8. In **automatic** mode: invokes `architecture-agent` immediately.
9. In **approval** mode: pauses for user confirmation.

**Mid-flow change handling**: if the user runs `/request-requirement-change`, this agent opens a `CHG-NN` entry, determines the earliest affected rollback stage, and optionally triggers a rollback through MCP before re-invoking the appropriate downstream agent.

---

### STAGE 2 — architecture-agent

**File**: `.github/agents/architecture.agent.md`

**Artifact**: `docs/02-architecture.md`

**Role**: Design the system — modules, APIs, data model, deployment.

**What it does**:
1. Reads `docs/01-requirements.md` and any change logs.
2. Calls `start_stage` in MCP.
3. **Clarification gate**: stops and asks the user if any high-impact architectural decision has major tradeoffs (e.g., monolith vs. microservices, SQL vs. NoSQL).
4. Produces `docs/02-architecture.md` with:
   - Module breakdown table (module ID, name, description, key files, dependencies, complexity)
   - API contracts
   - Shared interfaces/types
   - CI/CD and deployment considerations
   - Security considerations
   - Rollback strategy
   - Three mandatory **Mermaid diagrams** (validated with `renderMermaidDiagram` before the checkpoint is saved):
     - **Component diagram** — all modules and their dependency edges
     - **Sequence diagram** — primary user flow end-to-end through the stack
     - **ER diagram** — all persistent entities with fields and cardinality

5. Calls `advance_stage` and hands off to `coding-agent`.

**Diagram gate**: a Mermaid diagram that fails `renderMermaidDiagram` is a **blocker** — the stage cannot be checkpointed until all three diagrams render successfully.

---

### STAGE 3 — coding-agent + module-coding-agent

**Files**: `.github/agents/coding.agent.md`, `.github/agents/module-coding-agent.agent.md`

**Artifact**: `docs/03-implementation-log.md`

**Role**: Implement the solution module by module.

**How the two-level structure works**:

```
coding-agent (coordinator)
  └── module-coding-agent (implementor, one per module)
  └── module-coding-agent (implementor, one per module)
  └── module-coding-agent (implementor, one per module)
      ...
```

`coding-agent` **never implements code itself** on multi-module projects. It:
1. Reads the Module Breakdown Table from `docs/02-architecture.md`.
2. Calls `get_subtasks` to check which modules are already complete (to skip them on resume).
3. For each pending module, spawns `module-coding-agent` as a subagent with:
   - `moduleId`
   - `moduleDescription`
   - `moduleKeyFiles` — exact file paths from the architecture table
4. Waits for confirmation, then calls `save_stage_checkpoint`.
5. After all modules, verifies the build passes.
6. Calls `advance_stage`.

`module-coding-agent`:
- Is scoped to **exactly one module** — it never touches files outside its scope.
- Registers itself as a subtask with `register_subtask`.
- Implements the module, writes tests, and calls `complete_subtask` when done.
- **Does not spawn further subagents** — nesting is capped at coding-agent → module-coding-agent.

**Context window discipline**: `coding-agent` uses `#codebase` (semantic search) to find files narrowly. It never reads entire directories. For long sessions it uses `/compact` with focus instructions to free context space.

---

### STAGE 4 — integration-testing-agent

**File**: `.github/agents/integration-testing-agent.agent.md`

**Artifact**: `docs/03c-integration-test-report.md`

**Role**: Cross-module sanity check — proves the modules actually work together before formal testing begins.

**What it does**:
1. Starts the full application stack using terminal tools.
2. Verifies API wiring between modules (real HTTP calls, not mocked).
3. Checks that data flows correctly end-to-end across module boundaries.
4. Embeds a **Mermaid sequence diagram** showing the verified cross-module call flow (validated with `renderMermaidDiagram`).
5. Reports any BLOCKERs — if any exist, the pipeline **cannot proceed** to formal testing.
6. Calls `advance_stage` only when no BLOCKERs remain.

**Gate**: this stage gates entry into testing. It exists specifically to catch integration bugs that unit tests alone cannot find — wiring mismatches, missing environment variables, incorrect API contracts.

---

### STAGE 5 — testing-agent

**File**: `.github/agents/testing.agent.md`

**Artifact**: `docs/04-testing-report.md`

**Role**: Comprehensive test execution — unit, integration, E2E, and accessibility.

**What it does**:
1. Reads `docs/01-requirements.md` to extract all acceptance criteria IDs (AC-01, AC-02 …).
2. Creates or updates **real test files** in the codebase (not just reports).
3. Runs unit tests, integration tests, and E2E tests (via Playwright).
4. Runs accessibility checks.
5. Produces `docs/04-testing-report.md` with a **traceability matrix**: `AC-01 → test file:line`, `AC-02 → test file:line`, etc.
6. Takes and saves E2E screenshots to `docs/screenshots/`.

**Non-negotiable policy**:
- Every acceptance criterion must have a mapped test.
- If any AC is untested, the workflow **cannot be approved** in review.
- The `review-agent` returns `changes required` if the traceability matrix has gaps.

**If tests fail**: `testing-agent` invokes `bugfix-agent`.

---

### STAGE 5b — bugfix-agent (conditional loop)

**File**: `.github/agents/bugfix.agent.md`

**Artifact**: `docs/03b-bugfix-log.md`

**Role**: Fix failures detected by the testing agent and loop back for re-verification.

**What it does**:
1. Reads test failure output.
2. Traces failures to the relevant module's implementation.
3. Applies targeted fixes (does not refactor unrelated code).
4. Writes to `docs/03b-bugfix-log.md`.
5. **Re-invokes `testing-agent`** after fixes to confirm all tests pass.

The loop continues until testing passes or an unresolvable blocker is reported.

---

### STAGE 6 — review-agent

**File**: `.github/agents/review.agent.md`

**Artifact**: `docs/05-review-report.md`

**Role**: Quality gate — security audit, coverage verification, architecture conformance.

**What it does**:
1. Invokes the `/security-review` skill (defined in `.github/skills/security-review/SKILL.md`).
2. Audits the codebase against the **OWASP Top 10**.
3. Checks for architecture drift — any module in the architecture spec that was not implemented is a `changes required` flag.
4. Verifies the traceability matrix in `docs/04-testing-report.md` — any AC without a test mapping is a `changes required` flag.
5. Produces `docs/05-review-report.md` with verdict: **approved** or **changes required**.

**Verdict rules**:
- `changes required` if: critical/high OWASP findings exist, any module is unimplemented, or any AC is untested.
- `approved` only when all gates pass.

**Gate**: deployment does not run unless review verdict is `approved`.

---

### STAGE 7 — deployment-agent

**File**: `.github/agents/deployment-agent.agent.md`

**Artifact**: `docs/06-deployment-report.md`

**Role**: Build, containerize, deploy to local staging, and smoke test. **Staging only — never production.**

**What it does**:
1. Confirms `review-agent` stage was advanced (approved).
2. Detects the tech stack (Node.js, Python, Next.js, etc.) and reads `Dockerfile`, `docker-compose.yml`, `.env.example`.
3. Generates a `Dockerfile` if one doesn't exist (multi-stage, minimal, secure).
4. Builds the Docker image.
5. Starts the container with `docker-compose up -d`.
6. Runs three smoke tests:
   - **Health check** — HTTP GET to `/health` or equivalent.
   - **Browser screenshot** — opens the app in a browser, takes a screenshot, saves to `docs/screenshots/`.
   - **Critical user flow** — runs a Playwright script simulating the primary happy path.
7. Writes results to `docs/06-deployment-report.md`.
8. Calls `complete_workflow` in MCP **only after all smoke tests pass**.

---

## SECTION 5 — HANDOFF MECHANICS

Each agent's `.agent.md` file defines `handoffs` — structured transitions to the next agent.

```yaml
handoffs:
  - label: Continue To Architecture
    agent: architecture-agent
    prompt: Build architecture from docs/01-requirements.md.
    send: true   # automatically sends in automatic mode
```

- `send: true` — the agent dispatches this handoff automatically in automatic mode.
- `send: false` — the agent presents the handoff as a button for the user to click in approval mode.

This is how the pipeline moves forward without human intervention in automatic mode.

---

## SECTION 6 — MID-FLOW REQUIREMENT CHANGES

If the user wants to change requirements **after the pipeline has already started**, they type `/request-requirement-change`. The pipeline does NOT restart from scratch.

**How it works**:
1. `requirements-agent` opens a `CHG-NN` entry in MCP state via `create_change_request`.
2. It determines the **earliest affected rollback stage** using impact rules:
   - Scope/persona/platform changes → roll back to `requirements-agent`
   - Module/API/data-model changes → roll back to `architecture-agent`
   - Implementation-only changes → roll back to `coding-agent`
   - AC/verification changes → roll back to `testing-agent`
   - Sign-off only stale → roll back to `review-agent`
3. Calls `rollback_to_stage` in MCP.
4. Updates `docs/01-requirements.md` and `docs/01b-change-log.md` with the change ID and affected artifacts.
5. Re-invokes the rollback target agent to regenerate only what changed.

**Mode override**: in approval mode, the user is asked exactly once whether the reroute should run automatically. If yes, `set_execution_mode_override` sets a temporary automatic mode just for that reroute. The base mode is not changed.

---

## SECTION 7 — INTERRUPTION RECOVERY

If VS Code is closed, the agent times out, or the session is interrupted mid-stage:

1. The user types `/start-multi-agent-flow` again (or re-invokes the orchestrator).
2. The orchestrator calls `get_workflow_state` and `get_resume_target`.
3. MCP returns the `activeStage` — the stage that was in progress.
4. The orchestrator tells the resumed agent to call `get_stage_checkpoint` first.
5. The agent reads the checkpoint summary and continues from where it left off.

For the coding stage specifically, `get_subtasks` is used — any module already marked `completed` is **skipped entirely**. Only pending modules are re-implemented.

---

## SECTION 8 — WORKSPACE STRUCTURE

```
.github/
  copilot-instructions.md         ← workspace-wide rules for all agents
  instructions/
    multi-agent-flow.instructions.md  ← stage-transition rules (applies to *.agent.md)
  agents/
    orchestrator.agent.md
    requirements.agent.md
    architecture.agent.md
    coding.agent.md
    module-coding-agent.agent.md
    integration-testing-agent.agent.md
    testing.agent.md
    bugfix.agent.md
    review.agent.md
    deployment-agent.agent.md
  prompts/
    start-multi-agent-flow.prompt.md   ← user entry point
    request-requirement-change.prompt.md
  skills/
    security-review/SKILL.md          ← OWASP audit skill (lazy-loaded by review-agent)

mcp/
  workflow-control-server.mjs     ← the MCP server (Node.js)

.vscode/
  mcp.json                        ← registers workflowControl MCP server in VS Code
  settings.json                   ← enables subagent nesting, autopilot, etc.

docs/
  01-requirements.md
  01b-change-log.md
  02-architecture.md
  03-implementation-log.md
  03b-bugfix-log.md
  04-testing-report.md
  03c-integration-test-report.md
  05-review-report.md
  06-deployment-report.md
  screenshots/

.workflow/
  state.json                      ← MCP server persists all state here

scripts/
  validate-workflow.mjs           ← runs `npm run validate` to catch bad prompt patterns
```

---

## SECTION 9 — FULL FLOW DIAGRAM

```
User: /start-multi-agent-flow "build a todo app with auth"
         │
         ▼
  ┌─────────────────┐
  │ orchestrator    │  ← reads MCP state, picks mode
  └────────┬────────┘
           │ set_execution_mode("automatic") via MCP
           ▼
  ┌─────────────────┐
  │ requirements    │  ← start_stage, clarify, write docs/01, advance_stage
  └────────┬────────┘
           │ (automatic handoff)
           ▼
  ┌─────────────────┐
  │ architecture    │  ← start_stage, design + Mermaid diagrams, write docs/02, advance_stage
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ coding          │  ← start_stage, read subtasks, delegate per module
  │  └ module-1     │    register_subtask → implement → complete_subtask
  │  └ module-2     │    save_stage_checkpoint after each module
  │  └ module-N     │    advance_stage when all done
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────┐
  │ integration-testing │  ← start stack, verify wiring, Mermaid diagram, no BLOCKERs gate
  └────────┬────────────┘
           │
           ▼
  ┌─────────────────┐
  │ testing         │  ← unit + E2E + a11y, traceability matrix, screenshots
  └────────┬────────┘
           │ (if failures)
           ▼
  ┌─────────────────┐
  │ bugfix (loop)   │  ← fix → re-invoke testing until green
  └────────┬────────┘
           │ (all pass)
           ▼
  ┌─────────────────┐
  │ review          │  ← OWASP audit, architecture drift check, coverage check
  └────────┬────────┘
           │ (approved)
           ▼
  ┌─────────────────┐
  │ deployment      │  ← Docker build, docker-compose up, smoke tests, screenshot
  └────────┬────────┘
           │ (all smoke tests pass)
           ▼
     complete_workflow() via MCP
     Final delivery summary
```

---

## SECTION 10 — KEY DESIGN PRINCIPLES

| Principle | How it is enforced |
|---|---|
| **No data loss on interruption** | MCP `save_stage_checkpoint` + `get_stage_checkpoint` on every resume |
| **No redundant work** | `get_subtasks` skips completed modules; `activeStage` prevents stage restarts |
| **No context overflow** | `#codebase` semantic search instead of reading directories; `/compact` for long sessions; module-coding-agent keeps scope to one module |
| **No silent assumptions** | Clarification gates in requirements and architecture phases use `askQuestions` carousel |
| **No skipped security** | `/security-review` skill is mandatory in review phase; OWASP findings block approval |
| **No missing test coverage** | Traceability matrix is required; review blocks approval if any AC is untested |
| **No staging → production accidents** | deployment-agent is explicitly scoped to local Docker staging only |
| **Nesting depth capped** | coding-agent → module-coding-agent only; module-coding-agent cannot spawn subagents |

---

## SECTION 11 — HOW TO RUN IT

### Prerequisites

```bash
npm.cmd install          # Windows PowerShell (avoids execution policy block)
# or
npm install              # bash / standard terminal
```

### Start

1. Open VS Code in this workspace.
2. Open Command Palette → `MCP: List Servers` → confirm `workflowControl` is running.
3. Switch Chat to **Agent mode**.
4. For unattended runs: set Chat permission to **Autopilot** or **Bypass Approvals**.
5. Type:
   ```
   /start-multi-agent-flow
   ```
6. Enter your goal when prompted (e.g., "a full-stack todo app with auth and REST API").

### Validate before first use

```bash
npm.cmd run validate
```

This runs `scripts/validate-workflow.mjs` which catches bad prompt patterns, non-existent tool references, and invalid agent configurations.

### Mid-flow requirement change

```
/request-requirement-change
```

Describe the change — the pipeline calculates the rollback target and reruns only the affected stages.

---

*This script covers the complete end-to-end pipeline as defined in this workspace. All behavior described is implemented in the agent `.md` files, the MCP server, and the VS Code configuration in this repository.*
