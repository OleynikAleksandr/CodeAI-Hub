import type {
  LocalizationEngineLanguageCatalog,
  LocalizationRuntimePayload,
} from "@codeai-hub/localization";
import type { NativeRequestCaptureCommandResult } from "../provider-network-capture/native-request-capture-facade";
import type { NativeRequestCaptureProviderId } from "../provider-network-capture/native-request-capture-types";
import type { ProviderRegistry } from "../provider-registry";
import type { WorkspaceProject } from "../services/project-registry/types";
import type { RuntimeStatusEvent } from "../status/runtime-status-reporter";
import type {
  PendingTemplateUpdate,
  TemplateUpdateResolutionRequest,
  TemplateUpdateResolutionResult,
} from "../templates/template-update-resolution-service";
import type { CommandErrorPayload } from "../workspace-runtime/workspace-wire-types";
import type { SessionSpeechStateEvent } from "./handlers/session-speech-request-handler";
import type {
  WorkbenchArtifactReadPayload,
  WorkbenchIndexFile,
  WorkbenchSelectionFile,
  WorkbenchStateKind,
} from "./handlers/workbench-state-types";
import type {
  SerializedSession,
  SessionBridgeEvent,
  SessionIncomingMessage,
  SessionMessageTranslationPayload,
} from "./session-stream-contracts";
import type {
  WorkspaceBridgeEvent,
  WorkspaceIncomingMessage,
} from "./workspace-stream-contracts";

export type {
  DialogSwitchInitiator,
  DialogSwitchMode,
  DialogSwitchOfferPayload,
  DialogSwitchProgressPayload,
  DialogSwitchProgressPhase,
  DialogSwitchResultPayload,
  DialogSwitchTarget,
  ProviderFailureClass,
  SerializedSession,
  SerializedSessionModelBinding,
  SessionBridgeEvent,
  SessionIncomingMessage,
  SessionMessageTranslationPayload,
  SessionModelUpdatePayload,
  TurnFailedPayload,
  TurnStateStreamData,
} from "./session-stream-contracts";
export {
  serializeSession,
  serializeSessionModelBinding,
} from "./session-stream-contracts";
export type {
  WorkspaceBridgeEvent,
  WorkspaceIncomingMessage,
  WorkspaceScopeAckPayload,
  WorkspaceScopeSetPayload,
  WorkspaceScopeSyncReason,
} from "./workspace-stream-contracts";
export interface AppliedProviderTurnConfig {
  readonly artifactsForTheUserLanguage?: string;
  readonly baseModelId?: string;
  readonly effectiveModelId?: string;
  /**
   * Deprecated legacy alias for {@link reasoningLanguage}. Kept while
   * provider adapters migrate to the dedicated reasoning field; both carry
   * the same resolved value sourced from the reasoning translation policy.
   */
  readonly messagesForTheUserLanguage?: string;
  readonly modelId?: string;
  readonly providerId: string;
  readonly reasoningEffort?: string;
  readonly reasoningEngineId?: string;
  readonly reasoningLanguage?: string;
  readonly source: "session_binding" | "settings_snapshot" | "switch_request";
  readonly thinkingDisplaySyncEnabled?: boolean;
  readonly thinkingEnabled?: boolean;
  readonly thinkingLevel?: string;
  /**
   * Deprecated legacy alias for {@link reasoningEngineId}. Kept while
   * provider adapters migrate to the dedicated reasoning field; both carry
   * the same resolved value sourced from the reasoning translation policy.
   */
  readonly translationEngineId?: string;
}

