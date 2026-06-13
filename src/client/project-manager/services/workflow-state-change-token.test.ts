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

test("workflow state token keeps read-only projection changes observable", () => {
  const previous = createSnapshot({
    managedWorkflowPreview: {
      active: true,
      mode: "preview",
      readOnlyStages: ["description", "virtual_simulation"],
      reason: "Managed workflow preview is enabled.",
      stages: [],
    },
    technicalStageRewriteBoundary: {
      active: true,
      blockers: [],
      readOnlyStages: ["description", "virtual_simulation"],
    },
  });
  const next = createSnapshot({
    managedWorkflowPreview: {
      active: true,
      mode: "preview",
      readOnlyStages: [],
      reason: "Managed workflow preview is enabled.",
      stages: [],
    },
    technicalStageRewriteBoundary: {
      active: false,
      blockers: [],
      readOnlyStages: [],
    },
  });

  assert.notEqual(
    buildWorkflowStateChangeToken(previous),
    buildWorkflowStateChangeToken(next)
  );
});

test("workflow state token keeps user gate cursor changes observable", () => {
  const previous = createSnapshot({
    userGateCursor: {
      activeUserGate: null,
      queuedUserGates: [],
    },
  });
  const next = createSnapshot({
    userGateCursor: {
      activeUserGate: {
        currentTaskId:
          "development-tree.product-part.finder-widget.phase2.brief-review.task1",
        expectedCommitMessage:
          "docs: accept finder-widget product part development brief",
        id: "product-part:finder-widget/brief-review",
        nodeId: "product-part:finder-widget",
        nodeKind: "product_part",
        partId: "finder-widget",
        session: {
          sessionId: "finder-widget-dialog",
        },
        status: "active",
      },
      queuedUserGates: [
        {
          id: "workflow:quality_gates/review",
          nodeId: "workflow:quality_gates",
          nodeKind: "workflow_stage",
          stage: "quality_gates",
          status: "queued",
        },
      ],
    },
  });

  assert.notEqual(
    buildWorkflowStateChangeToken(previous),
    buildWorkflowStateChangeToken(next)
  );
});

test("workflow state token distinguishes repeated gates on the same node", () => {
  const previous = createSnapshot({
    userGateCursor: {
      activeUserGate: {
        currentTaskId:
          "development-tree.product-part.finder-widget.phase2.brief-review.task1",
        expectedCommitMessage:
          "docs: accept finder-widget product part development brief",
        id: "product-part:finder-widget/brief-review",
        nodeId: "product-part:finder-widget",
        nodeKind: "product_part",
        partId: "finder-widget",
        status: "active",
      },
      queuedUserGates: [],
    },
  });
  const next = createSnapshot({
    userGateCursor: {
      activeUserGate: {
        currentTaskId:
          "development-tree.product-part.finder-widget.phase4.order-plan-review.task1",
        expectedCommitMessage: "docs: accept lead development order plan",
        id: "product-part:finder-widget/order-plan-review",
        nodeId: "product-part:finder-widget",
        nodeKind: "product_part",
        partId: "finder-widget",
        status: "active",
      },
      queuedUserGates: [],
    },
  });

  assert.notEqual(
    buildWorkflowStateChangeToken(previous),
    buildWorkflowStateChangeToken(next)
  );
});
