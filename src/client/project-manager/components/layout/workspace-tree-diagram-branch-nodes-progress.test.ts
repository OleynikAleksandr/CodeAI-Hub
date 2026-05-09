import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import {
  buildDevelopmentTreeNodes,
  buildDiagramModulesBranchNodes,
} from "./workspace-tree-diagram-branch-nodes";

const createWorkflowStateWithTree = (): WorkflowStateSnapshot => ({
  workspaceSlug: "demo",
  updatedAt: "2026-05-09T10:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "completed",
    diagram_modules: "in_progress",
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: {
    chains: [
      {
        rootSessionId: "dm-root",
        workspaceSlug: "demo",
        stage: "diagram_modules",
        updatedAt: "2026-05-09T10:00:00.000Z",
        segments: [
          {
            sessionId: "dm-session",
            providerId: "claudeCodeCli",
            providerSessionId: "dm-provider",
            createdAt: "2026-05-09T09:00:00.000Z",
          },
        ],
      },
    ],
  },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      application_skeleton: true,
      quality_gates: true,
    },
  },
  developmentTree: {
    parts: [
      {
        id: "ui-shell",
        status: "materialized",
        clusters: [],
        standaloneModules: [],
      },
      {
        id: "core-services",
        status: "skeleton",
        clusters: [],
        standaloneModules: [],
      },
    ],
  },
});

test("buildDiagramModulesBranchNodes overlays subturn progress on product parts", () => {
  const workflowState: WorkflowStateSnapshot = {
    ...createWorkflowStateWithTree(),
    diagramModulesProgress: {
      acceptedPartIds: ["ui-shell"],
      activeSubturn: {
        kind: "product_part",
        partId: "core-services",
        status: "repair_pending",
      },
      currentPartId: "core-services",
      generatedPartIds: ["ui-shell"],
      plannedPartIds: ["ui-shell", "core-services"],
    },
  };

  const nodes = buildDiagramModulesBranchNodes({
    workflowState,
    diagramModulesArtifactAvailable: true,
    workspaceSlug: "demo",
    workspacePath: "/tmp/demo",
    selectArtifact: () => {},
    dispatchDialogOpenIntent: () => {},
    clearArtifactWithTool: () => {},
  });

  const uiShellNode = nodes.find((node) => node.id === "devtree:ui-shell");
  const coreNode = nodes.find((node) => node.id === "devtree:core-services");
  assert.equal(uiShellNode?.status, "active");
  assert.equal(uiShellNode?.readiness, "ready");
  assert.equal(coreNode?.status, "blocked");
  assert.equal(coreNode?.readiness, "in_progress");
  assert.equal(coreNode?.title, "Repair pending for this Product Part.");
});

test("buildDevelopmentTreeNodes marks current pending product part as progress", () => {
  const nodes = buildDevelopmentTreeNodes(
    createWorkflowStateWithTree().developmentTree,
    0,
    {
      activeSubturn: {
        kind: "product_part",
        partId: "core-services",
        status: "pending",
      },
      currentPartId: "core-services",
    }
  );

  assert.equal(nodes[0]?.status, "todo");
  assert.equal(nodes[1]?.status, "progress");
  assert.equal(nodes[1]?.title, "Current Core target Product Part.");
});
