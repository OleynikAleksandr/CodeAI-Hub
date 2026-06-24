import type { ClaudeModuleOptions } from "@codeai-hub/claude-module";
import type { CodexModuleOptions } from "@codeai-hub/codex-app-server-module";
import type { GlmModuleOptions } from "@codeai-hub/glm-module";
import type { GlmOpenCodeModuleOptions } from "@codeai-hub/glm-opencode-module";
import type {
  NativeRequestCaptureAppliedInputEnvelope,
  NativeRequestCaptureMode,
} from "../provider-network-capture/native-request-capture-types";

export interface Provider {
  readonly capabilities?: ProviderCapabilities;
  readonly description: string;
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "inactive" | "degraded";
  readonly statusMessage?: string;
}

export interface ProviderCapabilities {
  readonly modelSync: ProviderModelSyncCapabilities;
  readonly requiresPostStopResume: boolean;
  readonly supportsImmediateBinding: boolean;
}

export type ProviderAppliedConfigIdentityKey = "effective_model_id";
export type ProviderRuntimeModelSelectionKey = "base_model_id" | "model_id";

export interface ProviderModelSyncCapabilities {
  readonly acceptsAppliedTurnConfig: boolean;
  readonly appliedConfigIdentityKey: ProviderAppliedConfigIdentityKey;
  readonly runtimeModelSelectionKey: ProviderRuntimeModelSelectionKey;
  readonly syncsLabelFromAppliedConfig: boolean;
}

export interface ProviderNativeRequestCaptureAppliedTurnConfig {
  readonly baseModelId?: string;
  readonly effectiveModelId?: string;
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
  readonly translationEngineId?: string;
}

export type ProviderNativeRequestCaptureInvocationPurpose =
  | "translation"
  | "workflow-agent";

export type ProviderNativeRequestCaptureAppliedInputEnvelope =
  NativeRequestCaptureAppliedInputEnvelope;

export interface ProviderNativeRequestCaptureOptions {
  readonly appliedTurnConfig?: ProviderNativeRequestCaptureAppliedTurnConfig | null;
  readonly captureId: string;
  readonly captureMode?: NativeRequestCaptureMode;
  readonly certificateEnv: Readonly<Record<string, string>>;
  readonly certificatePath: string;
  readonly invocationPurpose?: ProviderNativeRequestCaptureInvocationPurpose;
  readonly probePrompt: string;
  readonly proxyUrl: string;
  readonly recordAppliedInputEnvelope?: (
    envelope: ProviderNativeRequestCaptureAppliedInputEnvelope
  ) => Promise<void> | void;
  readonly recordDiagnosticContext?: (record: {
    readonly kind: string;
    readonly payload: unknown;
  }) => Promise<void> | void;
  readonly scenarioId?: string | null;
  readonly selectedModelId?: string | null;
  readonly workflowPrompt?: string | null;
  readonly workspacePath: string;
}

export interface ProviderAdapter {
  captureNativeRequest?(
    options: ProviderNativeRequestCaptureOptions
  ): Promise<void>;
  closeSession(sessionId: string): Promise<void>;
  createSession(workspacePath?: string): Promise<string>;
  initialize(): Promise<void>;
  refreshUsageLimits?(params: {
    readonly broadcast: (event: unknown) => void;
    readonly providerSessionId: string;
    readonly runtimeSessionId: string;
    readonly workspacePath: string;
  }): Promise<void> | void;
  resumeSession?(sessionId: string, workspacePath?: string): Promise<string>;
  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void>;
  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void;
}

export type ProviderDescriptor = Provider & {
  readonly adapter?: ProviderAdapter;
};

export type MutableProviderDescriptor = {
  -readonly [Key in keyof ProviderDescriptor]: ProviderDescriptor[Key];
};

export type ClaudeAdapterCtor = new (
  options: ClaudeModuleOptions
) => ProviderAdapter;

export type CodexAdapterCtor = new (
  options: CodexModuleOptions
) => ProviderAdapter;

export type GlmOpenCodeAdapterCtor = new (
  options: GlmOpenCodeModuleOptions
) => ProviderAdapter;

export type GlmAdapterCtor = new (options: GlmModuleOptions) => ProviderAdapter;
