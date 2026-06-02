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

test("buildDevelopmentTreeNodes renders module operation children from Core snapshot", () => {
  const nodes = buildDevelopmentTreeNodes(
    {
      parts: [
        {
          id: "ui-shell",
          status: "materialized",
          clusters: [
            {
              id: "layout-cluster",
              modules: [
                {
                  id: "main-area",
                  title: "Main Area",
                  operations: [
                    {
                      id: "module-facade-specification",
                      kind: "module_facade_specification",
                      title: "Module / Facade Specification",
                      workflowPath:
                        "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/modules/main-area",
                      artifactWorkspacePath:
                        ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/modules/main-area",
                    },
                    {
                      id: "implementation",
                      kind: "implementation",
                      title: "Implementation",
                      workflowPath:
                        "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/modules/main-area/implementation",
                      artifactWorkspacePath:
                        ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/modules/main-area",
                      children: [
                        {
                          id: "workers",
                          kind: "workers",
                          title: "Workers",
                          workflowPath:
                            "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/modules/main-area/workers",
                          artifactWorkspacePath:
                            ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/modules/main-area/workers",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          standaloneModules: [],
        },
      ],
    },
    0
  );

  const moduleNode = nodes[0]?.children?.[0]?.children?.[0];
  const specNode = moduleNode?.children?.[0];
  const implementationNode = moduleNode?.children?.[1];
  assert.equal(moduleNode?.isCollapsible, true);
  assert.equal(specNode?.label, "Module / Facade Specification");
  assert.equal(specNode?.operationKind, "module_facade_specification");
  assert.equal(implementationNode?.children?.[0]?.label, "Workers");
  assert.equal(implementationNode?.children?.[0]?.operationKind, "workers");
});

test("buildDevelopmentTreeNodes renders cluster operations before modules", () => {
  const nodes = buildDevelopmentTreeNodes(
    {
      parts: [
        {
          id: "ui-shell",
          status: "materialized",
          clusters: [
            {
              id: "layout-cluster",
              operations: [
                {
                  id: "workers",
                  kind: "workers",
                  title: "Workers",
                  workflowPath:
                    "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/workers",
                  artifactWorkspacePath:
                    ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/workers",
                },
                {
                  id: "integration",
                  kind: "integration",
                  title: "Integration",
                  workflowPath:
                    "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/integration",
                  artifactWorkspacePath:
                    ".codeai-hub/demo/development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster/integration",
                },
              ],
              modules: [{ id: "main-area", title: "Main Area" }],
            },
          ],
          standaloneModules: [],
        },
      ],
    },
    0
  );

  const clusterChildren = nodes[0]?.children?.[0]?.children;
  assert.equal(clusterChildren?.[0]?.label, "Workers");
  assert.equal(clusterChildren?.[0]?.nodeType, "operation");
  assert.equal(clusterChildren?.[1]?.label, "Integration");
  assert.equal(clusterChildren?.[1]?.nodeType, "operation");
  assert.equal(clusterChildren?.[2]?.label, "Main Area");
  assert.equal(clusterChildren?.[2]?.nodeType, "module");
});

test("buildDevelopmentTreeNodes renders Product Part nodes without legacy lead operations", () => {
  const nodes = buildDevelopmentTreeNodes(
    {
      leadProductPartId: "core-runtime",
      productPartLeadershipOrder: ["core-runtime", "project-manager"],
      parts: [
        {
          id: "core-runtime",
          status: "materialized",
          clusters: [],
          standaloneModules: [],
        },
        {
          id: "project-manager",
          lifecycle: {
            lockedReason: "Product Part Development Brief is pending",
            startState: "not_started",
            startable: false,
          },
          status: "materialized",
          clusters: [],
          standaloneModules: [],
        },
      ],
    },
    0
  );

  assert.equal(nodes[0]?.id, "devtree:core-runtime");
  assert.equal(nodes[0]?.children, undefined);
  assert.equal(nodes[1]?.status, "blocked");
  assert.equal(nodes[1]?.title, "Product Part Development Brief is pending");
});
