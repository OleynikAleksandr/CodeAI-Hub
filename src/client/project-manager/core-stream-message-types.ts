import type { LocalizationRuntimePayload } from "@codeai-hub/localization";
import type { SessionRecord } from "../../types/session";
import type {
  ProviderId,
  ProviderVersions,
} from "../ui/src/components/settings/settings-state-model";
import type { NativeRequestCaptureModelId } from "../ui/src/components/settings/use-settings-state-support";
import type { WorkspaceProject } from "./types";

export type WorkspaceScopeSyncReason =
  | "workspace_selected"
  | "reconnect"
  | "workspace_cleared";

export type WorkspaceScopeSetPayload = {
  readonly workspacePath: string | null;
  readonly workspaceSlug?: string | null;
  readonly requestId: string;
  readonly reason: WorkspaceScopeSyncReason;
};

export type WorkspaceScopeAckPayload = {
  readonly requestId: string;
  readonly status: "applied" | "rejected";
  readonly workspacePath: string | null;
  readonly error?: string | null;
};

export type WorkspaceSelectPayload = {
  readonly requestId: string;
  readonly workspaceRoot: string | null;
  readonly reason: WorkspaceScopeSyncReason;
};

export type WorkspaceSelectAckPayload = {
  readonly requestId: string;
  readonly status: "applied" | "rejected";
  readonly workspaceRoot: string | null;
  readonly selectionId: string | null;
  readonly error?: string | null;
};

export type WorkspaceSnapshotContinuityLockReason =
  | "context_check_pending"
  | "threshold_reached"
  | "report_in_progress"
  | "resume_bootstrap"
  | "no_rollover_needed"
  | "resume_ready"
  | "resume_failed"
  | "resume_timeout"
  | "terminal_no_resume";

export type WorkspaceSnapshotSessionResumeMode =
  | "no_resume"
  | "resume_in_place"
  | "resume_via_rollover";

export type WorkspaceSnapshotContinuityLockTransition = {
  readonly rolloverId: string;
  readonly sourceSessionId: string;
  readonly targetSessionId?: string;
  readonly stageId?: string;
  readonly runSlug?: string | null;
  readonly reason: WorkspaceSnapshotContinuityLockReason;
  readonly rolloverPending?: boolean;
  readonly awaitingBootstrapTurn: boolean;
  readonly resumeMode?: WorkspaceSnapshotSessionResumeMode;
  readonly finalTurnCompleted?: boolean;
  readonly terminalLockReason?: "terminal_no_resume";
  readonly updatedAt: string;
};

export type WorkspaceSnapshot = {
  readonly workspaceRoot: string;
  readonly loadState: "loading" | "ready" | "error";
  readonly error?: string | null;
  readonly workflow: {
    readonly nodes: Readonly<Record<string, unknown>>;
  };
  readonly sessions: Readonly<
    Record<
      string,
      {
        readonly nodeId: string;
        readonly turnState: "idle" | "running";
        readonly continuityLockActive: boolean;
        readonly continuityLockReason?: WorkspaceSnapshotContinuityLockReason;
        readonly continuityLockTransition?: WorkspaceSnapshotContinuityLockTransition;
        readonly resumeMode?: WorkspaceSnapshotSessionResumeMode;
        readonly finalTurnCompleted?: boolean;
        readonly terminalLockReason?: "terminal_no_resume";
        readonly lastHeartbeatAt?: string;
        readonly providerId?: string;
        readonly providerSessionId?: string;
        readonly bindingStatus?: "pending" | "ready" | "failed";
        readonly taskTimer?: {
          readonly totalSeconds: number;
          readonly runningSinceMs: number | null;
        };
      }
    >
  >;
  readonly artifacts: {
    readonly currentByNodeId: Readonly<
      Record<string, Readonly<Record<string, unknown>>>
    >;
  };
};

export type WorkspaceSnapshotPushPayload = {
  readonly workspaceRoot: string;
  readonly selectionId: string;
  readonly sequence: number;
  readonly generatedAt: string;
  readonly snapshot: WorkspaceSnapshot;
};

export type WorkspaceSnapshotRequestPayload = {
  readonly requestId: string;
  readonly workspaceRoot: string;
  readonly reason: "resync" | "debug";
};

export type CommandErrorPayload = {
  readonly requestId: string;
  readonly command: string;
  readonly message: string;
  readonly code?: string;
  readonly details?: unknown;
};

type DialogScopedRequestPayload = {
  readonly requestId: string;
  readonly workspacePath?: string;
  readonly workspaceSlug: string;
};

export type DialogListRequestPayload = DialogScopedRequestPayload;

export type DialogOpenRequestPayload = DialogScopedRequestPayload & {
  readonly dialogId: string;
};

export type DialogHistoryRequestPayload = DialogScopedRequestPayload & {
  readonly dialogId: string;
  readonly cursor?: number;
};

