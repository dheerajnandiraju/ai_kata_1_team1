import fs from "node:fs/promises";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const STAGES = [
  "requirements-agent",
  "architecture-agent",
  "coding-agent",
  "integration-testing-agent",   // cross-module sanity: starts stack, tests wiring
  "testing-agent",               // formal: unit + integration + E2E + a11y
  "review-agent",
  "deployment-agent"             // Docker build + staging deploy + smoke tests
];

const CHANGE_REQUEST_STATUSES = [
  "open",
  "assessed",
  "applied",
  "rejected",
  "superseded"
];

const STAGE_ARTIFACTS = Object.freeze({
  "requirements-agent": "docs/01-requirements.md",
  "architecture-agent": "docs/02-architecture.md",
  "coding-agent": "docs/03-implementation-log.md",
  "integration-testing-agent": "docs/03c-integration-test-report.md",
  "testing-agent": "docs/04-testing-report.md",
  "review-agent": "docs/05-review-report.md",
  "deployment-agent": "docs/06-deployment-report.md"
});

const REVIEW_STAGE_INDEX = STAGES.indexOf("review-agent");
const DEPLOYMENT_STAGE_INDEX = STAGES.indexOf("deployment-agent");
const MAX_HISTORY = 100;

const statePath = process.env.WORKFLOW_STATE_PATH
  ? path.resolve(process.env.WORKFLOW_STATE_PATH)
  : path.resolve(process.cwd(), ".workflow", "state.json");

function defaultState() {
  return {
    executionMode: null,
    executionModeOverride: null,
    currentStageIndex: -1,
    activeStage: null,
    stageCheckpoints: {},
    completed: false,
    subtasks: {},
    history: [],
    artifacts: {},
    changeRequests: []
  };
}

function normalizeStage(raw) {
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();
  return STAGES.includes(value) ? value : null;
}

function normalizeMode(raw) {
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim().toLowerCase();
  if (value === "automatic" || value === "approval") {
    return value;
  }

  return null;
}

function getEffectiveExecutionMode(state) {
  return normalizeMode(state?.executionModeOverride) ?? normalizeMode(state?.executionMode);
}

