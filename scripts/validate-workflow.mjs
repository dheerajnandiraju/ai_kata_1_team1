import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  ".github/copilot-instructions.md",
  ".github/prompts/start-multi-agent-flow.prompt.md",
  ".github/prompts/request-requirement-change.prompt.md",
  ".github/agents/orchestrator.agent.md",
  ".github/agents/requirements.agent.md",
  ".github/agents/architecture.agent.md",
  ".github/agents/coding.agent.md",
  ".github/agents/module-coding-agent.agent.md",
  ".github/agents/integration-testing-agent.agent.md",
  ".github/agents/testing.agent.md",
  ".github/agents/bugfix.agent.md",
  ".github/agents/review.agent.md",
  ".github/agents/deployment-agent.agent.md",
  ".github/skills/e2e-testing/SKILL.md",
  ".github/skills/security-review/SKILL.md",
  ".vscode/settings.json",
  ".vscode/mcp.json",
  "mcp/workflow-control-server.mjs",
  "docs/01-requirements.md",
  "docs/01b-change-log.md",
  "docs/02-architecture.md",
  "docs/03-implementation-log.md",
  "docs/03b-bugfix-log.md",
  "docs/03c-integration-test-report.md",
  "docs/04-testing-report.md",
  "docs/05-review-report.md",
  "docs/06-deployment-report.md",
  "docs/screenshots/.gitkeep"
];

