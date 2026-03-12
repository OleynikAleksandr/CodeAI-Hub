import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";
import type { DialogOpenIntent } from "./project-manager-dialog-session-view";
import {
  resolveLatestWorkflowStage,
  shouldDiscardRestoredDialogIntent,
} from "./project-manager-dialog-session-view-helpers";

const createWorkflowState = (params?: {
  readonly stages?: Partial<WorkflowStateSnapshot["stages"]>;
  readonly continuity?: WorkflowStateSnapshot["continuity"];
  readonly description?: WorkflowStateSnapshot["description"];
}): WorkflowStateSnapshot =>
  ({
    workspaceSlug: "workspace-alpha",
    updatedAt: "2026-03-12T21:00:00.000Z",
    stages: {
      description: "idle",
      virtual_simulation: "idle",
      diagram_modules: "idle",
      diagram_facades: "idle",
      ...params?.stages,
    },
    continuity: params?.continuity ?? { chains: [] },
    description: params?.description ?? null,
    executionProfile: null,
    gating: {
      blocked: {
        description: false,
        virtual_simulation: false,
        diagram_modules: false,
        diagram_facades: false,
      },
      reasons: {},
    } as never,
  }) as WorkflowStateSnapshot;

const createIntent = (stage: DialogOpenIntent["stage"]): DialogOpenIntent => ({
  providerId: "codexCli",
  providerSessionId: "provider-session-1",
  workspacePath: "/tmp/workspace-alpha",
  workspaceSlug: "workspace-alpha",
  initiativeSlug: "workspace-alpha",
  stage,
  sessionKind: stage === "description" ? null : "collector",
  runSlug: null,
});

test("resolveLatestWorkflowStage prefers the furthest reconciled workflow stage", () => {
  const workflowState = createWorkflowState({
    stages: {
      description: "completed",
      virtual_simulation: "completed",
      diagram_modules: "in_progress",
    },
    description: {
      updatedAt: "2026-03-12T20:00:00.000Z",
      finalPath: ".codeai-hub/workspace-alpha/description/Final_Description.md",
    },
  });

  assert.equal(resolveLatestWorkflowStage(workflowState), "diagram_modules");
});

test("shouldDiscardRestoredDialogIntent drops stale restore when a later stage is already active", () => {
  const workflowState = createWorkflowState({
    stages: {
      description: "completed",
      virtual_simulation: "in_progress",
    },
    continuity: {
      chains: [
        {
          rootSessionId: "root-vs",
          workspaceSlug: "workspace-alpha",
          stage: "virtual_simulation",
          updatedAt: "2026-03-12T20:05:00.000Z",
          segments: [
            {
              sessionId: "vs-session-1",
              providerId: "codexCli",
              providerSessionId: "provider-vs-1",
              createdAt: "2026-03-12T20:05:00.000Z",
            },
          ],
        },
      ],
    },
    description: {
      updatedAt: "2026-03-12T20:00:00.000Z",
      finalPath: ".codeai-hub/workspace-alpha/description/Final_Description.md",
    },
  });

  assert.equal(
    shouldDiscardRestoredDialogIntent({
      intent: createIntent("description"),
      workflowState,
    }),
    true
  );
});

test("shouldDiscardRestoredDialogIntent keeps restore when it matches the latest stage", () => {
  const workflowState = createWorkflowState({
    stages: {
      description: "completed",
      virtual_simulation: "completed",
    },
    continuity: {
      chains: [
        {
          rootSessionId: "root-vs",
          workspaceSlug: "workspace-alpha",
          stage: "virtual_simulation",
          updatedAt: "2026-03-12T20:05:00.000Z",
          segments: [
            {
              sessionId: "vs-session-1",
              providerId: "codexCli",
              providerSessionId: "provider-vs-1",
              createdAt: "2026-03-12T20:05:00.000Z",
            },
          ],
        },
      ],
    },
    description: {
      updatedAt: "2026-03-12T20:00:00.000Z",
      finalPath: ".codeai-hub/workspace-alpha/description/Final_Description.md",
    },
  });

  assert.equal(
    shouldDiscardRestoredDialogIntent({
      intent: createIntent("virtual_simulation"),
      workflowState,
    }),
    false
  );
});