const APPLIED_PROVIDER_TURN_CONFIG_KEY = "__codeaiAppliedTurnConfig";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const withAppliedProviderTurnConfig = (
  turnOptions: Record<string, unknown> | undefined,
  config: AppliedProviderTurnConfig | null
): Record<string, unknown> | undefined => {
  if (!config) {
    return turnOptions;
  }

  return {
    ...(turnOptions ?? {}),
    [APPLIED_PROVIDER_TURN_CONFIG_KEY]: config,
  };
};
export const readAppliedProviderTurnConfig = (
  turnOptions?: Record<string, unknown>
): AppliedProviderTurnConfig | null => {
  const candidate = turnOptions?.[APPLIED_PROVIDER_TURN_CONFIG_KEY];
  if (!isRecord(candidate) || typeof candidate.providerId !== "string") {
    return null;
  }

  const thinkingDisplaySyncEnabled =
    typeof candidate.thinkingDisplaySyncEnabled === "boolean"
      ? candidate.thinkingDisplaySyncEnabled
      : undefined;

  return {
    providerId: candidate.providerId,
    source:
      candidate.source === "switch_request" ||
      candidate.source === "session_binding"
        ? candidate.source
        : "settings_snapshot",
    baseModelId:
      typeof candidate.baseModelId === "string"
        ? candidate.baseModelId
        : undefined,
    artifactsForTheUserLanguage:
      typeof candidate.artifactsForTheUserLanguage === "string"
        ? candidate.artifactsForTheUserLanguage
        : undefined,
    effectiveModelId:
      typeof candidate.effectiveModelId === "string"
        ? candidate.effectiveModelId
        : undefined,
    messagesForTheUserLanguage:
      typeof candidate.messagesForTheUserLanguage === "string"
        ? candidate.messagesForTheUserLanguage
        : undefined,
    modelId:
      typeof candidate.modelId === "string" ? candidate.modelId : undefined,
    reasoningEffort:
      typeof candidate.reasoningEffort === "string"
        ? candidate.reasoningEffort
        : undefined,
    reasoningEngineId:
      typeof candidate.reasoningEngineId === "string"
        ? candidate.reasoningEngineId
        : undefined,
    reasoningLanguage:
      typeof candidate.reasoningLanguage === "string"
        ? candidate.reasoningLanguage
        : undefined,
    translationEngineId:
      typeof candidate.translationEngineId === "string"
        ? candidate.translationEngineId
        : undefined,
    thinkingEnabled:
      typeof candidate.thinkingEnabled === "boolean"
        ? candidate.thinkingEnabled
        : undefined,
    thinkingLevel:
      typeof candidate.thinkingLevel === "string"
        ? candidate.thinkingLevel
        : undefined,
    ...(thinkingDisplaySyncEnabled === undefined
      ? {}
      : { thinkingDisplaySyncEnabled }),
  };
};

export const shouldBroadcastAppliedProviderModelUpdate = (options: {
  readonly syncsLabelFromAppliedConfig: boolean;
  readonly turnConfig: AppliedProviderTurnConfig | null;
}): options is {
  readonly syncsLabelFromAppliedConfig: true;
  readonly turnConfig: AppliedProviderTurnConfig & { readonly modelId: string };
} =>
  options.syncsLabelFromAppliedConfig &&
  typeof options.turnConfig?.modelId === "string" &&
  options.turnConfig.modelId.trim().length > 0 &&
  options.turnConfig.source === "settings_snapshot";

export interface CoreStatePayload {
  readonly providers: ReturnType<ProviderRegistry["listProviders"]>;
  readonly sessions: readonly SerializedSession[];
}

export interface TechnicalStageRewriteBoundaryPayload {
  readonly active: boolean;
  readonly blockers: readonly string[];
  readonly readOnlyStages: readonly string[];
}

interface SettingsLoadedPayload {
  readonly availableEngines?: readonly LocalizationEngineLanguageCatalog[];
  readonly error: string | null;
  readonly localizationRuntime: LocalizationRuntimePayload | null;
  readonly settings: Record<string, unknown> | null;
}

type WorkbenchStateFile = WorkbenchIndexFile | WorkbenchSelectionFile;

type CoreBridgeEvent =
  | { readonly type: "core:state"; readonly payload: CoreStatePayload }
  | {
      readonly type: "settings:loaded";
      readonly payload: SettingsLoadedPayload;
    }
  | {
      readonly type: "settings:saved";
      readonly payload: Omit<SettingsLoadedPayload, "error">;
    }
  | {
      readonly type: "settings:save-error";
      readonly payload: { readonly error: string };
    }
  | {
      readonly type: "settings:localization-sync-status";
      readonly payload: {
        readonly busy: boolean;
        readonly message: string | null;
      };
    }
  | {
      readonly type: "settings:versions";
      readonly payload: {
        readonly error?: string | null;
        readonly versions?: unknown;
      };
    }
  | {
      readonly type: "settings:user-glossary-file";
      readonly payload: {
        readonly error?: string | null;
        readonly path: string | null;
      };
    }
  | {
      readonly type: "settings:template-updates:result";
      readonly payload: {
        readonly error?: string | null;
        readonly updates: readonly PendingTemplateUpdate[];
      };
    }
  | {
      readonly type: "settings:template-update:resolve:result";
      readonly payload: TemplateUpdateResolutionResult;
    }
  | {
      readonly type: "settings:native-request-capture:result";
      readonly payload: NativeRequestCaptureCommandResult;
    }
  | {
      readonly type: "workbench:state:loaded";
      readonly payload: {
        readonly error: string | null;
        readonly kind: WorkbenchStateKind;
        readonly payload: WorkbenchStateFile | null;
      };
    }
  | {
      readonly type: "workbench:state:saved";
      readonly payload: {
        readonly kind: WorkbenchStateKind;
        readonly ok: true;
      };
    }
  | {
      readonly type: "workbench:state:save-error";
      readonly payload: {
        readonly error: string;
        readonly kind: WorkbenchStateKind;
      };
    }
  | {
      readonly type: "workbench:artifact:loaded";
      readonly payload: {
        readonly jsonlPath: string;
        readonly records: readonly unknown[];
      };
    }
  | {
      readonly type: "workbench:artifact:error";
      readonly payload: {
        readonly error: string;
        readonly jsonlPath: string;
      };
    }
  | { readonly type: "core:notification"; readonly payload: unknown }
  | {
      readonly type: "core:loading-status";
      readonly payload: RuntimeStatusEvent;
    }
  | {
      readonly type: "command:error";
      readonly payload: CommandErrorPayload;
    };