const requiredPatterns = [
  {
    file: "mcp/workflow-control-server.mjs",
    pattern: /const STAGE_ARTIFACTS = Object\.freeze\(/,
    message: "workflow-control-server must define STAGE_ARTIFACTS for artifact gating."
  },
  {
    file: "mcp/workflow-control-server.mjs",
    pattern: /allowWithoutDeployment/,
    message: "workflow-control-server must guard deployment skips explicitly."
  },
  {
    file: "mcp/workflow-control-server.mjs",
    pattern: /activeStage|get_resume_target|create_change_request/,
    message: "workflow-control-server must support active-stage resume and change requests."
  },
  {
    file: "mcp/workflow-control-server.mjs",
    pattern: /set_execution_mode_override|clear_execution_mode_override|effectiveExecutionMode/,
    message: "workflow-control-server must support temporary execution-mode overrides for change reroutes."
  },
  {
    file: ".github/agents/orchestrator.agent.md",
    pattern: /get_resume_target|active stage|next untouched stage/i,
    message: "orchestrator-agent must resume from active or next untouched stage instead of restarting blindly."
  },
  {
    file: ".github/agents/orchestrator.agent.md",
    pattern: /Approval pauses are for the agent to execute the next phase here|not to hand commands back to the user/i,
    message: "orchestrator-agent must treat approval pauses as agent-run execution, not manual user-run steps."
  },
  {
    file: ".github/agents/requirements.agent.md",
    pattern: /docs\/01b-change-log\.md|create_change_request|rollback target|set_execution_mode_override|clear_execution_mode_override/i,
    message: "requirements-agent must manage and route mid-flow requirement changes."
  },
  {
    file: ".github/prompts/request-requirement-change.prompt.md",
    pattern: /continue automatically|approval pauses|temporary execution-mode override/i,
    message: "request-requirement-change prompt must explain the one-time automatic continuation choice."
  },
  {
    file: ".github/prompts/start-multi-agent-flow.prompt.md",
    pattern: /must run those actions here through the available tools|must not default to telling the user to run commands locally/i,
    message: "start-multi-agent-flow prompt must keep terminal and browser execution inside the agent flow."
  },
  {
    file: ".github/agents/architecture.agent.md",
    pattern: /one runtime boundary|backend and frontend scaffolding|exact workspace-relative paths/i,
    message: "architecture-agent must produce narrow modules with exact key file paths."
  },
  {
    file: ".github/agents/coding.agent.md",
    pattern: /moduleKeyFiles|exact file list|vague scopes/i,
    message: "coding-agent must pass exact file scopes to module-coding-agent."
  },
  {
    file: ".github/agents/module-coding-agent.agent.md",
    pattern: /moduleKeyFiles|No broad rediscovery|lightest targeted validation/i,
    message: "module-coding-agent must work file-first and avoid redundant semantic rediscovery."
  },
  {
    file: ".github/agents/coding.agent.md",
    pattern: /first check the subtask list from step 4|skip it immediately.*do NOT invoke/i,
    message: "coding-agent must skip completed modules in the loop itself, not rely solely on the subagent."
  },
  {
    file: ".github/agents/module-coding-agent.agent.md",
    pattern: /Read existing files before writing|do not overwrite it from scratch|Attempt to read the file/i,
    message: "module-coding-agent must read existing files before writing to prevent full-file overwrites."
  },
  {
    file: ".github/agents/architecture.agent.md",
    pattern: /renderMermaidDiagram/,
    message: "architecture-agent must use renderMermaidDiagram to validate all Mermaid diagrams."
  },
  {
    file: ".github/agents/architecture.agent.md",
    pattern: /Component diagram|Sequence diagram|ER diagram/i,
    message: "architecture-agent must mandate all three UML diagrams: component, sequence, and ER."
  },
  {
    file: ".github/agents/integration-testing-agent.agent.md",
    pattern: /renderMermaidDiagram/,
    message: "integration-testing-agent must use renderMermaidDiagram to validate the integration sequence diagram."
  },
  {
    file: ".github/agents/integration-testing-agent.agent.md",
    pattern: /Verified Call Flow|sequenceDiagram/i,
    message: "integration-testing-agent must embed a Mermaid sequence diagram of the verified call flow in the report."
  },
  {
    file: ".github/copilot-instructions.md",
    pattern: /UML Diagrams \(Mermaid\)|renderMermaidDiagram.*blocker/i,
    message: "copilot instructions must include UML diagram rules and renderMermaidDiagram validation requirement."
  },
  {
    file: ".github/agents/review.agent.md",
    pattern: /allowWithoutDeployment: true/,
    message: "review-agent must document the audited deployment skip path."
  },
  {
    file: ".github/agents/testing.agent.md",
    pattern: /execute\/getTerminalOutput/,
    message: "testing-agent must rely on terminal output retrieval rather than invented wait helpers."
  },
  {
    file: ".vscode/settings.json",
    pattern: /"chat\.useAgentSkills": true/,
    message: "VS Code settings must enable agent skills."
  },
  {
    file: ".vscode/settings.json",
    pattern: /"chat\.useCustomAgentHooks": true/,
    message: "VS Code settings must enable custom agent hooks."
  },
  {
    file: ".github/copilot-instructions.md",
    pattern: /exact key files|scaffolding should create the named files directly/i,
    message: "copilot instructions must prefer exact file paths over rediscovery for scaffold work."
  },
  {
    file: ".github/copilot-instructions.md",
    pattern: /Phase-specific skills are lazy-loaded|Do not load them during .*start-multi-agent-flow/i,
    message: "copilot instructions must keep phase-specific skills lazy-loaded until their owning stage."
  },
  {
    file: ".github/copilot-instructions.md",
    pattern: /must execute those steps inside the agent flow|Do not hand runnable commands back to the user/i,
    message: "copilot instructions must require terminal and browser work to stay inside the agent flow."
  },
  {
    file: ".github/skills/e2e-testing/SKILL.md",
    pattern: /Only load this skill when the workflow is actively\s+in the testing phase|Do not load it during workflow startup/i,
    message: "e2e-testing skill must be explicitly gated to the testing phase."
  },
  {
    file: ".github/skills/e2e-testing/SKILL.md",
    pattern: /disable-model-invocation:\s*true/i,
    message: "e2e-testing skill must have disable-model-invocation: true to prevent auto-loading at startup."
  },
  {
    file: ".github/skills/security-review/SKILL.md",
    pattern: /Only load this skill during the review phase|Do not load it during workflow startup/i,
    message: "security-review skill must be explicitly gated to the review phase."
  },
  {
    file: ".github/skills/security-review/SKILL.md",
    pattern: /disable-model-invocation:\s*true/i,
    message: "security-review skill must have disable-model-invocation: true to prevent auto-loading at startup."
  },
  {
    file: ".github/agents/integration-testing-agent.agent.md",
    pattern: /Do not ask the user whether to run them|Do not create placeholder reports|do not repeat the same/i,
    message: "integration-testing-agent must execute here, avoid placeholder executions, and avoid duplicate summaries."
  },
  {
    file: ".github/agents/testing.agent.md",
    pattern: /Do not ask the user to run them|run these locally and share logs|Emit one concise execution outcome/i,
    message: "testing-agent must execute tests here and avoid manual-log fallback by default."
  },
  {
    file: ".github/agents/deployment-agent.agent.md",
    pattern: /execute build, compose, and smoke-test commands directly|Do not output duplicated deployment status blocks/i,
    message: "deployment-agent must execute deployment steps here and avoid duplicate status summaries."
  },
  {
    file: ".github/agents/bugfix.agent.md",
    pattern: /Re-run the relevant tests here|Do not hand those test commands back to the user/i,
    message: "bugfix-agent must re-run tests here instead of delegating shell work to the user."
  }
];

const forbiddenPatterns = [
  {
    file: ".github/agents/testing.agent.md",
    pattern: /awaitTerminal/,
    message: "testing-agent still references awaitTerminal, which is not part of this workflow."
  },
  {
    file: ".github/skills/e2e-testing/SKILL.md",
    pattern: /chromium\.launch|require\(['\"]playwright['\"]\)/,
    message: "e2e-testing skill must use the integrated browser page, not launch a separate Playwright browser."
  },
  {
    file: ".github/agents/deployment-agent.agent.md",
    pattern: /chromium\.launch|require\(['\"]playwright['\"]\)/,
    message: "deployment-agent must use run_playwright_code on the existing browser page."
  },
  {
    file: ".github/agents/orchestrator.agent.md",
    pattern: /resume from the current stage\. Do NOT restart from requirements\./,
    message: "orchestrator-agent still uses the old resume rule based only on currentStage."
  },
  {
    file: ".github/agents/module-coding-agent.agent.md",
    pattern: /^\s{2}- workflowControl\/get_subtasks\r?\n\s{3}- workflowControl\/save_stage_checkpoint\r?\n\s{2}- search\/codebase/m,
    message: "module-coding-agent tools list contains a malformed save_stage_checkpoint entry."
  },
  {
    file: ".github/agents/module-coding-agent.agent.md",
    pattern: /^\s+- agent$/m,
    message: "module-coding-agent must not spawn nested subagents."
  }
];

const failures = [];

async function readWorkspaceFile(relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  return fs.readFile(absolutePath, "utf8");
}

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(workspaceRoot, relativePath);

  try {
    await fs.access(absolutePath);
  } catch {
    failures.push(`Missing required file: ${relativePath}`);
  }
}

for (const check of requiredPatterns) {
  const content = await readWorkspaceFile(check.file);
  if (!check.pattern.test(content)) {
    failures.push(check.message);
  }
}

for (const check of forbiddenPatterns) {
  const content = await readWorkspaceFile(check.file);
  if (check.pattern.test(content)) {
    failures.push(check.message);
  }
}

if (failures.length > 0) {
  console.error("Workflow validation failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Workflow validation passed.");
}