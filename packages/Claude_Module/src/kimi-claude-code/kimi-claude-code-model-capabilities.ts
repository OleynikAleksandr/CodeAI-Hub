import {
  KIMI_CLAUDE_CODE_MODEL_ID,
  KIMI_CLAUDE_CODE_PROVIDER_ID,
} from "./kimi-claude-code-runtime-profile";

export type KimiClaudeCodeModelId = typeof KIMI_CLAUDE_CODE_MODEL_ID;

export type KimiClaudeCodeTelemetrySupport = "unavailable" | "unknown";

export interface KimiClaudeCodeModelCapabilities {
  readonly contextWindowTelemetry: KimiClaudeCodeTelemetrySupport;
  readonly defaultModel: boolean;
  readonly displayName: string;
  readonly modelId: KimiClaudeCodeModelId;
  readonly providerId: typeof KIMI_CLAUDE_CODE_PROVIDER_ID;
  readonly supportsReasoningControl: boolean;
  readonly supportsThinkingDisplaySummarized: boolean;
  readonly transport: "claude-code-compatible";
  readonly usageLimitTelemetry: KimiClaudeCodeTelemetrySupport;
}

export const KIMI_CLAUDE_CODE_MODEL_CAPABILITIES = [
  {
    contextWindowTelemetry: "unknown",
    defaultModel: true,
    displayName: "Kimi 2.6 via Claude Code",
    modelId: KIMI_CLAUDE_CODE_MODEL_ID,
    providerId: KIMI_CLAUDE_CODE_PROVIDER_ID,
    supportsReasoningControl: false,
    supportsThinkingDisplaySummarized: false,
    transport: "claude-code-compatible",
    usageLimitTelemetry: "unknown",
  },
] as const satisfies readonly KimiClaudeCodeModelCapabilities[];

const CAPABILITIES_BY_MODEL_ID = new Map<
  KimiClaudeCodeModelId,
  KimiClaudeCodeModelCapabilities
>(
  KIMI_CLAUDE_CODE_MODEL_CAPABILITIES.map((capabilities) => [
    capabilities.modelId,
    capabilities,
  ])
);

export const DEFAULT_KIMI_CLAUDE_CODE_MODEL_ID: KimiClaudeCodeModelId =
  KIMI_CLAUDE_CODE_MODEL_ID;

export const listKimiClaudeCodeModelCapabilities =
  (): readonly KimiClaudeCodeModelCapabilities[] =>
    KIMI_CLAUDE_CODE_MODEL_CAPABILITIES;

export const findKimiClaudeCodeModelCapabilities = (
  modelId: string | null | undefined
): KimiClaudeCodeModelCapabilities | null => {
  const normalizedModelId = modelId?.trim();
  if (!normalizedModelId) {
    return null;
  }
  return (
    CAPABILITIES_BY_MODEL_ID.get(normalizedModelId as KimiClaudeCodeModelId) ??
    null
  );
};

export const isKnownKimiClaudeCodeModelId = (
  modelId: string | null | undefined
): modelId is KimiClaudeCodeModelId =>
  findKimiClaudeCodeModelCapabilities(modelId) !== null;