function textResult(data, isError = false) {
  return {
    isError,
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

function normalizeArtifactPath(raw) {
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();
  if (!value) {
    return null;
  }

  return value.replace(/\\/g, "/");
}

function normalizeChangeRequestStatus(raw) {
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim().toLowerCase();
  return CHANGE_REQUEST_STATUSES.includes(value) ? value : null;
}

function normalizeStageList(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(normalizeStage).filter(Boolean);
}

function normalizeArtifactList(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map(normalizeArtifactPath).filter(Boolean);
}

function buildCheckpoint(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  return {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    artifactPath: normalizeArtifactPath(raw.artifactPath),
    status: typeof raw.status === "string" ? raw.status : "in-progress",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null
  };
}

function buildChangeRequest(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const details = typeof raw.details === "string" ? raw.details.trim() : "";

  if (!id || !title || !details) {
    return null;
  }

  return {
    id,
    title,
    details,
    impactHint: typeof raw.impactHint === "string" ? raw.impactHint.trim() : "",
    impactSummary: typeof raw.impactSummary === "string" ? raw.impactSummary.trim() : "",
    notes: typeof raw.notes === "string" ? raw.notes.trim() : "",
    status: normalizeChangeRequestStatus(raw.status) ?? "open",
    requestedByStage: normalizeStage(raw.requestedByStage),
    rollbackStage: normalizeStage(raw.rollbackStage),
    affectedStages: normalizeStageList(raw.affectedStages),
    affectedArtifacts: normalizeArtifactList(raw.affectedArtifacts),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    resolvedAt: typeof raw.resolvedAt === "string" ? raw.resolvedAt : null
  };
}

function resolveWorkspacePath(filePath) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

async function fileExists(filePath) {
  try {
    await fs.access(resolveWorkspacePath(filePath));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function ensureStageArtifactExists(stage, requestedArtifactPath, state) {
  const artifactPath =
    normalizeArtifactPath(requestedArtifactPath) ??
    normalizeArtifactPath(state?.artifacts?.[stage]) ??
    normalizeArtifactPath(state?.stageCheckpoints?.[stage]?.artifactPath) ??
    STAGE_ARTIFACTS[stage] ??
    null;

  if (!artifactPath) {
    return null;
  }

  if (!(await fileExists(artifactPath))) {
    throw new Error(
      `Stage '${stage}' requires artifact '${artifactPath}' to exist before it can be completed.`
    );
  }

  return artifactPath;
}

function trimHistory(state) {
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }
}

function appendHistory(state, stage, summary) {
  state.history.push({
    stage,
    summary,
    timestamp: new Date().toISOString()
  });
  trimHistory(state);
}

function updateStageCheckpoint(state, stage, values = {}) {
  const existing = buildCheckpoint(state.stageCheckpoints[stage]) ?? {
    summary: "",
    artifactPath: null,
    status: "in-progress",
    updatedAt: null
  };

  const nextSummary =
    typeof values.summary === "string" && values.summary.trim()
      ? values.summary.trim()
      : existing.summary;

  const nextArtifactPath =
    values.artifactPath !== undefined
      ? normalizeArtifactPath(values.artifactPath)
      : existing.artifactPath;

  const nextStatus =
    typeof values.status === "string" && values.status.trim()
      ? values.status.trim()
      : existing.status;

  state.stageCheckpoints[stage] = {
    summary: nextSummary,
    artifactPath: nextArtifactPath,
    status: nextStatus,
    updatedAt: new Date().toISOString()
  };
}

function nextChangeRequestId(state) {
  const maxId = state.changeRequests.reduce((maxValue, changeRequest) => {
    const match = /^CHG-(\d+)$/.exec(changeRequest.id ?? "");
    if (!match) {
      return maxValue;
    }

    return Math.max(maxValue, Number.parseInt(match[1], 10));
  }, 0);

  return `CHG-${String(maxId + 1).padStart(2, "0")}`;
}

function getChangeRequestOrThrow(state, changeId) {
  const request = state.changeRequests.find(entry => entry.id === changeId);
  if (!request) {
    throw new Error(`Change request '${changeId}' was not found.`);
  }

  return request;
}

function resetStageAndDescendants(state, targetIndex) {
  const clearedStages = STAGES.slice(targetIndex);

  for (const stage of clearedStages) {
    delete state.artifacts[stage];
    delete state.subtasks[stage];
    delete state.stageCheckpoints[stage];
  }

  if (state.activeStage && STAGES.indexOf(state.activeStage) >= targetIndex) {
    state.activeStage = null;
  }

  state.completed = false;
  return clearedStages;
}

async function assertCompletionReadiness(state, options = {}) {
  const allowWithoutDeployment = options.allowWithoutDeployment === true;

  if (state.activeStage) {
    throw new Error(
      `Workflow cannot be completed while stage '${state.activeStage}' is still in progress.`
    );
  }

  const requiredStages = allowWithoutDeployment
    ? STAGES.slice(0, REVIEW_STAGE_INDEX + 1)
    : STAGES;

  for (const stage of requiredStages) {
    const artifactPath = await ensureStageArtifactExists(stage, null, state);
    if (artifactPath) {
      state.artifacts[stage] = artifactPath;
    }
  }
}

async function ensureStateDir() {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
}

async function loadState() {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);

    // Validate types to prevent silent corruption
    const stageIndex =
      typeof parsed.currentStageIndex === "number" &&
      Number.isInteger(parsed.currentStageIndex) &&
      parsed.currentStageIndex >= -1 &&
      parsed.currentStageIndex < STAGES.length
        ? parsed.currentStageIndex
        : -1;

    return {
      ...defaultState(),
      ...parsed,
      currentStageIndex: stageIndex,
      executionMode: normalizeMode(parsed.executionMode),
      executionModeOverride: normalizeMode(parsed.executionModeOverride),
      activeStage: normalizeStage(parsed.activeStage),
      history: Array.isArray(parsed.history) ? parsed.history : [],
      stageCheckpoints:
        parsed.stageCheckpoints && typeof parsed.stageCheckpoints === "object"
          ? Object.fromEntries(
              Object.entries(parsed.stageCheckpoints)
                .filter(([stage, checkpoint]) => STAGES.includes(stage) && buildCheckpoint(checkpoint))
                .map(([stage, checkpoint]) => [stage, buildCheckpoint(checkpoint)])
            )
          : {},
      subtasks:
        parsed.subtasks && typeof parsed.subtasks === "object"
          ? Object.fromEntries(
              Object.entries(parsed.subtasks)
                .filter(([stage, tasks]) => STAGES.includes(stage) && Array.isArray(tasks))
                .map(([stage, tasks]) => [stage, tasks])
            )
          : {},
      artifacts:
        parsed.artifacts && typeof parsed.artifacts === "object"
          ? Object.fromEntries(
              Object.entries(parsed.artifacts)
                .filter(([stage]) => STAGES.includes(stage))
                .map(([stage, artifactPath]) => [stage, normalizeArtifactPath(artifactPath)])
                .filter(([, artifactPath]) => artifactPath)
            )
          : {},
      changeRequests: Array.isArray(parsed.changeRequests)
        ? parsed.changeRequests.map(buildChangeRequest).filter(Boolean)
        : []
    };
  } catch (err) {
    // Log real errors (not just missing file) so they are visible in MCP output
    if (err.code !== "ENOENT") {
      process.stderr.write(
        `[workflow-control] WARNING: failed to load state from ${statePath}: ${err.message}\n`
      );
    }
    return defaultState();
  }
}

async function saveState(state) {
  await ensureStateDir();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

function getNextStageFromIndex(index) {
  const nextIndex = index + 1;
  if (nextIndex < 0 || nextIndex >= STAGES.length) {
    return null;
  }

  return STAGES[nextIndex];
}

const server = new Server(
  {
    name: "workflow-control",
    version: "2.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_execution_mode",
        description: "Get the workflow execution mode (automatic or approval).",
        annotations: {
          title: "Get Execution Mode",
          readOnlyHint: true
        },
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "set_execution_mode",
        description: "Set workflow execution mode to automatic or approval. Can only be set before the workflow starts (i.e. before any stage has been advanced).",
        annotations: {
          title: "Set Execution Mode"
        },
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["automatic", "approval"]
            }
          },
          required: ["mode"],
          additionalProperties: false
        }
      },
      {
        name: "set_execution_mode_override",
        description: "Temporarily override the effective workflow mode mid-run without changing the persisted base mode. Useful for continuing a requirement change automatically after one explicit approval.",
        annotations: {
          title: "Set Execution Mode Override"
        },
        inputSchema: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["automatic", "approval"]
            },
            reason: {
              type: "string"
            }
          },
          required: ["mode"],
          additionalProperties: false
        }
      },
      {
        name: "clear_execution_mode_override",
        description: "Clear any temporary workflow mode override and return to the persisted base mode.",
        annotations: {
          title: "Clear Execution Mode Override"
        },
        inputSchema: {
          type: "object",
          properties: {
            reason: {
              type: "string"
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "advance_stage",
        description: "Mark a stage as complete and optionally store a summary/artifact.",
        annotations: {
          title: "Advance Workflow Stage"
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              enum: STAGES
            },
            summary: {
              type: "string"
            },
            artifactPath: {
              type: "string"
            }
          },
          required: ["stage"],
          additionalProperties: false
        }
      },
      {
        name: "start_stage",
        description: "Mark a workflow stage as in progress so interruptions can resume from the correct point.",
        annotations: {
          title: "Start Stage"
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              enum: STAGES
            },
            summary: {
              type: "string"
            },
            artifactPath: {
              type: "string"
            }
          },
          required: ["stage"],
          additionalProperties: false
        }
      },
      {
        name: "save_stage_checkpoint",
        description: "Save progress notes for an in-progress stage so the workflow can resume safely after interruption.",
        annotations: {
          title: "Save Stage Checkpoint"
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              enum: STAGES
            },
            summary: {
              type: "string"
            },
            artifactPath: {
              type: "string"
            }
          },
          required: ["stage", "summary"],
          additionalProperties: false
        }
      },
      {
        name: "get_stage_checkpoint",
        description: "Get the latest checkpoint for a stage, or for the current active stage when none is specified.",
        annotations: {
          title: "Get Stage Checkpoint",
          readOnlyHint: true
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              enum: STAGES
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "get_resume_target",
        description: "Get the correct stage to resume after interruption, preferring any in-progress stage over the next untouched stage.",
        annotations: {
          title: "Get Resume Target",
          readOnlyHint: true
        },
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "get_next_agent",
        description: "Get the next agent in sequence from current progress.",
        annotations: {
          title: "Get Next Agent",
          readOnlyHint: true
        },
        inputSchema: {
          type: "object",
          properties: {
            currentAgent: {
              type: "string",
              enum: STAGES
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "get_workflow_state",
        description: "Read current workflow state, stage progress, and artifacts.",
        annotations: {
          title: "Get Workflow State",
          readOnlyHint: true
        },
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "reset_workflow",
        description: "Reset workflow state. Requires confirm:true to prevent accidental resets mid-flow.",
        annotations: {
          title: "Reset Workflow"
        },
        inputSchema: {
          type: "object",
          properties: {
            confirm: {
              type: "boolean"
            }
          },
          required: ["confirm"],
          additionalProperties: false
        }
      },
      {
        name: "rollback_to_stage",
        description: "Roll back to a previous stage so it can be re-run (e.g. after review requires changes). The stage and all subsequent stages are reset.",
        annotations: {
          title: "Rollback To Stage"
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: {
              type: "string",
              enum: STAGES
            },
            reason: {
              type: "string"
            },
            changeRequestId: {
              type: "string"
            }
          },
          required: ["stage"],
          additionalProperties: false
        }
      },
      {
        name: "complete_workflow",
        description: "Mark the entire workflow as complete. Requires review to be complete and, by default, deployment to have passed. In approval mode, review may complete without deployment only when explicitly skipped with a reason.",
        annotations: {
          title: "Complete Workflow"
        },
        inputSchema: {
          type: "object",
          properties: {
            allowWithoutDeployment: {
              type: "boolean",
              description: "Set true only when deployment was explicitly skipped in approval mode after a successful review."
            },
            reason: {
              type: "string",
              description: "Required when allowWithoutDeployment=true so the skip is auditable."
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "create_change_request",
        description: "Register a mid-flow requirement change so it can be assessed, logged, and applied safely.",
        annotations: {
          title: "Create Change Request"
        },
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string"
            },
            details: {
              type: "string"
            },
            impactHint: {
              type: "string"
            },
            requestedByStage: {
              type: "string",
              enum: STAGES
            }
          },
          required: ["title", "details"],
          additionalProperties: false
        }
      },
      {
        name: "update_change_request",
        description: "Update a registered change request with assessment, rollback target, and application status.",
        annotations: {
          title: "Update Change Request"
        },
        inputSchema: {
          type: "object",
          properties: {
            changeId: {
              type: "string"
            },
            status: {
              type: "string",
              enum: CHANGE_REQUEST_STATUSES
            },
            impactSummary: {
              type: "string"
            },
            rollbackStage: {
              type: "string",
              enum: STAGES
            },
            affectedStages: {
              type: "array",
              items: {
                type: "string",
                enum: STAGES
              }
            },
            affectedArtifacts: {
              type: "array",
              items: {
                type: "string"
              }
            },
            notes: {
              type: "string"
            }
          },
          required: ["changeId", "status"],
          additionalProperties: false
        }
      },
      {
        name: "get_change_requests",
        description: "List registered change requests and their current status.",
        annotations: {
          title: "Get Change Requests",
          readOnlyHint: true
        },
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: CHANGE_REQUEST_STATUSES
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "register_subtask",
        description: "Register a sub-task within the current stage (e.g. a module to implement). Used by coding-agent to checkpoint module-level progress so work can resume after interruption.",
        annotations: {
          title: "Register Sub-task"
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: { type: "string", enum: STAGES },
            taskId: { type: "string", description: "Unique ID for this sub-task, e.g. 'auth-module'" },
            description: { type: "string", description: "What this sub-task covers" }
          },
          required: ["stage", "taskId", "description"],
          additionalProperties: false
        }
      },
      {
        name: "complete_subtask",
        description: "Mark a registered sub-task as complete with an optional result artifact path.",
        annotations: {
          title: "Complete Sub-task"
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: { type: "string", enum: STAGES },
            taskId: { type: "string" },
            artifactPath: { type: "string", description: "Path to the output file for this sub-task, e.g. docs/modules/auth.md" }
          },
          required: ["stage", "taskId"],
          additionalProperties: false
        }
      },
      {
        name: "get_subtasks",
        description: "Get the list of registered sub-tasks for a stage, including their completion status. Use this to resume interrupted work without re-doing completed modules.",
        annotations: {
          title: "Get Sub-tasks",
          readOnlyHint: true
        },
        inputSchema: {
          type: "object",
          properties: {
            stage: { type: "string", enum: STAGES }
          },
          required: ["stage"],
          additionalProperties: false
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  try {
    if (toolName === "get_execution_mode") {
      const state = await loadState();
      return textResult({
        executionMode: getEffectiveExecutionMode(state) ?? "unset",
        persistedExecutionMode: state.executionMode ?? "unset",
        overrideExecutionMode: state.executionModeOverride ?? "unset"
      });
    }

    if (toolName === "set_execution_mode") {
      const mode = normalizeMode(args.mode);
      if (!mode) {
        throw new Error("Invalid mode. Use 'automatic' or 'approval'.");
      }

      const state = await loadState();

      // Lock mode once the workflow has started to prevent mid-flow disruption
      if (state.currentStageIndex >= 0 && state.executionMode !== null) {
        throw new Error(
          `Cannot change execution mode mid-workflow (current stage: ${
            STAGES[state.currentStageIndex]
          }). Call reset_workflow first if you want to restart with a different mode.`
        );
      }

      state.executionMode = mode;
      await saveState(state);

      return textResult({ executionMode: mode, updated: true });
    }

    if (toolName === "set_execution_mode_override") {
      const mode = normalizeMode(args.mode);
      if (!mode) {
        throw new Error("Invalid override mode. Use 'automatic' or 'approval'.");
      }

      const state = await loadState();
      if (state.currentStageIndex < 0 && !state.activeStage) {
        throw new Error(
          "Execution mode override can only be set after the workflow has started. Use set_execution_mode before the workflow begins."
        );
      }

      state.executionModeOverride = mode;
      appendHistory(
        state,
        "mode-override",
        `Execution mode override set to ${mode}${
          typeof args.reason === "string" && args.reason.trim()
            ? `; reason: ${args.reason.trim()}`
            : ""
        }`
      );
      await saveState(state);

      return textResult({
        executionMode: getEffectiveExecutionMode(state),
        persistedExecutionMode: state.executionMode ?? "unset",
        overrideExecutionMode: state.executionModeOverride
      });
    }

    if (toolName === "clear_execution_mode_override") {
      const state = await loadState();
      const previousOverride = state.executionModeOverride ?? null;
      state.executionModeOverride = null;
      appendHistory(
        state,
        "mode-override",
        previousOverride
          ? `Execution mode override cleared${
              typeof args.reason === "string" && args.reason.trim()
                ? `; reason: ${args.reason.trim()}`
                : ""
            }`
          : "Execution mode override clear requested when no override was active."
      );
      await saveState(state);

      return textResult({
        executionMode: getEffectiveExecutionMode(state) ?? "unset",
        persistedExecutionMode: state.executionMode ?? "unset",
        overrideExecutionMode: "unset",
        cleared: previousOverride !== null
      });
    }

    if (toolName === "start_stage") {
      const stage = normalizeStage(args.stage);
      if (!stage) {
        throw new Error("Unknown stage.");
      }

      const state = await loadState();
      if (state.completed) {
        throw new Error("Workflow is already complete. Call reset_workflow or rollback_to_stage before starting a stage again.");
      }

      const stageIndex = STAGES.indexOf(stage);
      const expectedStage = getNextStageFromIndex(state.currentStageIndex);
      const resumingActiveStage = state.activeStage === stage;

      if (state.activeStage && state.activeStage !== stage) {
        throw new Error(
          `Cannot start '${stage}' while '${state.activeStage}' is already in progress.`
        );
      }

      if (!resumingActiveStage && stageIndex !== state.currentStageIndex + 1) {
        throw new Error(
          `Cannot start '${stage}' now. Expected '${expectedStage ?? "none"}' based on current workflow progress.`
        );
      }

      const existingCheckpoint = state.stageCheckpoints[stage] ?? null;
      state.activeStage = stage;
      updateStageCheckpoint(state, stage, {
        summary: typeof args.summary === "string" ? args.summary : undefined,
        artifactPath: args.artifactPath,
        status: "in-progress"
      });
      await saveState(state);

      return textResult({
        activeStage: stage,
        resumed: resumingActiveStage || Boolean(existingCheckpoint),
        checkpoint: state.stageCheckpoints[stage] ?? null,
        nextAgent: getNextStageFromIndex(state.currentStageIndex)
      });
    }

    if (toolName === "save_stage_checkpoint") {
      const stage = normalizeStage(args.stage);
      const summary = typeof args.summary === "string" ? args.summary.trim() : "";

      if (!stage) {
        throw new Error("Unknown stage.");
      }

      if (!summary) {
        throw new Error("summary is required.");
      }

      const state = await loadState();
      if (state.activeStage !== stage) {
        throw new Error(
          `Cannot save a checkpoint for '${stage}' because the active stage is '${state.activeStage ?? "none"}'.`
        );
      }

      updateStageCheckpoint(state, stage, {
        summary,
        artifactPath: args.artifactPath,
        status: "in-progress"
      });
      await saveState(state);

      return textResult({
        stage,
        checkpoint: state.stageCheckpoints[stage]
      });
    }

    if (toolName === "get_stage_checkpoint") {
      const state = await loadState();
      const stage = normalizeStage(args.stage) ?? state.activeStage;

      if (!stage) {
        return textResult({ stage: null, checkpoint: null, activeStage: state.activeStage });
      }

      return textResult({
        stage,
        activeStage: state.activeStage,
        checkpoint: state.stageCheckpoints[stage] ?? null
      });
    }

    if (toolName === "get_resume_target") {
      const state = await loadState();

      if (state.completed) {
        return textResult({
          completed: true,
          resumeTarget: null,
          reason: "workflow-complete"
        });
      }

      if (state.activeStage) {
        return textResult({
          completed: false,
          resumeTarget: state.activeStage,
          reason: "active-stage",
          checkpoint: state.stageCheckpoints[state.activeStage] ?? null,
          lastCompletedStage:
            state.currentStageIndex >= 0 ? STAGES[state.currentStageIndex] : null
        });
      }

      const nextAgent = getNextStageFromIndex(state.currentStageIndex) ?? "requirements-agent";

      return textResult({
        completed: false,
        resumeTarget: nextAgent,
        reason: state.currentStageIndex >= 0 ? "next-stage-after-completed-work" : "workflow-not-started",
        lastCompletedStage:
          state.currentStageIndex >= 0 ? STAGES[state.currentStageIndex] : null
      });
    }

    if (toolName === "advance_stage") {
      const stage = String(args.stage ?? "").trim();
      const stageIndex = STAGES.indexOf(stage);

      if (stageIndex === -1) {
        throw new Error(`Unknown stage '${stage}'.`);
      }

      const state = await loadState();
      if (state.completed) {
        throw new Error("Workflow is already complete. Call reset_workflow before advancing stages again.");
      }

      if (state.activeStage && state.activeStage !== stage) {
        throw new Error(
          `Cannot complete '${stage}' while '${state.activeStage}' is still marked as in progress.`
        );
      }

      const allowedNextIndex = state.currentStageIndex + 1;
      const isReplay = stageIndex === state.currentStageIndex;
      const isNext = stageIndex === allowedNextIndex;

      if (!isReplay && !isNext) {
        throw new Error(
          `Invalid stage transition: current=${
            state.currentStageIndex >= 0
              ? STAGES[state.currentStageIndex]
              : "none"
          }, attempted=${stage}, expected=${
            STAGES[allowedNextIndex] ?? "completed"
          }.`
        );
      }

      state.currentStageIndex = Math.max(state.currentStageIndex, stageIndex);

      const artifactPath = await ensureStageArtifactExists(stage, args.artifactPath, state);
      if (artifactPath) {
        state.artifacts[stage] = artifactPath;
      }

      updateStageCheckpoint(state, stage, {
        summary: typeof args.summary === "string" ? args.summary : undefined,
        artifactPath,
        status: "completed"
      });
      state.activeStage = null;

      if (typeof args.summary === "string" && args.summary.trim()) {
        appendHistory(state, stage, args.summary.trim());
      }

      await saveState(state);

      return textResult({
        stage,
        currentStageIndex: state.currentStageIndex,
        nextAgent: getNextStageFromIndex(state.currentStageIndex)
      });
    }

    if (toolName === "get_next_agent") {
      const state = await loadState();
      const currentAgent =
        typeof args.currentAgent === "string" && STAGES.includes(args.currentAgent)
          ? args.currentAgent
          : null;

      const baseIndex = currentAgent
        ? STAGES.indexOf(currentAgent)
        : state.currentStageIndex;

      return textResult({
        nextAgent: getNextStageFromIndex(baseIndex),
        requiresApproval: getEffectiveExecutionMode(state) !== "automatic",
        executionMode: getEffectiveExecutionMode(state) ?? "unset",
        persistedExecutionMode: state.executionMode ?? "unset",
        overrideExecutionMode: state.executionModeOverride ?? "unset",
        activeStage: state.activeStage
      });
    }

    if (toolName === "get_workflow_state") {
      const state = await loadState();
      return textResult({
        ...state,
        effectiveExecutionMode: getEffectiveExecutionMode(state) ?? "unset",
        expectedArtifacts: STAGE_ARTIFACTS,
        openChangeRequests: state.changeRequests.filter(request =>
          ["open", "assessed"].includes(request.status)
        ),
        currentStage:
          state.currentStageIndex >= 0 ? STAGES[state.currentStageIndex] : null,
        nextAgent: getNextStageFromIndex(state.currentStageIndex)
      });
    }

    if (toolName === "reset_workflow") {
      if (args.confirm !== true) {
        throw new Error(
          "reset_workflow requires confirm:true to prevent accidental data loss. Pass { confirm: true } to proceed."
        );
      }
      const prev = await loadState();
      const state = defaultState();
      await saveState(state);
      return textResult({ reset: true, previousStage: STAGES[prev.currentStageIndex] ?? null });
    }

    if (toolName === "rollback_to_stage") {
      const stage = String(args.stage ?? "").trim();
      const targetIndex = STAGES.indexOf(stage);

      if (targetIndex === -1) {
        throw new Error(`Unknown stage '${stage}'.`);
      }

      const state = await loadState();
      const reason = typeof args.reason === "string" ? args.reason.trim() : "";
      const changeRequestId =
        typeof args.changeRequestId === "string" ? args.changeRequestId.trim() : "";

      if (changeRequestId) {
        getChangeRequestOrThrow(state, changeRequestId);
      }

      if (targetIndex > state.currentStageIndex) {
        throw new Error(
          `Cannot rollback forward: current=${STAGES[state.currentStageIndex] ?? "none"}, target=${stage}.`
        );
      }

      const clearedStages = resetStageAndDescendants(state, targetIndex);

      // Roll back index to one before the target so the target stage must be re-advanced
      state.currentStageIndex = targetIndex - 1;
      appendHistory(
        state,
        "rollback",
        [
          `Rolled back to re-run ${stage}`,
          `cleared: ${clearedStages.join(", ")}`,
          changeRequestId ? `change request: ${changeRequestId}` : null,
          reason ? `reason: ${reason}` : null
        ]
          .filter(Boolean)
          .join("; ")
      );
      await saveState(state);

      return textResult({
        rolledBackTo: stage,
        clearedStages,
        activeStage: state.activeStage,
        currentStageIndex: state.currentStageIndex,
        message: `Workflow rolled back. Call advance_stage with stage='${stage}' to begin re-running it.`
      });
    }

    if (toolName === "complete_workflow") {
      const state = await loadState();
      if (state.completed) {
        return textResult({ completed: true, message: "Workflow was already complete." });
      }

      const allowWithoutDeployment = args.allowWithoutDeployment === true;
      const reason = typeof args.reason === "string" ? args.reason.trim() : "";

      if (state.currentStageIndex < REVIEW_STAGE_INDEX) {
        throw new Error("Workflow cannot be completed before the review stage is finished.");
      }

      if (allowWithoutDeployment) {
        if (state.executionMode !== "approval") {
          throw new Error("Skipping deployment is only allowed in approval mode.");
        }

        if (state.currentStageIndex !== REVIEW_STAGE_INDEX) {
          throw new Error(
            "Workflow can only be completed without deployment immediately after review-agent."
          );
        }

        if (!reason) {
          throw new Error(
            "complete_workflow requires a reason when allowWithoutDeployment=true."
          );
        }
      } else if (state.currentStageIndex < DEPLOYMENT_STAGE_INDEX) {
        throw new Error(
          "Workflow can only be completed after deployment-agent succeeds, or explicitly skipped in approval mode after review."
        );
      }

      await assertCompletionReadiness(state, { allowWithoutDeployment });

      state.completed = true;
      state.history.push({
        stage: "completed",
        summary: allowWithoutDeployment
          ? `Workflow marked complete after approved deployment skip. Reason: ${reason}`
          : "Workflow marked as fully complete after successful deployment.",
        timestamp: new Date().toISOString()
      });
      trimHistory(state);
      await saveState(state);

      return textResult({
        completed: true,
        deploymentSkipped: allowWithoutDeployment,
        message: allowWithoutDeployment
          ? "Workflow is complete with deployment explicitly skipped in approval mode."
          : "Workflow is now marked complete. The orchestrator will not restart requirements."
      });
    }

    if (toolName === "create_change_request") {
      const title = typeof args.title === "string" ? args.title.trim() : "";
      const details = typeof args.details === "string" ? args.details.trim() : "";
      const impactHint = typeof args.impactHint === "string" ? args.impactHint.trim() : "";

      if (!title) {
        throw new Error("title is required.");
      }

      if (!details) {
        throw new Error("details is required.");
      }

      const state = await loadState();
      const requestedByStage =
        normalizeStage(args.requestedByStage) ??
        state.activeStage ??
        (state.currentStageIndex >= 0 ? STAGES[state.currentStageIndex] : null);

      const changeRequest = {
        id: nextChangeRequestId(state),
        title,
        details,
        impactHint,
        impactSummary: "",
        notes: "",
        status: "open",
        requestedByStage,
        rollbackStage: null,
        affectedStages: [],
        affectedArtifacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null
      };

      state.changeRequests.push(changeRequest);
      appendHistory(
        state,
        "change-request",
        `Registered ${changeRequest.id}: ${changeRequest.title}`
      );
      await saveState(state);

      return textResult({
        changeRequest,
        openChangeRequests: state.changeRequests.filter(request =>
          ["open", "assessed"].includes(request.status)
        ).length
      });
    }

    if (toolName === "update_change_request") {
      const changeId = typeof args.changeId === "string" ? args.changeId.trim() : "";
      const status = normalizeChangeRequestStatus(args.status);

      if (!changeId) {
        throw new Error("changeId is required.");
      }

      if (!status) {
        throw new Error(`Invalid change request status '${args.status ?? ""}'.`);
      }

      const state = await loadState();
      const changeRequest = getChangeRequestOrThrow(state, changeId);

      changeRequest.status = status;
      if (typeof args.impactSummary === "string") {
        changeRequest.impactSummary = args.impactSummary.trim();
      }
      if (typeof args.notes === "string") {
        changeRequest.notes = args.notes.trim();
      }

      const rollbackStage = normalizeStage(args.rollbackStage);
      if (rollbackStage) {
        changeRequest.rollbackStage = rollbackStage;
      }

      const affectedStages = normalizeStageList(args.affectedStages);
      if (affectedStages.length > 0) {
        changeRequest.affectedStages = affectedStages;
      }

      const affectedArtifacts = normalizeArtifactList(args.affectedArtifacts);
      if (affectedArtifacts.length > 0) {
        changeRequest.affectedArtifacts = affectedArtifacts;
      }

      changeRequest.updatedAt = new Date().toISOString();
      if (["applied", "rejected", "superseded"].includes(status)) {
        changeRequest.resolvedAt = new Date().toISOString();
      }

      appendHistory(
        state,
        "change-request",
        `Updated ${changeRequest.id}: status=${changeRequest.status}${
          changeRequest.rollbackStage ? `, rollback=${changeRequest.rollbackStage}` : ""
        }`
      );
      await saveState(state);

      return textResult({ changeRequest });
    }

    if (toolName === "get_change_requests") {
      const statusFilter = normalizeChangeRequestStatus(args.status);
      const state = await loadState();
      const changeRequests = statusFilter
        ? state.changeRequests.filter(request => request.status === statusFilter)
        : state.changeRequests;

      return textResult({
        changeRequests,
        total: changeRequests.length,
        open: state.changeRequests.filter(request => request.status === "open").length,
        assessed: state.changeRequests.filter(request => request.status === "assessed").length
      });
    }

    if (toolName === "register_subtask") {
      const stage = String(args.stage ?? "").trim();
      const taskId = String(args.taskId ?? "").trim();
      const description = String(args.description ?? "").trim();

      if (!STAGES.includes(stage)) throw new Error(`Unknown stage '${stage}'.`);
      if (!taskId) throw new Error("taskId is required.");

      const state = await loadState();
      if (!state.subtasks[stage]) state.subtasks[stage] = [];

      const existing = state.subtasks[stage].find(t => t.id === taskId);
      if (existing) {
        return textResult({ taskId, status: existing.status, message: "Sub-task already registered." });
      }

      state.subtasks[stage].push({
        id: taskId,
        description,
        status: "pending",
        registeredAt: new Date().toISOString()
      });
      await saveState(state);

      return textResult({ taskId, status: "pending", registered: true });
    }

    if (toolName === "complete_subtask") {
      const stage = String(args.stage ?? "").trim();
      const taskId = String(args.taskId ?? "").trim();

      if (!STAGES.includes(stage)) throw new Error(`Unknown stage '${stage}'.`);

      const state = await loadState();
      const tasks = state.subtasks[stage] ?? [];
      const task = tasks.find(t => t.id === taskId);

      if (!task) throw new Error(`Sub-task '${taskId}' not found in stage '${stage}'. Register it first.`);

      task.status = "completed";
      task.completedAt = new Date().toISOString();
      if (typeof args.artifactPath === "string" && args.artifactPath.trim()) {
        task.artifactPath = args.artifactPath.trim();
      }
      await saveState(state);

      const remaining = tasks.filter(t => t.status !== "completed").length;
      return textResult({ taskId, status: "completed", remainingPending: remaining });
    }

    if (toolName === "get_subtasks") {
      const stage = String(args.stage ?? "").trim();
      if (!STAGES.includes(stage)) throw new Error(`Unknown stage '${stage}'.`);

      const state = await loadState();
      const tasks = state.subtasks[stage] ?? [];

      return textResult({
        stage,
        tasks,
        total: tasks.length,
        completed: tasks.filter(t => t.status === "completed").length,
        pending: tasks.filter(t => t.status === "pending").length
      });
    }

    throw new Error(`Unknown tool: ${toolName}`);
  } catch (error) {
    return textResult(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      true
    );
  }
});

// ── MCP Resources: expose workflow state as a readable resource ──────────────
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "workflow://state",
        name: "Workflow State",
        description: "Current workflow stage, mode, sub-task progress, and history. Attach as context before each phase.",
        mimeType: "application/json"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== "workflow://state") {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  }
  const state = await loadState();
  return {
    contents: [
      {
        uri: "workflow://state",
        mimeType: "application/json",
        text: JSON.stringify({
          ...state,
              effectiveExecutionMode: getEffectiveExecutionMode(state) ?? "unset",
          expectedArtifacts: STAGE_ARTIFACTS,
              openChangeRequests: state.changeRequests.filter(request =>
                ["open", "assessed"].includes(request.status)
              ),
          currentStage: state.currentStageIndex >= 0 ? STAGES[state.currentStageIndex] : null,
          nextAgent: getNextStageFromIndex(state.currentStageIndex),
          stages: STAGES
        }, null, 2)
      }
    ]
  };
});

