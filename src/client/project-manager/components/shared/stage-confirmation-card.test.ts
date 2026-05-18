import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/shared/stage-confirmation-card.tsx"
);
const WORKFLOW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts"
);
const DEVELOPMENT_TREE_NODE_START_CARD_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/development-tree-node-start-card.tsx"
);

test("stage confirmation card keeps explicit provider override in start path", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("const [selectedProviderId, setSelectedProviderId] ="), true);
  assert.equal(source.includes("resolvePreferredWorkflowProviderId({"), true);
  assert.equal(source.includes("providerId: selectedProviderId,"), true);
  assert.equal(source.includes("modelId: selectedModelId,"), true);
  assert.equal(source.includes("reasoning: selectedReasoning,"), true);
  assert.equal(source.includes("startService.startVirtualSimulation("), true);
  assert.equal(source.includes("startService.startDiagramModules("), true);
  assert.equal(source.includes("startService.startApplicationSkeleton("), true);
  assert.equal(source.includes("startService.startQualityGates("), true);
});

test("stage confirmation card exposes model and reasoning controls", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("getStartCardModelOptions("), true);
  assert.equal(source.includes("getStartCardReasoningOptions("), true);
  assert.equal(source.includes("CaptureWorkbenchDomListboxSelector"), true);
  assert.equal(source.includes('"pm.confirmation_card.model_label"'), true);
  assert.equal(source.includes('"pm.confirmation_card.reasoning_label"'), true);
  assert.equal(source.includes("<select"), false);
});

test("development tree node start card avoids native selects", async () => {
  const source = await readFile(DEVELOPMENT_TREE_NODE_START_CARD_SOURCE_PATH, "utf8");

  assert.equal(source.includes("CaptureWorkbenchDomListboxSelector"), true);
  assert.equal(source.includes("api.startDevelopmentTreeNode({"), true);
  assert.equal(source.includes("<select"), false);
});

test("stage confirmation card keeps previous-step badge and override helper copy", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('"pm.confirmation_card.previous_provider_badge"'),
    true
  );
  assert.equal(
    source.includes('"pm.confirmation_card.selected_provider_hint"'),
    true
  );
  assert.equal(
    source.includes('"pm.confirmation_card.selected_provider_override_hint"'),
    true
  );
  assert.equal(source.includes("isUsingInheritedProvider"), true);
});

test("stage confirmation card hides managed workflow preview details", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("managedPreviewStage"), true);
  assert.equal(
    source.includes('"pm.confirmation_card.managed_preview_title"'),
    false
  );
  assert.equal(source.includes("Managed Workflow Orchestration preview"), false);
  assert.equal(source.includes("Accept contract"), false);
});

test("stage model listbox keeps model labels on one line", async () => {
  const source = await readFile(
    path.resolve(
      process.cwd(),
      "src/client/project-manager/components/capture-workbench/dom-listbox-selector.tsx"
    ),
    "utf8"
  );

  assert.equal(source.includes('minWidth: "max(100%, 220px)"'), true);
  assert.equal(source.includes('width: "max-content"'), true);
  assert.equal(source.includes('whiteSpace: "nowrap"'), true);
});

test("stage confirmation workflow includes technical root stage labels", async () => {
  const source = await readFile(WORKFLOW_SOURCE_PATH, "utf8");

  assert.equal(source.includes('application_skeleton: "Application Skeleton"'), true);
  assert.equal(source.includes('quality_gates: "Quality Gates Baseline"'), true);
  assert.equal(
    source.includes('quality_gates: "materialized Application Skeleton"'),
    true
  );
  assert.equal(source.includes('application_skeleton: "product-parts.index.md"'), true);
  assert.equal(source.includes('quality_gates: "application-skeleton-map.json"'), true);
});
