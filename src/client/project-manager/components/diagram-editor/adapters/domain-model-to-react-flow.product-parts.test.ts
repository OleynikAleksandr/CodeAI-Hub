import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";

const MULTI_PRODUCT_PART_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "feedface",
  updated: "2026-03-21T14:00:00Z",
  productParts: [
    {
      id: "desktop-shell",
      role: "shell",
      title: "Desktop Shell",
      purpose: "Owns the operator-facing desktop surface.",
      clusterIds: ["workspace", "review", "navigation"],
      standaloneModuleIds: [],
    },
    {
      id: "local-core-runtime",
      role: "runtime",
      title: "Local Core Runtime",
      purpose: "Owns stage execution and persistence.",
      clusterIds: ["project-flow"],
      standaloneModuleIds: ["artifact-freshness"],
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


test("domainModelToReactFlow stacks wide product parts into separate rows without overlap", () => {
  const result = domainModelToReactFlow(MULTI_PRODUCT_PART_FIXTURE);

  const desktopShellNode = result.nodes.find(
    (node) => node.id === "product-part:desktop-shell"
  );
  const localCoreRuntimeNode = result.nodes.find(
    (node) => node.id === "product-part:local-core-runtime"
  );

  assert.notEqual(desktopShellNode, undefined);
  assert.notEqual(localCoreRuntimeNode, undefined);
  if (!desktopShellNode || !localCoreRuntimeNode) {
    return;
  }

  assert.equal(desktopShellNode.position.x, 0);
  assert.equal(desktopShellNode.position.y, 0);
  assert.equal(localCoreRuntimeNode.position.x, 0);
  assert.equal(Number(desktopShellNode.style?.width ?? 0) > 980, true);
  assert.equal(
    localCoreRuntimeNode.position.y >= Number(desktopShellNode.style?.height ?? 0),
    true
  );
});
