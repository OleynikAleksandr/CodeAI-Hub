import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";
import type { ProductPartFlowNodeData } from "./domain-model-to-react-flow.types";

const EXTERNAL_BOUNDARY_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "boundary-feed",
  updated: "2026-03-21T15:00:00Z",
  productParts: [
    {
      id: "local-core-runtime",
      title: "Local Core Runtime",
      purpose: "Owns provider execution.",
      clusterIds: ["provider-bridge"],
      standaloneModuleIds: ["selected-ai-provider"],
    },
    {
      id: "standalone-project-manager",
      title: "Standalone Project Manager",
      purpose: "Owns review and navigation.",
      clusterIds: ["review-shell"],
      standaloneModuleIds: [],
    },
  ],
  clusters: [
    {
      id: "provider-bridge",
      title: "Provider Bridge",
      purpose: "Bridges runtime calls to the selected provider.",
      productPart: "local-core-runtime",
      moduleIds: ["ai-provider-integration"],
    },
    {
      id: "review-shell",
      title: "Review Shell",
      purpose: "Shows artifacts to the user.",
      productPart: "standalone-project-manager",
      moduleIds: ["artifact-review-surface"],
    },
  ],
  modules: [
    {
      id: "ai-provider-integration",
      kind: "gateway",
      title: "AI Provider Integration",
      responsibility: "Sends runtime requests to the selected provider.",
      productPart: "local-core-runtime",
      cluster: "provider-bridge",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "selected-ai-provider",
      kind: "external",
      title: "Selected AI Provider",
      responsibility: "External provider that fulfills runtime requests.",
      productPart: "local-core-runtime",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "artifact-review-surface",
      kind: "adapter",
      title: "Artifact Review Surface",
      responsibility: "Shows the current artifact to the user.",
      productPart: "standalone-project-manager",
      cluster: "review-shell",
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

test("domainModelToReactFlow nests external modules as standalone inside product part data", () => {
  const result = domainModelToReactFlow(EXTERNAL_BOUNDARY_FIXTURE);

  assert.equal(result.nodes.length, 2);

  const runtimeNode = result.nodes.find(
    (node) => node.id === "product-part:local-core-runtime"
  );
  assert.ok(runtimeNode);

  const data = runtimeNode.data as ProductPartFlowNodeData;
  assert.equal(data.clusters.length, 1);
  assert.equal(data.clusters[0]!.clusterId, "provider-bridge");
  assert.equal(data.standaloneModules.length, 1);
  assert.equal(data.standaloneModules[0]!.moduleId, "selected-ai-provider");
  assert.equal(data.standaloneModules[0]!.kind, "external");

  const managerNode = result.nodes.find(
    (node) => node.id === "product-part:standalone-project-manager"
  );
  assert.ok(managerNode);
  const managerData = managerNode.data as ProductPartFlowNodeData;
  assert.equal(managerData.clusters.length, 1);
  assert.equal(managerData.standaloneModules.length, 0);
});
