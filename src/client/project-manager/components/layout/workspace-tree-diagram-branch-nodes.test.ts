import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagramModulesBranchNodes,
} from "./workspace-tree-diagram-branch-nodes";
import {
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
    foundation_envelope: "idle",
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
    ],
  },
  lastActive: {
    stage: "diagram_modules",
    updatedAt: "2026-03-16T20:00:00.000Z",
    artifactPath: ".codeai-hub/demo/diagram_modules/product-parts.index.md",
  },
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      foundation_envelope: false,
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
  assert.match(nodes[0]?.title ?? "", /product-parts\.index\.md/);
  assert.match(nodes[0]?.title ?? "", new RegExp(WORKFLOW_STAGE_OUTDATED_TITLE));
  assert.equal(nodes[1]?.status, "outdated");
  assert.equal(nodes[1]?.title, WORKFLOW_STAGE_OUTDATED_TITLE);
});
