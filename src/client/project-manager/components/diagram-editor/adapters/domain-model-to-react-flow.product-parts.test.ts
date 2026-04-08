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

const SHORTEST_COLUMN_STANDALONE_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "shortest-column",
  updated: "2026-03-23T10:00:00Z",
  productParts: [
    {
      id: "local-core-runtime",
      title: "Local Core Runtime",
      purpose: "Keeps local stage orchestration, downstream rebuild rules, and runtime lifecycle readable for the active project.",
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
      responsibility: "Keeps the current workflow state readable for the active workspace.",
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
      responsibility: "Restores the user dialogue and previously accepted artifacts when the project is reopened.",
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
      responsibility: "Keeps the local runtime alive as a separate process after it is started.",
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
      responsibility: "Pins one active AI provider for the current workspace.",
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

  assert.equal(localCoreRuntimeNode.position.x, 0);
  assert.equal(localCoreRuntimeNode.position.y, 0);
  assert.equal(desktopShellNode.position.x, 0);
  assert.equal(Number(desktopShellNode.style?.width ?? 0) > 980, true);
  assert.equal(
    desktopShellNode.position.y >= Number(localCoreRuntimeNode.style?.height ?? 0),
    true
  );
});

test("domainModelToReactFlow docks standalone modules at uniform baseline below all clusters", () => {
  const result = domainModelToReactFlow(SHORTEST_COLUMN_STANDALONE_FIXTURE);

  const workflowCluster = result.nodes.find((node) => node.id === "cluster:workflow");
  const continuityCluster = result.nodes.find((node) => node.id === "cluster:continuity");
  const standaloneNode = result.nodes.find(
    (node) => node.id === "workspace-provider-binding"
  );

  assert.notEqual(workflowCluster, undefined);
  assert.notEqual(continuityCluster, undefined);
  assert.notEqual(standaloneNode, undefined);
  if (!workflowCluster || !continuityCluster || !standaloneNode) {
    return;
  }

  const workflowBottom =
    workflowCluster.position.y + Number(workflowCluster.style?.height ?? 0);
  const continuityBottom =
    continuityCluster.position.y + Number(continuityCluster.style?.height ?? 0);
  const tallestClusterBottom = Math.max(workflowBottom, continuityBottom);

  assert.equal(standaloneNode.parentId, "product-part:local-core-runtime");
  assert.equal(workflowCluster.position.y >= 50, true);
  assert.equal(continuityCluster.position.y, workflowCluster.position.y);
  assert.equal(standaloneNode.position.x, workflowCluster.position.x);
  assert.equal(standaloneNode.position.y >= tallestClusterBottom + 12, true);
});

const LOCALIZED_PRODUCT_PART_BOUNDARY_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "localized-product-part-boundary",
  updated: "2026-04-08T08:36:00Z",
  productParts: [
    {
      id: "project-manager",
      title: "Project Manager",
      purpose:
        "Проект Manager является главной пользовательской оболочкой продукта. Здесь пользователь проходит обязательные стадии workflow, видит статус проекта, читает артефакты в человекочитаемом виде и уточняет текущее понимание через диалог.",
      clusterIds: ["pm-workflow-ui"],
      standaloneModuleIds: [
        "artifact-viewer-module",
        "dialogue-control-module",
      ],
    },
  ],
  clusters: [
    {
      id: "pm-workflow-ui",
      title: "Project Manager Workflow Ui",
      purpose:
        "Ведёт пользователя по стадиям workflow, показывает прогресс и управляет переходами между подтверждёнными действиями.",
      productPart: "project-manager",
      moduleIds: ["stage-navigation-guide", "step-run-control"],
    },
  ],
  modules: [
    {
      id: "stage-navigation-guide",
      kind: "service",
      title: "Stage Navigation Guide",
      responsibility:
        "Показывает обязательные стадии, текущий шаг и доступные следующие или предыдущие действия.",
      productPart: "project-manager",
      cluster: "pm-workflow-ui",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "step-run-control",
      kind: "service",
      title: "Step Run Control",
      responsibility:
        "Запускает активный шаг, показывает его статус выполнения и поддерживает повторный запуск или возврат к уточнению.",
      productPart: "project-manager",
      cluster: "pm-workflow-ui",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "artifact-viewer-module",
      kind: "service",
      title: "Artifact Viewer Module",
      responsibility:
        "Показывает артефакт текущего шага в человекочитаемом виде без перехода к исходному коду.",
      productPart: "project-manager",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "dialogue-control-module",
      kind: "service",
      title: "Dialogue Control Module",
      responsibility:
        "Ведёт сфокусированный диалог по текущему шагу и удерживает обсуждение в границах активного workflow-контекста.",
      productPart: "project-manager",
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

test("domainModelToReactFlow keeps localized standalone modules inside the product part boundary", () => {
  const result = domainModelToReactFlow(LOCALIZED_PRODUCT_PART_BOUNDARY_FIXTURE);

  const productPartNode = result.nodes.find(
    (node) => node.id === "product-part:project-manager"
  );
  const dialogueControlNode = result.nodes.find(
    (node) => node.id === "dialogue-control-module"
  );

  assert.notEqual(productPartNode, undefined);
  assert.notEqual(dialogueControlNode, undefined);
  if (!productPartNode || !dialogueControlNode) {
    return;
  }

  const dialogueControlBottom =
    dialogueControlNode.position.y
    + Number(dialogueControlNode.style?.minHeight ?? 0);
  const productPartBottom = Number(productPartNode.style?.height ?? 0);

  assert.equal(dialogueControlBottom + 12 <= productPartBottom, true);
});
