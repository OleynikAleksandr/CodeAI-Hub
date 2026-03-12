import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { DescriptionBranchSnapshot } from "../description/description-step-types";
import { reconcileWorkflowState } from "./workflow-state-reconciliation";
import type { WorkflowState } from "./workflow-state-types";

const createState = (workspaceSlug: string): WorkflowState => {
  const updatedAt = "2026-03-12T19:00:00.000Z";
  return {
    workspaceSlug,
    updatedAt,
    stages: {
      description: {
        stage: "description",
        status: "idle",
        artifacts: [],
        gates: [],
        updatedAt,
      },
      virtual_simulation: {
        stage: "virtual_simulation",
        status: "idle",
        artifacts: [],
        gates: [],
        updatedAt,
      },
      diagram_modules: {
        stage: "diagram_modules",
        status: "idle",
        artifacts: [],
        gates: [],
        updatedAt,
      },
      diagram_facades: {
        stage: "diagram_facades",
        status: "idle",
        artifacts: [],
        gates: [],
        updatedAt,
      },
    },
    gates: [],
  };
};

test("reconcileWorkflowState restores completed stages from recovered artifacts", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "workflow-state-reconcile-")
  );
  const workspaceSlug = "workspace-reconcile";
  const virtualSimulationDir = path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    "virtual_simulation"
  );
  await mkdir(virtualSimulationDir, { recursive: true });
  await writeFile(
    path.join(virtualSimulationDir, "virtual-simulation.md"),
    "# Virtual Simulation: Test\n\n## Scenario 1"
  );

  const description: DescriptionBranchSnapshot = {
    updatedAt: "2026-03-12T19:01:00.000Z",
    finalPath: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
  };
  const chains: ContinuityChainSummary[] = [
    {
      rootSessionId: "root-virtual-simulation",
      workspaceSlug,
      stage: "virtual_simulation",
      updatedAt: "2026-03-12T19:02:00.000Z",
      segments: [
        {
          sessionId: "session-virtual-simulation",
          providerId: "codexCli",
          providerSessionId: "provider-session-1",
          createdAt: "2026-03-12T19:02:00.000Z",
        },
      ],
    },
  ];

  const reconciled = await reconcileWorkflowState({
    state: createState(workspaceSlug),
    description,
    chains,
    workspaceRoot,
    workspaceSlug,
  });

  assert.equal(reconciled.stages.description.status, "completed");
  assert.equal(reconciled.stages.virtual_simulation.status, "completed");
  assert.equal(
    reconciled.stages.virtual_simulation.artifacts.some(
      (artifact) => artifact.path === "virtual_simulation/virtual-simulation.md"
    ),
    true
  );
});

test("reconcileWorkflowState marks continuity-only stages as in progress", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "workflow-state-reconcile-")
  );
  const workspaceSlug = "workspace-continuity";
  const chains: ContinuityChainSummary[] = [
    {
      rootSessionId: "root-description",
      workspaceSlug,
      stage: "description",
      updatedAt: "2026-03-12T19:03:00.000Z",
      segments: [
        {
          sessionId: "session-description",
          providerId: "claudeCodeCli",
          providerSessionId: "provider-session-2",
          createdAt: "2026-03-12T19:03:00.000Z",
        },
      ],
    },
    {
      rootSessionId: "root-virtual-simulation",
      workspaceSlug,
      stage: "virtual_simulation",
      updatedAt: "2026-03-12T19:04:00.000Z",
      segments: [
        {
          sessionId: "session-virtual-simulation",
          providerId: "claudeCodeCli",
          providerSessionId: "provider-session-3",
          createdAt: "2026-03-12T19:04:00.000Z",
        },
      ],
    },
  ];

  const reconciled = await reconcileWorkflowState({
    state: createState(workspaceSlug),
    description: {
      updatedAt: "2026-03-12T19:03:00.000Z",
      questionnairePath: `.codeai-hub/${workspaceSlug}/description/questionnaire.md`,
    },
    chains,
    workspaceRoot,
    workspaceSlug,
  });

  assert.equal(reconciled.stages.description.status, "in_progress");
  assert.equal(reconciled.stages.virtual_simulation.status, "in_progress");
});