// ── MCP Prompts: phase-specific starter prompts ───────────────────────────────
const PHASE_PROMPTS = [
  {
    name: "start-requirements",
    description: "Kick off the requirements phase for a given goal",
    arguments: [{ name: "goal", description: "What to build", required: true }]
  },
  {
    name: "start-architecture",
    description: "Design architecture from the requirements doc",
    arguments: []
  },
  {
    name: "start-coding",
    description: "Begin module-by-module implementation from the architecture doc",
    arguments: [{ name: "module", description: "Specific module to implement (optional)", required: false }]
  },
  {
    name: "start-integration-testing",
    description: "Run cross-module integration sanity checks on the full stack",
    arguments: []
  },
  {
    name: "start-testing",
    description: "Run the full test suite: unit + integration + E2E + accessibility",
    arguments: []
  },
  {
    name: "start-review",
    description: "Perform final quality and security review",
    arguments: []
  },
  {
    name: "start-deployment",
    description: "Build Docker image, deploy to staging, run smoke tests",
    arguments: []
  },
  {
    name: "request-requirement-change",
    description: "Register and assess a mid-flow requirement change, then reroute the workflow safely",
    arguments: [{ name: "change", description: "Requirement change to apply", required: true }]
  }
];

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: PHASE_PROMPTS };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const p = PHASE_PROMPTS.find(x => x.name === request.params.name);
  if (!p) throw new Error(`Unknown prompt: ${request.params.name}`);

  const args = request.params.arguments ?? {};
  const messages = {
    "start-requirements": `You are the requirements-agent. The goal is: "${args.goal ?? "(see conversation)"}". Produce docs/01-requirements.md following the workflow conventions.`,
    "start-architecture": `You are the architecture-agent. Read docs/01-requirements.md and produce docs/02-architecture.md including a module breakdown table with IDs, descriptions, and estimated complexity.`,
    "start-coding": args.module
      ? `You are the module-coding-agent. Implement only the "${args.module}" module as specified in docs/02-architecture.md. Register your sub-task with workflowControl/register_subtask before starting and complete it when done.`
      : `You are the coding-agent. Read docs/02-architecture.md, enumerate modules, and delegate each to module-coding-agent as a subagent in sequence. After all modules are done, invoke integration-testing-agent.`,
    "start-integration-testing": `You are the integration-testing-agent. Start the full stack (backend + database + frontend if applicable), run cross-module integration checks (auth flow, data flow, error propagation, CORS, frontend load), and produce docs/03c-integration-test-report.md. If BLOCKERs exist, return to coding-agent. If clean, invoke testing-agent.`,
    "start-testing": `You are the testing-agent. Run all tests (unit + integration), use the /e2e-testing skill to author and run E2E browser tests through VS Code's integrated browser tools, run accessibility checks, and produce docs/04-testing-report.md with AC traceability matrix and screenshots.`,
    "start-review": `You are the review-agent. Review all docs and actual test files. Use /security-review skill for OWASP Top 10 audit. Produce docs/05-review-report.md with severity-rated findings. If approved, invoke deployment-agent.`,
    "start-deployment": `You are the deployment-agent. Check for Dockerfile and docker-compose.yml (create if missing). Build the Docker image, start staging with docker compose or docker-compose as supported by the current shell, run smoke tests (health endpoint, browser screenshot, integrated-browser flow), and produce docs/06-deployment-report.md. Call complete_workflow only if all smoke tests pass.`,
    "request-requirement-change": `You are the requirements-agent. Apply this mid-flow requirement change: "${args.change ?? "(see conversation)"}". Register a CHG-* item, update docs/01-requirements.md and docs/01b-change-log.md, choose the earliest impacted rollback stage, and if the base workflow is in approval mode ask once whether this reroute should continue automatically or keep approval pauses. Use the temporary execution-mode override when the user selects automatic continuation, then roll back safely and continue from the correct stage.`
  };

  return {
    description: p.description,
    messages: [
      {
        role: "user",
        content: { type: "text", text: messages[p.name] }
      }
    ]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);