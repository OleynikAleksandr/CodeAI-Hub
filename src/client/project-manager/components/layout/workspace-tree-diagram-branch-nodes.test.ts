import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiagramModulesBranchNodes,
  buildDevelopmentTreeNodes,
} from "./workspace-tree-diagram-branch-nodes";
import {
  WORKFLOW_STAGE_OUTDATED_TITLE,
} from "./workspace-tree-model";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";

const createWorkflowStateWithTree = (): WorkflowStateSnapshot => ({
  workspaceSlug: "demo",
  updatedAt: "2026-04-10T10:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "completed",
    diagram_modules: "completed",
  },
  continuity: {
    chains: [
      {
        rootSessionId: "dm-root",
        workspaceSlug: "demo",
        stage: "diagram_modules",
        updatedAt: "2026-04-10T10:00:00.000Z",
        segments: [
          {
            sessionId: "dm-session",
            providerId: "claudeCodeCli",
            providerSessionId: "dm-provider",
            createdAt: "2026-04-10T09:00:00.000Z",
          },
        ],
      },
    ],
  },
  lastActive: null,
  description: null,
  gating: {
    blocked: { description: false, virtual_simulation: false, diagram_modules: false },
  },
  developmentTree: {
    parts: [
      {
        id: "ui-shell",
        status: "materialized",
        clusters: [
          {
            id: "layout-cluster",
            modules: [
              { id: "main-area", title: "Main Area" },
              { id: "sidebar", title: "Sidebar" },
            ],
          },
        ],
        standaloneModules: [{ id: "theme-engine", title: "Theme Engine" }],
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

const createWorkflowState = (): WorkflowStateSnapshot => ({
  workspaceSlug: "demo",
  updatedAt: "2026-03-16T20:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "completed",
    diagram_modules: "completed",
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

test("buildDiagramModulesBranchNodes projects development tree nodes from snapshot", () => {
  const workflowState = createWorkflowStateWithTree();

  const nodes = buildDiagramModulesBranchNodes({
    workflowState,
    diagramModulesArtifactAvailable: true,
    workspaceSlug: "demo",
    workspacePath: "/tmp/demo",
    selectArtifact: () => {},
    dispatchDialogOpenIntent: () => {},
    clearArtifactWithTool: () => {},
  });

  // 2 base nodes (artifact + session) + 2 dev tree part nodes
  assert.equal(nodes.length, 4);

  // First dev tree node: materialized part with clusters and standalone modules
  const uiShellNode = nodes[2];
  assert.ok(uiShellNode);
  assert.equal(uiShellNode.id, "devtree:ui-shell");
  assert.equal(uiShellNode.status, "draft");
  assert.equal(uiShellNode.isCollapsible, true);
  assert.equal(uiShellNode.children?.length, 2); // 1 cluster + 1 standalone

  // Cluster node with modules
  const clusterNode = uiShellNode.children?.[0];
  assert.ok(clusterNode);
  assert.equal(clusterNode.id, "devtree:ui-shell:layout-cluster");
  assert.equal(clusterNode.isCollapsible, true);
  assert.equal(clusterNode.children?.length, 2);
  assert.equal(clusterNode.children?.[0]?.label, "Main Area");
  assert.equal(clusterNode.children?.[1]?.label, "Sidebar");

  // Standalone module node
  const standaloneNode = uiShellNode.children?.[1];
  assert.ok(standaloneNode);
  assert.equal(standaloneNode.id, "devtree:ui-shell:standalone:theme-engine");
  assert.equal(standaloneNode.label, "Theme Engine");

  // Second dev tree node: skeleton part
  const coreNode = nodes[3];
  assert.ok(coreNode);
  assert.equal(coreNode.id, "devtree:core-services");
  assert.equal(coreNode.status, "todo");
  assert.equal(coreNode.children, undefined);
});

test("buildDevelopmentTreeNodes respects custom baseDepth for top-level rendering", () => {
  const workflowState = createWorkflowStateWithTree();

  const nodes = buildDevelopmentTreeNodes(workflowState.developmentTree!, 0);

  assert.equal(nodes.length, 2);

  // Parts at depth 0
  const uiShell = nodes[0];
  assert.ok(uiShell);
  assert.equal(uiShell.visualDepth, 0);
  assert.equal(uiShell.id, "devtree:ui-shell");

  // Cluster at depth 1
  const cluster = uiShell.children?.[0];
  assert.ok(cluster);
  assert.equal(cluster.visualDepth, 1);

  // Module at depth 2
  const mod = cluster.children?.[0];
  assert.ok(mod);
  assert.equal(mod.visualDepth, 2);

  // Skeleton part at depth 0
  const corePart = nodes[1];
  assert.ok(corePart);
  assert.equal(corePart.visualDepth, 0);
});

test("buildDevelopmentTreeNodes maps readiness to sidebar status colors", () => {
  const developmentTree = {
    parts: [
      {
        id: "ui-shell",
        readiness: "in_progress",
        status: "materialized",
        clusters: [
          {
            id: "layout-cluster",
            readiness: "ready",
            modules: [
              { id: "main-area", readiness: "ready", title: "Main Area" },
              { id: "sidebar", readiness: "idle", title: "Sidebar" },
            ],
          },
        ],
        standaloneModules: [
          { id: "theme-engine", readiness: "idle", title: "Theme Engine" },
        ],
      },
    ],
  } satisfies NonNullable<WorkflowStateSnapshot["developmentTree"]>;

  const nodes = buildDevelopmentTreeNodes(developmentTree, 0);
  const part = nodes[0];
  const cluster = part?.children?.[0];
  const readyModule = cluster?.children?.[0];
  const idleModule = cluster?.children?.[1];
  const standaloneModule = part?.children?.[1];

  assert.equal(part?.status, "progress");
  assert.equal(part?.readiness, "in_progress");
  assert.equal(cluster?.status, "active");
  assert.equal(readyModule?.status, "active");
  assert.equal(idleModule?.status, "todo");
  assert.equal(standaloneModule?.status, "todo");
});

test("buildDevelopmentTreeNodes renders node artifacts and sessions below their owner", () => {
  const developmentTree = {
    parts: [
      {
        id: "project-manager",
        status: "materialized",
        artifacts: [
          {
            fileName: "ProductPartSpec.draft.md",
            path: ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager/ProductPartSpec.draft.md",
          },
        ],
        session: {
          dialogId: "codex-development-tree-project-manager",
          providerId: "codexCli",
          providerSessionId: "provider-part",
          rootSessionId: "part-root",
          sessionId: "part-session",
          updatedAt: "2026-05-05T07:00:00.000Z",
        },
        clusters: [
          {
            id: "workflow-and-artifact-ui",
            artifacts: [
              {
                fileName: "ClusterSpec.draft.md",
                path: ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/ClusterSpec.draft.md",
              },
            ],
            modules: [
              {
                id: "workflow-step-controller",
                title: "Workflow Step Controller",
                artifacts: [
                  {
                    fileName: "ModuleSpec.draft.md",
                    path: ".codeai-hub/demo/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller/ModuleSpec.draft.md",
                  },
                ],
                session: {
                  dialogId:
                    "codex-development-tree-project-manager-workflow-and-artifact-ui-workflow-step-controller",
                  providerId: "codexCli",
                  providerSessionId: "provider-module",
                  rootSessionId: "module-root",
                  sessionId: "module-session",
                  updatedAt: "2026-05-05T07:01:00.000Z",
                },
              },
            ],
          },
        ],
        standaloneModules: [],
      },
    ],
  } satisfies NonNullable<WorkflowStateSnapshot["developmentTree"]>;

  const [part] = buildDevelopmentTreeNodes(developmentTree, 0);
  assert.equal(part?.children?.[0]?.label, "Artifact: ProductPartSpec.draft.md");
  assert.equal(part?.children?.[1]?.label, "Session: Codex");

  const cluster = part?.children?.find((node) => node.nodeType === "cluster");
  assert.equal(cluster?.children?.[0]?.label, "Artifact: ClusterSpec.draft.md");
  assert.equal(cluster?.children?.[1]?.label, "Workflow Step Controller");
  assert.equal(cluster?.children?.[2]?.label, "Artifact: ModuleSpec.draft.md");
  assert.equal(cluster?.children?.[3]?.label, "Session: Codex");
  assert.match(cluster?.children?.[3]?.title ?? "", /provider-module/);
});
