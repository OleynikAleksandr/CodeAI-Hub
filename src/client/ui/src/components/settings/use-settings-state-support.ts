import type { ClaudeModelAliasId } from "../../../../../types/claude-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import type {
  CodexModelId,
  CodexReasoningLevel,
  GeneralResponseMode,
  ProviderId,
  ProviderVersions,
  RawSettingsSnapshot,
  Settings,
} from "./settings-state-model";

export interface VersionsState {
  readonly data: ProviderVersions | null;
  readonly error?: string | null;
  readonly loading: boolean;
  readonly updatingTargets: readonly string[];
}

type IncomingMessage =
  | {
      readonly type: "settings:loaded";
      readonly settings: RawSettingsSnapshot;
    }
  | {
      readonly type: "settings:saved";
      readonly settings?: RawSettingsSnapshot;
    }
  | {
      readonly type: "settings:versions";
      readonly versions?: ProviderVersions;
      readonly error?: string;
    };

export const isIncomingMessage = (
  message: unknown
): message is IncomingMessage => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as { type?: unknown };
  return (
    candidate.type === "settings:loaded" ||
    candidate.type === "settings:saved" ||
    candidate.type === "settings:versions"
  );
};

export const clampRemainingPercentThreshold = (value: number): number =>
  Math.min(80, Math.max(5, Math.round(value)));

export const clampGeminiContextWindowTokenLimit = (value: number): number =>
  Math.min(1_000_000, Math.max(10_000, Math.round(value)));

export interface UseSettingsStateResult {
  readonly handleClaudeContinuityRemainingPercentThresholdChange: (
    remainingPercentThreshold: number
  ) => void;
  readonly handleClaudeDefaultModelChange: (
    modelId: ClaudeModelAliasId
  ) => void;
  readonly handleCodexContinuityRemainingPercentThresholdChange: (
    remainingPercentThreshold: number
  ) => void;
  readonly handleCodexDefaultModelChange: (modelId: CodexModelId) => void;
  readonly handleCodexReasoningChange: (
    modelId: CodexModelId,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly handleCodexThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly handleGeminiContextWindowTokenLimitChange: (
    contextWindowTokenLimit: number
  ) => void;
  readonly handleGeminiContinuityRemainingPercentThresholdChange: (
    remainingPercentThreshold: number
  ) => void;
  readonly handleGeminiDefaultModelChange: (modelId: GeminiModelId) => void;
  readonly handleGeminiThinkingChange: (
    modelId: GeminiModelId,
    level: GeminiThinkingLevel
  ) => void;
  readonly handleGeminiThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly handleProviderAutoUpdateChange: (
    provider: ProviderId,
    enabled: boolean
  ) => void;
  readonly handleReset: () => void;
  readonly handleResponsePolicyModeChange: (mode: GeneralResponseMode) => void;
  readonly handleSave: () => void;
  readonly handleStrictInstructionTextChange: (value: string) => void;
  readonly handleStrictSchemaTextChange: (value: string) => void;
  readonly handleThinkingSettingsChange: (
    enabled: boolean,
    maxTokens: number
  ) => void;
  readonly handleUpdateProvider: (
    provider: ProviderId,
    target: "cli" | "sdk" | "core"
  ) => void;
  readonly hasChanges: boolean;
  readonly resetting: boolean;
  readonly saving: boolean;
  readonly settings: Settings;
  readonly versions: VersionsState;
}
