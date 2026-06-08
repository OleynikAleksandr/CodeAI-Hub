import assert from "node:assert/strict";
import test from "node:test";
import {
  createClusterContractSummaryPath,
  LeadProductPartCoordinationService,
} from "./lead-product-part-coordination-service";

test("LeadProductPartCoordinationService creates cluster merge-ready summaries", () => {
  const summary =
    new LeadProductPartCoordinationService().createClusterContractSummary({
      clusterId: "note-selection-cluster",
      partId: "finder-widget",
      reviewCommitHash: "abc123",
      sessionId: "cluster-session-1",
      updatedAt: "2026-06-08T00:00:00.000Z",
    });

  assert.equal(summary.nodeId, "cluster:finder-widget/note-selection-cluster");
  assert.equal(summary.reviewState, "merge_ready");
  assert.equal(
    createClusterContractSummaryPath({
      clusterId: "note-selection-cluster",
      partId: "finder-widget",
      workspaceSlug: "demo",
    }),
    ".codeai-hub/demo/workflow/managed/development-tree-clusters/finder-widget/note-selection-cluster.review-result.json"
  );
});
