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
      role: "runtime",
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
  assert.notEqual(descriptionStageNode, undefined);
  assert.notEqual(virtualSimulationStageNode, undefined);
  assert.notEqual(diagramModulesStageNode, undefined);
  assert.notEqual(artifactFreshnessNode, undefined);
  if (
    !productPartNode ||
    !descriptionStageNode ||
    !virtualSimulationStageNode ||
    !diagramModulesStageNode ||
    !artifactFreshnessNode
  ) {
    return;
  }

  assert.equal(productPartNode.style?.width, 720);
  assert.deepEqual(descriptionStageNode.position, { x: 24, y: 328 });
  assert.deepEqual(virtualSimulationStageNode.position, { x: 344, y: 328 });
  assert.deepEqual(diagramModulesStageNode.position, { x: 24, y: 460 });
  assert.deepEqual(artifactFreshnessNode.position, { x: 344, y: 460 });
});
