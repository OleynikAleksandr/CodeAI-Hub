import assert from "node:assert/strict";
import test from "node:test";
import { ClusterContractPromptBuilder } from "./cluster-contract-prompt-builder";

const SPEC_TARGET_RE = /ClusterSpecification\.draft\.md/u;
const FACADE_JSON_TARGET_RE = /ClusterFacadeContract\.draft\.json/u;
const PRODUCT_PART_BRIEF_RE = /Accepted Product Part Development Brief/u;
const ORDER_PLAN_JSON_RE = /Accepted Development Order Plan JSON/u;
const NO_MODULE_AGENTS_RE = /do not open module agents/u;

test("ClusterContractPromptBuilder includes artifact targets and inline context", () => {
  const prompt = new ClusterContractPromptBuilder().buildPrompt({
    applicationSkeletonMap: '{"root":"app"}',
    clusterId: "note-selection-cluster",
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
});