export type DialogSendRequestPayload = DialogScopedRequestPayload & {
  readonly dialogId: string;
  readonly content: string;
  readonly turnOptions?: Record<string, unknown>;
};

export type ProjectManagerDiagnosticLogPayload = {
  readonly channel: string;
  readonly event: string;
  readonly context?: Record<string, unknown>;
};

export type SettingsProviderTarget = "cli" | "core" | "sdk";

export type SettingsSnapshotPayload = {
  readonly localizationRuntime?: LocalizationRuntimePayload | null;
  readonly settings?: unknown;
};

export type SettingsSaveErrorPayload = {
  readonly error: string;
};

export type SettingsLocalizationSyncStatusPayload = {
  readonly busy: boolean;
  readonly message: string | null;
};

export type SettingsVersionsPayload = {
  readonly error?: string | null;
  readonly versions?: ProviderVersions;
};

export type SettingsUserGlossaryFilePayload = {
  readonly error?: string | null;
  readonly path: string | null;
};

export type SettingsTemplateUpdateResolutionAction =
  | "backup-and-replace"
  | "preserve-current"
  | "replace-with-incoming";

export type SettingsPendingTemplateUpdate = {
  readonly destinationPath: string;
  readonly destinationRelativePath: string;
  readonly id: string;
  readonly incomingPath: string;
  readonly incomingRelativePath: string;
  readonly pendingBundledHash: string;
};

export type SettingsTemplateUpdatesPayload = {
  readonly error?: string | null;
  readonly updates: readonly SettingsPendingTemplateUpdate[];
};

export type SettingsTemplateUpdateResolutionPayload = {
  readonly action: SettingsTemplateUpdateResolutionAction;
  readonly backupPath?: string;
  readonly error?: string | null;
  readonly id: string;
  readonly pendingUpdates: readonly SettingsPendingTemplateUpdate[];
  readonly status: "error" | "not_found" | "resolved";
};

export type SettingsNativeRequestCaptureProviderId =
  | "claude"
  | "codex"
  | "kimi"
  | "glmOpenCode";
export type SettingsNativeRequestCaptureModelId = NativeRequestCaptureModelId;
export type SettingsNativeRequestCaptureScenarioId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "translation"
  | "diagnostic_probe";
export type SettingsNativeRequestCaptureOptions = {
  readonly reasoning?: string | null;
  readonly scenarioId?: SettingsNativeRequestCaptureScenarioId | null;
  readonly scenarioInputPath?: string | null;
  readonly scenarioLabel?: string | null;
  readonly scenarioPrompt?: string | null;
  readonly scenarioTargetPath?: string | null;
  readonly workspacePath?: string | null;
};

export type SettingsNativeRequestCaptureResultPayload = {
  readonly error?: string | null;
  readonly jsonlPath?: string | null;
  readonly markdownPath?: string | null;
  readonly modelId?: SettingsNativeRequestCaptureModelId | null;
  readonly ok: boolean;
  readonly providerId: SettingsNativeRequestCaptureProviderId;
  readonly reason?: string | null;
};

export type SessionModelUpdatePayload = {
  readonly baseModelId?: string | null;
  readonly modelBinding?: SessionRecord["modelBinding"];
  readonly modelId: string;
  readonly providerId?: string;
  readonly sessionId: string;
};

import type {
  ClaudeModelSwitchRequestPayload,
  ClaudeThinkingSwitchRequestPayload,
  CodexModelSwitchRequestPayload,
  CodexReasoningSwitchRequestPayload,
} from "./services/switch-payloads";

