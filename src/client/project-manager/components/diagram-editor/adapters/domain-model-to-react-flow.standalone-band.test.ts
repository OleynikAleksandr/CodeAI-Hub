import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";
import type { ProductPartFlowNodeData } from "./domain-model-to-react-flow.types";

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

test("domainModelToReactFlow nests clusters and standalone modules inside ProductPart data", () => {
  const result = domainModelToReactFlow(STANDALONE_WRAP_FIXTURE);

  assert.equal(result.nodes.length, 1);
  const ppNode = result.nodes[0]!;
  assert.equal(ppNode.id, "product-part:local-core-runtime");
  assert.equal(ppNode.type, "productPart");

  const data = ppNode.data as ProductPartFlowNodeData;
  assert.equal(data.clusters.length, 2);
  assert.equal(data.standaloneModules.length, 4);

  const projectFlow = data.clusters.find((c) => c.clusterId === "project-flow");
  assert.notEqual(projectFlow, undefined);
  assert.equal(projectFlow?.modules.length, 1);
  assert.equal(projectFlow?.modules[0]?.moduleId, "stage-flow-controller");

  const artifactStore = data.clusters.find((c) => c.clusterId === "artifact-store");
  assert.notEqual(artifactStore, undefined);
  assert.equal(artifactStore?.modules.length, 1);

  const standaloneIds = data.standaloneModules.map((m) => m.moduleId);
  assert.equal(standaloneIds.includes("description-stage"), true);
  assert.equal(standaloneIds.includes("virtual-simulation-stage"), true);
  assert.equal(standaloneIds.includes("diagram-modules-stage"), true);
  assert.equal(standaloneIds.includes("artifact-freshness"), true);
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
      purpose: "Runs and coordinates workflow stages.",
      productPart: "local-core-runtime",
      moduleIds: ["step-eligibility-guard", "step-execution-coordinator", "dependency-refresh-marker"],
    },
  ],
  modules: [
    {
      id: "step-eligibility-guard",
      kind: "service",
      title: "Step Eligibility Guard",
      responsibility: "Decides whether the requested workflow step is allowed.",
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
      responsibility: "Runs an approved workflow step against the right inputs.",
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
      responsibility: "Marks later workflow results as outdated.",
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

test("domainModelToReactFlow nests all cluster modules inside the cluster data", () => {
  const result = domainModelToReactFlow(CLUSTER_STACK_FIXTURE);

  assert.equal(result.nodes.length, 1);
  const data = result.nodes[0]!.data as ProductPartFlowNodeData;

  assert.equal(data.clusters.length, 1);
  const cluster = data.clusters[0]!;
  assert.equal(cluster.clusterId, "workflow-orchestration");
  assert.equal(cluster.modules.length, 3);

  const moduleIds = cluster.modules.map((m) => m.moduleId);
  assert.equal(moduleIds.includes("step-eligibility-guard"), true);
  assert.equal(moduleIds.includes("step-execution-coordinator"), true);
  assert.equal(moduleIds.includes("dependency-refresh-marker"), true);
  assert.equal(data.standaloneModules.length, 0);
});
