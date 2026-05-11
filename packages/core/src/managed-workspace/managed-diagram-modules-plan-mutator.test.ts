import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiagramModulesPlanMutatorShimSource,
  injectDiagramModulesRepairTaskPair,
  insertNextDiagramModulesProductPartTaskPair,
} from "./managed-diagram-modules-plan-mutator";

const PRODUCT_PART_TASK_RE = /diagram-modules\.product-part\.local-runtime/u;
const PRODUCT_PART_COMMIT_RE =
  /docs: update diagram modules product part local-runtime/u;
const PROJECT_MANAGER_TASK_RE =
  /diagram-modules\.product-part\.project-manager/u;
const REPAIR1_TASK_RE =
  /diagram-modules\.product-part\.local-runtime\.repair1\.task1/u;
const REPAIR2_TASK_RE =
  /diagram-modules\.product-part\.local-runtime\.repair2\.task1/u;
const REPAIR1_STATE_RE =
  /"currentTaskId": "diagram-modules\.product-part\.local-runtime\.repair1\.task1"/u;
const REPAIR_COMMIT_RE =
  /docs: repair diagram modules product part local-runtime attempt 1/u;
const BLOCKED_ORIGINAL_RE =
  /\[BLOCKED\] `diagram-modules\.product-part\.local-runtime`/u;
const BLOCKED_COMMIT_RE =
  /\[BLOCKED\] Git Commit: `docs: update diagram modules product part local-runtime` \(hash: not-created-core-rejected-before-commit\)/u;
const TARGET_ARTIFACT_RE =
  /target: `\.codeai-hub\/demo\/diagram_modules\/product-parts\/local-runtime\.md`/u;
const VALIDATOR_RE = /validator: `diagram_modules\.product_part`/u;
const DIAGNOSTIC_RE = /Missing Part ID `local-runtime`/u;
const SHIM_INSERT_FUNCTION_RE = /insertDiagramModulesProductPartTasks/u;
const SHIM_COLLECT_FUNCTION_RE = /collectProductPartIdsFromIndex/u;
const SHIM_REPAIR_TASK_RE = /repair1/u;

const createPlan = (taskId = "diagram-modules.product-part.local-runtime") =>
  [
    "# Managed Workspace TODO Plan",
    "",
    "<!-- codeai-plan-state:start -->",
    "```json",
    JSON.stringify(
      {
        schema: "codeai-plan-v1",
        executionScopeStatus: "ACTIVE",
        currentTaskId: taskId,
        expectedCommitMessage:
          taskId === "diagram-modules.product-part.local-runtime"
            ? "docs: update diagram modules product part local-runtime"
            : "docs: repair diagram modules product part local-runtime attempt 1",
      },
      null,
      2
    ),
    "```",
    "<!-- codeai-plan-state:end -->",
    "",
    "## Phase 1",
    "",
    '1. [IN_PROGRESS] `diagram-modules.product-part.local-runtime` Materialize only Diagram Modules Product Part "local-runtime" and stop for Core acceptance (scope: `.codeai-hub/**/diagram_modules/product-parts/local-runtime.md`; expected commit: `docs: update diagram modules product part local-runtime`).',
    "2. [TODO] Git Commit: `docs: update diagram modules product part local-runtime` (hash: TBD)",
  ].join("\n");

test("product part mutator inserts the first uncommitted Product Part task pair", () => {
  const lines = [
    "1. [DONE] `diagram-modules.stream1.task1` Update Diagram Modules Product Part index artifact (scope: `.codeai-hub/demo/diagram_modules/product-parts.index.md`; expected commit: `docs: update diagram modules product part index`).",
    "2. [DONE] Git Commit: `docs: update diagram modules product part index` (hash: abc123)",
  ];

  const result = insertNextDiagramModulesProductPartTaskPair({
    changedFiles: [".codeai-hub/demo/diagram_modules/product-parts.index.md"],
    commitLineIndex: 1,
    lines,
    productPartIds: ["local-runtime"],
  });

  assert.equal(result.inserted, true);
  assert.equal(result.nextPartId, "local-runtime");
  const text = result.lines.join("\n");
  assert.match(text, PRODUCT_PART_TASK_RE);
  assert.match(text, PRODUCT_PART_COMMIT_RE);
});

test("product part mutator skips already committed Product Parts", () => {
  const lines = [
    "1. [DONE] `diagram-modules.product-part.local-runtime` Update Diagram Modules Product Part artifacts: local-runtime (scope: `.codeai-hub/demo/diagram_modules/product-parts/local-runtime.md`; expected commit: `docs: update diagram modules product part local-runtime`).",
    "2. [DONE] Git Commit: `docs: update diagram modules product part local-runtime` (hash: abc123)",
  ];

  const result = insertNextDiagramModulesProductPartTaskPair({
    changedFiles: [
      ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
    ],
    commitLineIndex: 1,
    lines,
    productPartIds: ["local-runtime", "project-manager"],
  });

  assert.equal(result.inserted, true);
  assert.equal(result.nextPartId, "project-manager");
  assert.match(result.lines.join("\n"), PROJECT_MANAGER_TASK_RE);
});

test("repair injection blocks the rejected task and creates repair1 as the only current task", () => {
  const result = injectDiagramModulesRepairTaskPair({
    diagnostics: ["Missing Part ID `local-runtime`."],
    partId: "local-runtime",
    planText: createPlan(),
    targetArtifactPath:
      ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
    targetKind: "product_part",
    validator: "diagram_modules.product_part",
  });

  assert.ok(result);
  if (!result) {
    return;
  }
  assert.equal(
    result.nextCurrentTaskId,
    "diagram-modules.product-part.local-runtime.repair1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: repair diagram modules product part local-runtime attempt 1"
  );
  assert.equal(result.repairNumber, 1);
  assert.match(result.nextPlanText, BLOCKED_ORIGINAL_RE);
  assert.match(result.nextPlanText, BLOCKED_COMMIT_RE);
  assert.match(result.nextPlanText, REPAIR1_TASK_RE);
  assert.match(result.nextPlanText, REPAIR1_STATE_RE);
  assert.match(result.nextPlanText, REPAIR_COMMIT_RE);
  assert.match(result.nextPlanText, TARGET_ARTIFACT_RE);
  assert.match(result.nextPlanText, VALIDATOR_RE);
  assert.match(result.nextPlanText, DIAGNOSTIC_RE);
});

test("repair injection increments repeated repair attempts", () => {
  const first = injectDiagramModulesRepairTaskPair({
    diagnostics: ["Missing Part ID `local-runtime`."],
    partId: "local-runtime",
    planText: createPlan(),
    targetArtifactPath:
      ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
    targetKind: "product_part",
    validator: "diagram_modules.product_part",
  });

  assert.ok(first);
  if (!first) {
    return;
  }
  const second = injectDiagramModulesRepairTaskPair({
    diagnostics: ["Still invalid."],
    partId: "local-runtime",
    planText: first.nextPlanText,
    targetArtifactPath:
      ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
    targetKind: "product_part",
    validator: "diagram_modules.product_part",
  });

  assert.equal(second?.repairNumber, 2);
  assert.match(second?.nextPlanText ?? "", REPAIR2_TASK_RE);
});

test("shim source delegates Product Part insertion to the generated helper block", () => {
  const source = createDiagramModulesPlanMutatorShimSource();

  assert.match(source, SHIM_INSERT_FUNCTION_RE);
  assert.match(source, SHIM_COLLECT_FUNCTION_RE);
  assert.doesNotMatch(source, SHIM_REPAIR_TASK_RE);
});
