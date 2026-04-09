import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToProjection } from "./domain-model-to-projection";
import type { ProductPartProjectionNodeData } from "./domain-model-to-projection.types";

const MULTI_PRODUCT_PART_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "feedface",
  updated: "2026-03-21T14:00:00Z",
  productParts: [
    {
      id: "local-core-runtime",
      title: "Local Core Runtime",
      purpose: "Owns stage execution and persistence.",
      clusterIds: ["project-flow"],
      standaloneModuleIds: ["artifact-freshness"],
    },
    {
      id: "desktop-shell",
      title: "Desktop Shell",
      purpose: "Owns the operator-facing desktop surface.",
      clusterIds: ["workspace", "review", "navigation"],
      standaloneModuleIds: [],
    },
  ],
  clusters: [
    {
      id: "workspace",
      title: "Workspace",
      purpose: "Opens and switches projects.",
      productPart: "desktop-shell",
      moduleIds: ["workspace-entry"],
    },
    {
      id: "review",
      title: "Review",
      purpose: "Shows artifacts and approvals.",
      productPart: "desktop-shell",
      moduleIds: ["artifact-review"],
    },
    {
      id: "navigation",
      title: "Navigation",
      purpose: "Moves between stages.",
      productPart: "desktop-shell",
      moduleIds: ["stage-navigation"],
    },
    {
      id: "project-flow",
      title: "Project Flow",
      purpose: "Runs and coordinates stages.",
      productPart: "local-core-runtime",
      moduleIds: ["stage-flow-controller"],
    },
  ],
  modules: [
    {
      id: "workspace-entry",
      kind: "adapter",
      title: "Workspace Entry",
      responsibility: "Opens a project workspace.",
      productPart: "desktop-shell",
      cluster: "workspace",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "artifact-review",
      kind: "adapter",
      title: "Artifact Review",
      responsibility: "Shows the current artifact.",
      productPart: "desktop-shell",
      cluster: "review",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "stage-navigation",
      kind: "adapter",
      title: "Stage Navigation",
      responsibility: "Moves between workflow stages.",
      productPart: "desktop-shell",
      cluster: "navigation",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "stage-flow-controller",
      kind: "service",
      title: "Stage Flow Controller",
      responsibility: "Controls stage order.",
      productPart: "local-core-runtime",
      cluster: "project-flow",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "artifact-freshness",
      kind: "service",
      title: "Artifact Freshness",
      responsibility: "Marks downstream artifacts stale.",
      productPart: "local-core-runtime",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
  ],
  relations: [],
};

const TWO_CLUSTER_STANDALONE_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "shortest-column",
  updated: "2026-03-23T10:00:00Z",
  productParts: [
    {
      id: "local-core-runtime",
      title: "Local Core Runtime",
      purpose: "Keeps local stage orchestration readable.",
      clusterIds: ["workflow", "continuity"],
      standaloneModuleIds: ["workspace-provider-binding"],
    },
  ],
  clusters: [
    {
      id: "workflow",
      title: "Workflow",
      purpose: "Runs workflow stages.",
      productPart: "local-core-runtime",
      moduleIds: ["stage-flow-controller"],
    },
    {
      id: "continuity",
      title: "Continuity",
      purpose: "Keeps dialogue and runtime state restorable.",
      productPart: "local-core-runtime",
      moduleIds: [
        "project-state-registry",
        "session-history-continuity",
        "runtime-lifetime-manager",
      ],
    },
  ],
  modules: [
    {
      id: "stage-flow-controller",
      kind: "service",
      title: "Stage Flow Controller",
      responsibility: "Controls stage order.",
      productPart: "local-core-runtime",
      cluster: "workflow",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "project-state-registry",
      kind: "store",
      title: "Project State Registry",
      responsibility: "Keeps the current workflow state readable.",
      productPart: "local-core-runtime",
      cluster: "continuity",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "session-history-continuity",
      kind: "store",
      title: "Session History Continuity",
      responsibility: "Restores user dialogue on reopen.",
      productPart: "local-core-runtime",
      cluster: "continuity",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "runtime-lifetime-manager",
      kind: "service",
      title: "Runtime Lifetime Manager",
      responsibility: "Keeps runtime alive as a separate process.",
      productPart: "local-core-runtime",
      cluster: "continuity",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "workspace-provider-binding",
      kind: "store",
      title: "Workspace Provider Binding",
      responsibility: "Pins one active AI provider for the workspace.",
      productPart: "local-core-runtime",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
  ],
  relations: [],
};

test("domainModelToProjection emits one node per product part with nested data", () => {
  const result = domainModelToProjection(MULTI_PRODUCT_PART_FIXTURE);

  assert.equal(result.nodes.length, 2);

  const coreNode = result.nodes.find((n) => n.id === "product-part:local-core-runtime");
  const shellNode = result.nodes.find((n) => n.id === "product-part:desktop-shell");
  assert.ok(coreNode);
  assert.ok(shellNode);

  const coreData = coreNode.data as ProductPartProjectionNodeData;
  assert.equal(coreData.clusters.length, 1);
  assert.equal(coreData.clusters[0]!.clusterId, "project-flow");
  assert.equal(coreData.standaloneModules.length, 1);
  assert.equal(coreData.standaloneModules[0]!.moduleId, "artifact-freshness");

  const shellData = shellNode.data as ProductPartProjectionNodeData;
  assert.equal(shellData.clusters.length, 3);
  assert.deepEqual(
    shellData.clusters.map((c) => c.clusterId),
    ["workspace", "review", "navigation"]
  );
  assert.equal(shellData.standaloneModules.length, 0);
});

test("domainModelToProjection nests cluster modules correctly", () => {
  const result = domainModelToProjection(TWO_CLUSTER_STANDALONE_FIXTURE);

  assert.equal(result.nodes.length, 1);
  const data = result.nodes[0]!.data as ProductPartProjectionNodeData;

  assert.equal(data.clusters.length, 2);
  const workflow = data.clusters[0]!;
  assert.equal(workflow.modules.length, 1);
  assert.equal(workflow.modules[0]!.moduleId, "stage-flow-controller");

  const continuity = data.clusters[1]!;
  assert.equal(continuity.modules.length, 3);
  assert.deepEqual(
    continuity.modules.map((m) => m.moduleId),
    ["project-state-registry", "session-history-continuity", "runtime-lifetime-manager"]
  );

  assert.equal(data.standaloneModules.length, 1);
  assert.equal(data.standaloneModules[0]!.moduleId, "workspace-provider-binding");
});

test("domainModelToProjection assigns default layout params", () => {
  const result = domainModelToProjection(TWO_CLUSTER_STANDALONE_FIXTURE);
  const data = result.nodes[0]!.data as ProductPartProjectionNodeData;

  assert.equal(data.layoutParams.columns, "auto");
  assert.equal(data.layoutParams.targetAspectRatio, "landscape");
  assert.equal(data.clusters[0]!.layoutParams.moduleColumns, "auto");
});
