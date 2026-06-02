import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import { resolveCanonicalLastActive } from "./workflow-state-last-active-resolver";

const createState = (): WorkflowState =>
  ({
    gates: [],
    stages: {},
    updatedAt: "2026-06-02T11:00:00.000Z",
    workspaceSlug: "demo-workspace",
  }) as unknown as WorkflowState;

test("resolveCanonicalLastActive preserves newer Quality Gates last active stage", () => {
  const lastActive = resolveCanonicalLastActive({
    chains: [],
    description: {
      finalPath: ".codeai-hub/demo-workspace/description/Final_Description.md",
      updatedAt: "2026-06-02T09:00:00.000Z",
    },
    lastActive: {
      artifactPath:
        ".codeai-hub/demo-workspace/quality_gates/quality-gates.json",
      stage: "quality_gates",
      updatedAt: "2026-06-02T10:00:00.000Z",
    },
    state: createState(),
    workspaceSlug: "demo-workspace",
  });

  assert.equal(lastActive?.stage, "quality_gates");
  assert.equal(
    lastActive?.artifactPath,
    ".codeai-hub/demo-workspace/quality_gates/quality-gates.json"
  );
});

test("resolveCanonicalLastActive ignores Development Tree continuity stages", () => {
  const lastActive = resolveCanonicalLastActive({
    chains: [
      {
        segments: [{}],
        stage: "development_tree/materialized/product-parts/engine",
        updatedAt: "2026-06-02T12:00:00.000Z",
      },
    ],
    description: {
      finalPath: ".codeai-hub/demo-workspace/description/Final_Description.md",
      updatedAt: "2026-06-02T09:00:00.000Z",
    },
    lastActive: null,
    state: createState(),
    workspaceSlug: "demo-workspace",
  });

  assert.equal(lastActive?.stage, "description");
});
