import assert from "node:assert/strict";
import test from "node:test";
import { ClusterContractPromptBuilder } from "./cluster-contract-prompt-builder";

const SPEC_TARGET_RE = /ClusterSpecification\.draft\.md/u;
const FACADE_JSON_TARGET_RE = /ClusterFacadeContract\.draft\.json/u;
const PRODUCT_PART_BRIEF_RE = /Accepted Product Part Development Brief/u;
const ORDER_PLAN_JSON_RE = /Accepted Development Order Plan JSON/u;
const NO_MODULE_AGENTS_RE = /do not open module agents/u;
const CONTRACT_SEED_RE = /Product Part Contract Seed/u;
const PRE_CODE_FACADE_RE = /pre-code artifact/u;
const FACADE_CLASS_RE = /future facade class name/u;
const CONTRACT_SEED_CONSUMER_RE = /finder-widget-shell/u;

test("ClusterContractPromptBuilder includes artifact targets and inline context", () => {
  const prompt = new ClusterContractPromptBuilder().buildPrompt({
    applicationSkeletonMap: '{"root":"app"}',
    clusterId: "note-selection-cluster",
    contractSeed: {
      blockingQuestions: ["snippet policy"],
      consumer: "finder-widget-shell",
      nodeId: "cluster:finder-widget/note-selection-cluster",
      requiredInputs: ["notes folder context"],
      requiredOutputs: ["normalized note payload"],
      requiredOwnedModules: ["latest-note-resolver"],
      requiredStatuses: ["data-found", "no-data"],
    },
    orderPlanJson: '{"schema":"codeai-development-order-plan-v2"}',
    orderPlanMarkdown: "# Development Order Plan",
    partId: "finder-widget",
    productPartBrief: "# Product Part Brief",
    qualityGatesContract: '{"gates":[]}',
    workspaceSlug: "demo",
  });

  assert.match(prompt, SPEC_TARGET_RE);
  assert.match(prompt, FACADE_JSON_TARGET_RE);
  assert.match(prompt, PRODUCT_PART_BRIEF_RE);
  assert.match(prompt, ORDER_PLAN_JSON_RE);
  assert.match(prompt, NO_MODULE_AGENTS_RE);
  assert.match(prompt, CONTRACT_SEED_RE);
  assert.match(prompt, PRE_CODE_FACADE_RE);
  assert.match(prompt, FACADE_CLASS_RE);
  assert.match(prompt, CONTRACT_SEED_CONSUMER_RE);
});
