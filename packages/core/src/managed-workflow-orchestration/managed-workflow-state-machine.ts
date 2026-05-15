import type { ManagedWorkflowEffect } from "./managed-workflow-effects";
import type { ManagedWorkflowEvent } from "./managed-workflow-events";
import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";
import {
  createManagedWorkflowPhaseSnapshot,
  TYPE_A_CORE_GATED_PHASE,
} from "./managed-workflow-phase-contracts";
import type {
  ManagedWorkflowSnapshot,
  ManagedWorkflowSnapshotPatch,
} from "./managed-workflow-snapshot";

export interface ManagedWorkflowStateTransition {
  readonly effects: readonly ManagedWorkflowEffect[];
  readonly snapshot: ManagedWorkflowSnapshot;
}

export interface ManagedWorkflowInitialSnapshotOptions {
  readonly stageId: ManagedWorkflowStageId;
  readonly updatedAt: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const patchSnapshot = (
  snapshot: ManagedWorkflowSnapshot,
  patch: ManagedWorkflowSnapshotPatch,
  updatedAt: string
): ManagedWorkflowSnapshot => ({
  ...snapshot,
  ...patch,
  updatedAt,
});

const buildSnapshotEffects = (
  snapshot: ManagedWorkflowSnapshot
): readonly ManagedWorkflowEffect[] => [
  { kind: "persist_snapshot", snapshot, stageId: snapshot.stageId },
  { kind: "expose_read_model", snapshot, stageId: snapshot.stageId },
];

export class ManagedWorkflowStateMachine {
  createInitialSnapshot(
    options: ManagedWorkflowInitialSnapshotOptions
  ): ManagedWorkflowSnapshot {
    return {
      accepted: false,
      activeTaskId: null,
      blocker: null,
      currentPhase: createManagedWorkflowPhaseSnapshot(TYPE_A_CORE_GATED_PHASE),
      integrated: false,
      lastCoreMessage: null,
      materialized: false,
      stageId: options.stageId,
      status: "idle",
      updatedAt: options.updatedAt,
      version: 1,
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
    };
  }

  reduce(
    snapshot: ManagedWorkflowSnapshot,
    event: ManagedWorkflowEvent
  ): ManagedWorkflowStateTransition {
    if (event.stageId !== snapshot.stageId) {
      return { effects: [], snapshot };
    }

    switch (event.kind) {
      case "stage_start_requested":
        return this.startStage(snapshot, event.occurredAt);
      case "core_validation_completed":
        return this.completeCoreValidation(snapshot, event);
      case "user_message_received":
        return this.receiveUserMessage(snapshot, event);
      case "provider_turn_completed":
        return this.completeProviderTurn(snapshot, event.occurredAt);
      case "provider_turn_failed":
        return this.failProviderTurn(snapshot, event);
      case "recovery_tick":
        return this.recover(snapshot, event.occurredAt);
      default:
        return { effects: [], snapshot };
    }
  }

  private completeCoreValidation(
    snapshot: ManagedWorkflowSnapshot,
    event: Extract<
      ManagedWorkflowEvent,
      { readonly kind: "core_validation_completed" }
    >
  ): ManagedWorkflowStateTransition {
    if (event.result === "accepted") {
      const next = patchSnapshot(
        snapshot,
        {
          blocker: null,
          lastCoreMessage: "Core accepted the current managed phase.",
          status:
            snapshot.currentPhase?.type === "persistent_user_return"
              ? "persistent_return_open"
              : "waiting_for_user",
        },
        event.occurredAt
      );
      return {
        effects: [
          {
            kind: "append_core_message",
            message: next.lastCoreMessage ?? "",
            stageId: next.stageId,
            visibleToProvider: false,
            visibleToUser: true,
          },
          ...buildSnapshotEffects(next),
        ],
        snapshot: next,
      };
    }

    const next = patchSnapshot(
      snapshot,
      {
        blocker: {
          code: "core_validation_rejected",
          detail: event.reasons.join("\n"),
          owner: "provider",
        },
        lastCoreMessage: event.reasons.join("\n"),
        status: "waiting_for_provider",
      },
      event.occurredAt
    );
    return {
      effects: [
        {
          detail: next.lastCoreMessage ?? "",
          kind: "record_audit_entry",
          stageId: next.stageId,
        },
        {
          kind: "append_core_message",
          message: next.lastCoreMessage ?? "",
          stageId: next.stageId,
          visibleToProvider: true,
          visibleToUser: true,
        },
        ...buildSnapshotEffects(next),
      ],
      snapshot: next,
    };
  }

  private completeProviderTurn(
    snapshot: ManagedWorkflowSnapshot,
    updatedAt: string
  ): ManagedWorkflowStateTransition {
    const next = patchSnapshot(
      snapshot,
      { blocker: null, status: "core_gated" },
      updatedAt
    );
    return { effects: buildSnapshotEffects(next), snapshot: next };
  }

  private failProviderTurn(
    snapshot: ManagedWorkflowSnapshot,
    event: Extract<
      ManagedWorkflowEvent,
      { readonly kind: "provider_turn_failed" }
    >
  ): ManagedWorkflowStateTransition {
    const next = patchSnapshot(
      snapshot,
      {
        blocker: {
          code: "provider_turn_failed",
          detail: event.errorMessage,
          owner: "provider",
        },
        lastCoreMessage: event.errorMessage,
        status: event.recoverable ? "waiting_for_provider" : "blocked",
      },
      event.occurredAt
    );
    return { effects: buildSnapshotEffects(next), snapshot: next };
  }

  private receiveUserMessage(
    snapshot: ManagedWorkflowSnapshot,
    event: Extract<
      ManagedWorkflowEvent,
      { readonly kind: "user_message_received" }
    >
  ): ManagedWorkflowStateTransition {
    const accepted = event.intent === "accept";
    const message = accepted
      ? "User accepted the managed contract; continue with the next Core-owned phase."
      : event.content;
    const next = patchSnapshot(
      snapshot,
      {
        accepted: snapshot.accepted || accepted,
        lastCoreMessage: message,
        status: "waiting_for_provider",
      },
      event.occurredAt
    );
    return {
      effects: [
        {
          kind: "append_core_message",
          message,
          stageId: next.stageId,
          visibleToProvider: true,
          visibleToUser: accepted,
        },
        ...buildSnapshotEffects(next),
      ],
      snapshot: next,
    };
  }

  private recover(
    snapshot: ManagedWorkflowSnapshot,
    updatedAt: string
  ): ManagedWorkflowStateTransition {
    const next = patchSnapshot(snapshot, {}, updatedAt);
    return {
      effects: [
        {
          detail: `Recovery tick observed state: ${snapshot.status}`,
          kind: "record_audit_entry",
          stageId: snapshot.stageId,
        },
        ...buildSnapshotEffects(next),
      ],
      snapshot: next,
    };
  }

  private startStage(
    snapshot: ManagedWorkflowSnapshot,
    updatedAt: string
  ): ManagedWorkflowStateTransition {
    const next = patchSnapshot(
      snapshot,
      {
        blocker: null,
        lastCoreMessage: "Core opened a managed workflow phase.",
        status: "core_gated",
      },
      updatedAt
    );
    return {
      effects: [
        {
          kind: "append_core_message",
          message: next.lastCoreMessage ?? "",
          stageId: next.stageId,
          visibleToProvider: true,
          visibleToUser: true,
        },
        ...buildSnapshotEffects(next),
      ],
      snapshot: next,
    };
  }
}
