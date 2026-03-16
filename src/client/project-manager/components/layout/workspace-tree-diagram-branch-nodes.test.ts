import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagramFacadesBranchNodes,
  buildDiagramModulesBranchNodes,
} from "./workspace-tree-diagram-branch-nodes";
import {
  WORKFLOW_STAGE_BLOCKED_TITLES,
  WORKFLOW_STAGE_OUTDATED_TITLE,
} from "./workspace-tree-model";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";

const createWorkflowState = (): WorkflowStateSnapshot => ({
  workspaceSlug: "demo",
  updatedAt: "2026-03-16T20:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "completed",
    diagram_modules: "completed",
    diagram_facades: "completed",
  },
  continuity: {
    chains: [
      {
        rootSessionId: "dm-root",
        workspaceSlug: "demo",
        stage: "diagram_modules",
        updatedAt: "2026-03-16T20:00:00.000Z",
        segments: [
          {
            sessionId: "dm-session",
            providerId: "codexCli",
            providerSessionId: "dm-provider",
            createdAt: "2026-03-16T19:00:00.000Z",
          },
        ],
      },
      {
        rootSessionId: "df-root",
        workspaceSlug: "demo",
        stage: "diagram_facades",
        updatedAt: "2026-03-16T20:10:00.000Z",
        segments: [
          {
            sessionId: "df-session",
            providerId: "codexCli",
            providerSessionId: "df-provider",
            createdAt: "2026-03-16T19:30:00.000Z",
          },
        ],
      },
    ],
  },
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      diagram_facades: false,
    },
  },
});

test("buildDiagramModulesBranchNodes keeps outdated status on artifact and session nodes", () => {
  const workflowState = createWorkflowState();
  workflowState.stages.diagram_modules = "outdated";

  const nodes = buildDiagramModulesBranchNodes({
    workflowState,
    diagramModulesArtifactAvailable: true,
    workspaceSlug: "demo",
    workspacePath: "/tmp/demo",
    selectArtifact: () => {},
    dispatchDialogOpenIntent: () => {},
    clearArtifactWithTool: () => {},
  });

  assert.equal(nodes.length, 2);
  assert.equal(nodes[0]?.status, "outdated");
  assert.match(nodes[0]?.title ?? "", /module-map\.md/);
  assert.match(nodes[0]?.title ?? "", new RegExp(WORKFLOW_STAGE_OUTDATED_TITLE));
  assert.equal(nodes[1]?.status, "outdated");
  assert.equal(nodes[1]?.title, WORKFLOW_STAGE_OUTDATED_TITLE);
});

test("buildDiagramFacadesBranchNodes keeps blocked status on session nodes when gating blocks the stage", () => {
  const workflowState = createWorkflowState();
  workflowState.gating.blocked.diagram_facades = true;
  workflowState.stages.diagram_facades = "invalid";

  const nodes = buildDiagramFacadesBranchNodes({
    workflowState,
    diagramFacadesArtifactAvailable: false,
    workspaceSlug: "demo",
    workspacePath: "/tmp/demo",
    selectArtifact: () => {},
    dispatchDialogOpenIntent: () => {},
    clearArtifactWithTool: () => {},
  });

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0]?.status, "blocked");
  assert.equal(
    nodes[0]?.title,
    WORKFLOW_STAGE_BLOCKED_TITLES.diagram_facades
  );
});
