import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";

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

test("domainModelToReactFlow keeps external provider nodes outside product part containers", () => {
  const result = domainModelToReactFlow(EXTERNAL_BOUNDARY_FIXTURE);

  const runtimeNode = result.nodes.find(
    (node) => node.id === "product-part:local-core-runtime"
  );
  const managerNode = result.nodes.find(
    (node) => node.id === "product-part:standalone-project-manager"
  );
  const integrationNode = result.nodes.find(
    (node) => node.id === "ai-provider-integration"
  );
  const providerNode = result.nodes.find(
    (node) => node.id === "selected-ai-provider"
  );

  assert.notEqual(runtimeNode, undefined);
  assert.notEqual(managerNode, undefined);
  assert.notEqual(integrationNode, undefined);
  assert.notEqual(providerNode, undefined);
  if (!runtimeNode || !managerNode || !integrationNode || !providerNode) {
    return;
  }

  assert.equal(integrationNode.parentId, "cluster:provider-bridge");
  assert.equal(providerNode.parentId, undefined);
  assert.equal(providerNode.extent, undefined);
  assert.equal(
    providerNode.position.x > Number(runtimeNode.style?.width ?? 0),
    true
  );
  assert.equal(managerNode.position.y >= providerNode.position.y + 120, true);
});