export type OutgoingMessage =
  | { readonly type: "projects:list" }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    }
  | {
      readonly type: "session:create";
      readonly payload: {
        readonly providerId?: string;
        readonly workspacePath?: string;
        readonly initiativeSlug?: string | null;
        readonly providerSessionId?: string | null;
        readonly stage?: string | null;
        readonly sessionKind?: "collector" | null;
        readonly runSlug?: string | null;
      };
    }
  | {
      readonly type: "session:codex:model-switch";
      readonly payload: CodexModelSwitchRequestPayload;
    }
  | {
      readonly type: "session:codex:reasoning-switch";
      readonly payload: CodexReasoningSwitchRequestPayload;
    }
  | {
      readonly type: "session:claude:model-switch";
      readonly payload: ClaudeModelSwitchRequestPayload;
    }
  | {
      readonly type: "session:claude:thinking-switch";
      readonly payload: ClaudeThinkingSwitchRequestPayload;
    }
  | {
      readonly type: "session:message";
      readonly payload: {
        readonly sessionId: string;
        readonly content:
          | string
          | {
              readonly text: string;
              readonly turnOptions?: Record<string, unknown>;
          };
      };
    }
  | {
      readonly type: "session:stop";
      readonly payload: { readonly sessionId: string };
    }
  | { readonly type: "session:delete"; readonly payload: { readonly sessionId: string } }
  | {
      readonly type: "workspace:scope:set";
      readonly payload: WorkspaceScopeSetPayload;
    }
  | {
      readonly type: "workspace:select";
      readonly payload: WorkspaceSelectPayload;
    }
  | {
      readonly type: "workspace:snapshot:request";
      readonly payload: WorkspaceSnapshotRequestPayload;
    }
  | { readonly type: "dialog:list"; readonly payload: DialogListRequestPayload }
  | { readonly type: "dialog:open"; readonly payload: DialogOpenRequestPayload }
  | {
      readonly type: "dialog:history";
      readonly payload: DialogHistoryRequestPayload;
    }
  | { readonly type: "dialog:send"; readonly payload: DialogSendRequestPayload }
  | { readonly type: "settings:load" }
  | { readonly type: "settings:versions" }
  | {
      readonly type: "settings:save";
      readonly payload: { readonly settings: unknown };
    }
  | { readonly type: "settings:reset" }
  | { readonly type: "settings:template-updates" }
  | {
      readonly type: "settings:template-update:resolve";
      readonly payload: {
        readonly action: SettingsTemplateUpdateResolutionAction;
        readonly id: string;
      };
    }
  | {
      readonly type: "settings:native-request-capture";
      readonly payload: SettingsNativeRequestCaptureOptions & {
        readonly modelId?: SettingsNativeRequestCaptureModelId | null;
        readonly providerId: SettingsNativeRequestCaptureProviderId;
      };
    }
  | {
      readonly type: "settings:update-provider";
      readonly payload: {
        readonly provider: ProviderId;
        readonly target: SettingsProviderTarget;
      };
    }
  | { readonly type: "settings:open-user-glossary-file" }
  | {
      readonly type: "pm:diag:log";
      readonly payload: ProjectManagerDiagnosticLogPayload;
    }
  | {
      readonly type: "session:refreshUsageLimits";
      readonly payload: {
        readonly providerId: string;
        readonly providerSessionId: string | null;
        readonly sessionId: string;
      };
    };


export type IncomingMessage =
  | { readonly type: "session:created"; readonly payload: SessionRecord }
  | {
      readonly type: "session:model:update";
      readonly payload: SessionModelUpdatePayload;
    }
  | { readonly type: "workspace:scope:ack"; readonly payload: WorkspaceScopeAckPayload }
  | {
      readonly type: "workspace:select:ack";
      readonly payload: WorkspaceSelectAckPayload;
    }
  | {
      readonly type: "workspace:snapshot";
      readonly payload: WorkspaceSnapshotPushPayload;
    }
  | {
      readonly type: "command:error";
      readonly payload: CommandErrorPayload;
    }
  | {
      readonly type: "dialog:list:result";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogs: readonly unknown[];
      };
    }
  | {
      readonly type: "dialog:open:result";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly dialog: unknown | null;
        readonly error: string | null;
      };
    }
  | {
      readonly type: "dialog:history:result";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly lastCursor?: number;
        readonly messages: readonly unknown[];
        readonly error: string | null;
      };
    }
  | {
      readonly type: "dialog:send:ack";
      readonly payload: {
        readonly requestId: string;
        readonly workspaceSlug: string;
        readonly dialogId: string;
        readonly status: "sent" | "rejected";
        readonly error: string | null;
      };
    }
  | {
      readonly type: "settings:loaded";
      readonly payload: SettingsLoadedPayload;
    }
  | {
      readonly type: "settings:saved";
      readonly payload: SettingsSnapshotPayload;
    }
  | {
      readonly type: "settings:save-error";
      readonly payload: SettingsSaveErrorPayload;
    }
  | {
      readonly type: "settings:localization-sync-status";
      readonly payload: SettingsLocalizationSyncStatusPayload;
    }
  | {
      readonly type: "settings:versions";
      readonly payload: SettingsVersionsPayload;
    }
  | {
      readonly type: "settings:user-glossary-file";
      readonly payload: SettingsUserGlossaryFilePayload;
    }
  | {
      readonly type: "settings:template-updates:result";
      readonly payload: SettingsTemplateUpdatesPayload;
    }
  | {
      readonly type: "settings:template-update:resolve:result";
      readonly payload: SettingsTemplateUpdateResolutionPayload;
    }
  | {
      readonly type: "settings:native-request-capture:result";
      readonly payload: SettingsNativeRequestCaptureResultPayload;
    }
  | {
      readonly type: "dialog:message";
      readonly payload: {
        readonly dialogId: string;
        readonly sessionId: string;
        readonly message: unknown;
      };
    }
  | { readonly type: string; readonly payload?: unknown };

export type CoreStatePayload = {
  readonly providers?: unknown;
};

export type ProjectUpdatePayload = {
  readonly projects: readonly WorkspaceProject[];
};

export type SettingsLoadedPayload = {
  readonly error?: string | null;
  readonly localizationRuntime?: LocalizationRuntimePayload | null;
  readonly settings?: unknown;
};
