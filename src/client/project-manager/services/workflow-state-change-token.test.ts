import { strict as assert } from "node:assert";
import test from "node:test";
import type { WorkflowStateSnapshot } from "./workflow-state-client";
import { buildWorkflowStateChangeToken } from "./workflow-state-change-token";

const createSnapshot = (
  overrides: Partial<WorkflowStateSnapshot> = {}
): WorkflowStateSnapshot => ({
  workspaceSlug: "demo-workspace",
  updatedAt: "2026-05-15T16:20:25.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "completed",
    diagram_modules: "in_progress",
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: {
    chains: [
      {
        rootSessionId: "diagram-root",
        workspaceSlug: "demo-workspace",
        stage: "diagram_modules",
        segments: [
          {
            sessionId: "diagram-session",
            providerId: "codexCli",
            providerSessionId: "codex-provider-session",
            createdAt: "2026-05-15T16:18:00.000Z",
          },
        ],
        updatedAt: "2026-05-15T16:18:00.000Z",
      },
    ],
  },
  lastActive: {
    artifactPath: ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
    stage: "diagram_modules",
    updatedAt: "2026-05-15T16:20:25.000Z",
  },
  description: {
    finalPath: ".codeai-hub/demo-workspace/description/Final_Description.md",
    updatedAt: "2026-05-15T16:00:00.000Z",
  },
  gating: {
    blocked: {
      description: true,
      virtual_simulation: true,
      diagram_modules: false,
      application_skeleton: true,
      quality_gates: true,
    },
  },
  diagramModulesProgress: {
    activeSubturn: {
      kind: "product_part",
      partId: "project-manager",
      status: "accepted",
    },
    aggregateReady: false,
    generatedCount: 1,
    generatedPartIds: ["project-manager"],
    plannedCount: 2,
    plannedPartIds: ["project-manager", "core-runtime"],
    substep: "generate_product_part",
  },
  applicationSkeletonProgress: null,
  qualityGatesProgress: null,
  managedWorkflowPreview: null,
  technicalStageRewriteBoundary: null,
  developmentTree: null,
  ...overrides,
});

test("workflow state token changes when derived Diagram Modules readiness changes", () => {
  const previous = createSnapshot();
  const next = createSnapshot({
    gating: {
      blocked: {
        ...previous.gating.blocked,
        application_skeleton: false,
      },
    },
    diagramModulesProgress: {
      activeSubturn: { kind: "aggregate", status: "accepted" },
      aggregateReady: true,
      generatedCount: 2,
      generatedPartIds: ["project-manager", "core-runtime"],
      plannedCount: 2,
      plannedPartIds: ["project-manager", "core-runtime"],
      substep: "awaiting_review",
    },
  });

  assert.notEqual(
    buildWorkflowStateChangeToken(previous),
    buildWorkflowStateChangeToken(next)
  );
});

test("workflow state token preserves unchanged snapshot equality", () => {
  const previous = createSnapshot();
  const next = createSnapshot();

  assert.equal(
    buildWorkflowStateChangeToken(previous),
    buildWorkflowStateChangeToken(next)
  );
});

test("workflow state token keeps continuity-chain changes observable", () => {
  const previous = createSnapshot();
  const next = createSnapshot({
    continuity: {
      chains: [
        ...previous.continuity.chains,
        {
          rootSessionId: "application-root",
          workspaceSlug: "demo-workspace",
          stage: "application_skeleton",
          segments: [],
          updatedAt: "2026-05-15T16:21:00.000Z",
        },
      ],
    },
  });

  assert.notEqual(
    buildWorkflowStateChangeToken(previous),
    buildWorkflowStateChangeToken(next)
  );
});
