import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";

const STANDALONE_WRAP_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "cafefeed",
  updated: "2026-03-21T14:20:00Z",
  productParts: [
    {
      id: "local-core-runtime",
      title: "Local Core Runtime",
      purpose: "Owns stage execution and standalone runtime services.",
      clusterIds: ["project-flow", "artifact-store"],
      standaloneModuleIds: [
        "description-stage",
        "virtual-simulation-stage",
        "diagram-modules-stage",
        "artifact-freshness",
      ],
    },
  ],
  clusters: [
    {
      id: "project-flow",
      title: "Project Flow",
      purpose: "Runs workflow stages.",
      productPart: "local-core-runtime",
      moduleIds: ["stage-flow-controller"],
    },
    {
      id: "artifact-store",
      title: "Artifact Store",
      purpose: "Keeps artifact state.",
      productPart: "local-core-runtime",
      moduleIds: ["workspace-artifact-store"],
    },
  ],
  modules: [
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
      id: "workspace-artifact-store",
      kind: "store",
      title: "Workspace Artifact Store",
      responsibility: "Stores artifacts in the workspace.",
      productPart: "local-core-runtime",
      cluster: "artifact-store",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "description-stage",
      kind: "service",
      title: "Description Stage",
      responsibility: "Builds the description artifact.",
      productPart: "local-core-runtime",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "virtual-simulation-stage",
      kind: "service",
      title: "Virtual Simulation Stage",
      responsibility: "Builds the simulation artifact.",
      productPart: "local-core-runtime",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "diagram-modules-stage",
      kind: "service",
      title: "Diagram Modules Stage",
      responsibility: "Builds the module inventory.",
      productPart: "local-core-runtime",
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

test("domainModelToReactFlow wraps standalone modules into a dedicated band without widening the product part", () => {
  const result = domainModelToReactFlow(STANDALONE_WRAP_FIXTURE);

  const productPartNode = result.nodes.find(
    (node) => node.id === "product-part:local-core-runtime"
  );
  const projectFlowCluster = result.nodes.find((node) => node.id === "cluster:project-flow");
  const artifactStoreCluster = result.nodes.find((node) => node.id === "cluster:artifact-store");
  const descriptionStageNode = result.nodes.find(
    (node) => node.id === "description-stage"
  );
  const virtualSimulationStageNode = result.nodes.find(
    (node) => node.id === "virtual-simulation-stage"
  );
  const diagramModulesStageNode = result.nodes.find(
    (node) => node.id === "diagram-modules-stage"
  );
  const artifactFreshnessNode = result.nodes.find(
    (node) => node.id === "artifact-freshness"
  );

  assert.notEqual(productPartNode, undefined);
  assert.notEqual(projectFlowCluster, undefined);
  assert.notEqual(artifactStoreCluster, undefined);
  assert.notEqual(descriptionStageNode, undefined);
  assert.notEqual(virtualSimulationStageNode, undefined);
  assert.notEqual(diagramModulesStageNode, undefined);
  assert.notEqual(artifactFreshnessNode, undefined);
  if (
    !productPartNode ||
    !projectFlowCluster ||
    !artifactStoreCluster ||
    !descriptionStageNode ||
    !virtualSimulationStageNode ||
    !diagramModulesStageNode ||
    !artifactFreshnessNode
  ) {
    return;
  }

  const clusterBandBottom = Math.max(
    projectFlowCluster.position.y + Number(projectFlowCluster.style?.height ?? 0),
    artifactStoreCluster.position.y + Number(artifactStoreCluster.style?.height ?? 0)
  );

  assert.equal(productPartNode.style?.width, 720);
  assert.equal(descriptionStageNode.position.x, 24);
  assert.equal(virtualSimulationStageNode.position.x, 296);
  assert.equal(descriptionStageNode.position.y, clusterBandBottom + 36);
  assert.equal(virtualSimulationStageNode.position.y, descriptionStageNode.position.y);
  assert.equal(diagramModulesStageNode.position.x, 24);
  assert.equal(artifactFreshnessNode.position.x, 296);
  assert.equal(diagramModulesStageNode.position.y, artifactFreshnessNode.position.y);
  assert.equal(diagramModulesStageNode.position.y > descriptionStageNode.position.y + 132, true);
});

const CLUSTER_STACK_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "stack-feed",
  updated: "2026-03-22T18:40:00Z",
  productParts: [
    {
      id: "local-core-runtime",
      title: "Local Core Runtime",
      purpose: "Owns workflow orchestration.",
      clusterIds: ["workflow-orchestration"],
      standaloneModuleIds: [],
    },
  ],
  clusters: [
    {
      id: "workflow-orchestration",
      title: "Workflow Orchestration",
      purpose: "Runs and coordinates workflow stages, execution rules, and downstream refresh decisions for the active project.",
      productPart: "local-core-runtime",
      moduleIds: ["step-eligibility-guard", "step-execution-coordinator", "dependency-refresh-marker"],
    },
  ],
  modules: [
    {
      id: "step-eligibility-guard",
      kind: "service",
      title: "Step Eligibility Guard",
      responsibility: "Decides whether the requested workflow step is allowed to run from the current project state.",
      productPart: "local-core-runtime",
      cluster: "workflow-orchestration",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "step-execution-coordinator",
      kind: "service",
      title: "Step Execution Coordinator",
      responsibility: "Runs an approved workflow step against the right inputs and records the resulting artifact chain.",
      productPart: "local-core-runtime",
      cluster: "workflow-orchestration",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "dependency-refresh-marker",
      kind: "service",
      title: "Dependency Refresh Marker",
      responsibility: "Marks later workflow results as outdated when an earlier approved artifact changes.",
      productPart: "local-core-runtime",
      cluster: "workflow-orchestration",
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

test("domainModelToReactFlow gives stacked cluster modules enough vertical space to avoid overlap", () => {
  const result = domainModelToReactFlow(CLUSTER_STACK_FIXTURE);

  const clusterNode = result.nodes.find(
    (node) => node.id === "cluster:workflow-orchestration"
  );
  const eligibilityNode = result.nodes.find(
    (node) => node.id === "step-eligibility-guard"
  );
  const executionNode = result.nodes.find(
    (node) => node.id === "step-execution-coordinator"
  );
  const refreshNode = result.nodes.find(
    (node) => node.id === "dependency-refresh-marker"
  );

  assert.notEqual(clusterNode, undefined);
  assert.notEqual(eligibilityNode, undefined);
  assert.notEqual(executionNode, undefined);
  assert.notEqual(refreshNode, undefined);
  if (!clusterNode || !eligibilityNode || !executionNode || !refreshNode) {
    return;
  }

  assert.equal(eligibilityNode.position.x, 24);
  assert.equal(eligibilityNode.position.y >= 120, true);
  assert.equal(executionNode.position.x, 24);
  assert.equal(refreshNode.position.x, 24);
  assert.equal(executionNode.position.y > eligibilityNode.position.y + 132, true);
  assert.equal(refreshNode.position.y > executionNode.position.y + 132, true);
  assert.equal(
    Number(clusterNode.style?.height ?? 0) >= refreshNode.position.y + 132 + 16,
    true
  );
});