type DialogBridgeEvent =
  | {
      readonly type: "dialog:message";
      readonly payload: {
        readonly dialogId: string;
        readonly sessionId: string;
        readonly message: unknown;
      };
    }
  | {
      readonly type: "dialog:message_translation";
      readonly payload: {
        readonly dialogId: string;
        readonly sessionId: string;
        readonly translation: SessionMessageTranslationPayload;
      };
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
    };

interface ProjectBridgeEvent {
  readonly payload: { readonly projects: readonly WorkspaceProject[] };
  readonly type: "projects:update";
}

export type BridgeEvent =
  | CoreBridgeEvent
  | DialogBridgeEvent
  | ProjectBridgeEvent
  | SessionSpeechStateEvent
  | SessionBridgeEvent
  | WorkspaceBridgeEvent;

type CoreIncomingMessage =
  | { readonly type: "settings:load" }
  | {
      readonly type: "development-tree:node-start";
      readonly payload: {
        readonly modelId?: string | null;
        readonly providerId?: string | null;
        readonly reasoning?: string | null;
        readonly workflowPath?: string | null;
        readonly workspacePath?: string | null;
        readonly workspaceSlug?: string | null;
      };
    }
  | { readonly type: "settings:versions" }
  | {
      readonly type: "settings:save";
      readonly payload: { readonly settings: unknown };
    }
  | { readonly type: "settings:reset" }
  | {
      readonly type: "settings:native-request-capture";
      readonly payload: {
        readonly captureMode?: "managed" | "vanilla" | null;
        readonly modelId?: string | null;
        readonly providerId: NativeRequestCaptureProviderId;
        readonly reasoning?: string | null;
        readonly scenarioId?: string | null;
        readonly scenarioInputPath?: string | null;
        readonly scenarioLabel?: string | null;
        readonly scenarioPrompt?: string | null;
        readonly scenarioTargetPath?: string | null;
        readonly workspacePath?: string | null;
      };
    }
  | { readonly type: "session:speech:speak-message"; readonly payload: unknown }
  | { readonly type: "session:speech:stop"; readonly payload: unknown }
  | {
      readonly type: "settings:update-provider";
      readonly payload: {
        readonly provider: "claude" | "codex";
        readonly target: "cli" | "sdk";
      };
    }
  | { readonly type: "settings:template-updates" }
  | {
      readonly type: "settings:template-update:resolve";
      readonly payload: TemplateUpdateResolutionRequest;
    }
  | { readonly type: "settings:open-user-glossary-file" }
  | {
      readonly type: "workbench:state:load";
      readonly payload: { readonly kind: WorkbenchStateKind };
    }
  | {
      readonly type: "workbench:state:save";
      readonly payload: {
        readonly kind: WorkbenchStateKind;
        readonly state: WorkbenchStateFile;
      };
    }
  | {
      readonly type: "workbench:artifact:read";
      readonly payload: WorkbenchArtifactReadPayload;
    };

interface ProjectManagerDiagnosticLogIncomingMessage {
  readonly payload: {
    readonly channel: string;
    readonly event: string;
    readonly context?: Record<string, unknown>;
  };
  readonly type: "pm:diag:log";
}

interface DialogScopedIncomingPayload {
  readonly requestId: string;
  readonly workspacePath?: string;
  readonly workspaceSlug: string;
}

type DialogIncomingMessage =
  | {
      readonly type: "dialog:list";
      readonly payload: DialogScopedIncomingPayload;
    }
  | {
      readonly type: "dialog:open";
      readonly payload: DialogScopedIncomingPayload & {
        readonly dialogId: string;
      };
    }
  | {
      readonly type: "dialog:history";
      readonly payload: DialogScopedIncomingPayload & {
        readonly dialogId: string;
        readonly cursor?: number;
      };
    }
  | {
      readonly type: "dialog:send";
      readonly payload: DialogScopedIncomingPayload & {
        readonly dialogId: string;
        readonly content: string;
        readonly turnOptions?: Record<string, unknown>;
      };
    };

type ProjectIncomingMessage =
  | {
      readonly type: "projects:list";
    }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    };

export type IncomingMessage =
  | CoreIncomingMessage
  | ProjectManagerDiagnosticLogIncomingMessage
  | DialogIncomingMessage
  | ProjectIncomingMessage
  | SessionIncomingMessage
  | WorkspaceIncomingMessage;
