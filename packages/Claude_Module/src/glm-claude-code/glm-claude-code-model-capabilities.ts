import {
  GLM_CLAUDE_CODE_MODEL_ID,
  GLM_CLAUDE_CODE_PROVIDER_ID,
} from "./glm-claude-code-runtime-profile";

export type GlmClaudeCodeModelId = typeof GLM_CLAUDE_CODE_MODEL_ID;

export type GlmClaudeCodeTelemetrySupport = "unavailable" | "unknown";

export interface GlmClaudeCodeModelCapabilities {
  readonly contextWindowTelemetry: GlmClaudeCodeTelemetrySupport;
  readonly defaultModel: boolean;
  readonly displayName: string;
  readonly modelId: GlmClaudeCodeModelId;
  readonly providerId: typeof GLM_CLAUDE_CODE_PROVIDER_ID;
  readonly supportsReasoningControl: boolean;
  readonly supportsThinkingDisplaySummarized: boolean;
  readonly transport: "claude-code-compatible";
  readonly usageLimitTelemetry: GlmClaudeCodeTelemetrySupport;
}

export const GLM_CLAUDE_CODE_MODEL_CAPABILITIES = [
  {
    contextWindowTelemetry: "unknown",
    defaultModel: true,
    displayName: "GLM 5.2 via Claude Code",
    modelId: GLM_CLAUDE_CODE_MODEL_ID,
    providerId: GLM_CLAUDE_CODE_PROVIDER_ID,
    supportsReasoningControl: false,
    supportsThinkingDisplaySummarized: false,
    transport: "claude-code-compatible",
    usageLimitTelemetry: "unknown",
  },
] as const satisfies readonly GlmClaudeCodeModelCapabilities[];

const CAPABILITIES_BY_MODEL_ID = new Map<
  GlmClaudeCodeModelId,
  GlmClaudeCodeModelCapabilities
>(
  GLM_CLAUDE_CODE_MODEL_CAPABILITIES.map((capabilities) => [
    capabilities.modelId,
    capabilities,
  ])
);

export const DEFAULT_GLM_CLAUDE_CODE_MODEL_ID: GlmClaudeCodeModelId =
  GLM_CLAUDE_CODE_MODEL_ID;

export const listGlmClaudeCodeModelCapabilities =
  (): readonly GlmClaudeCodeModelCapabilities[] =>
    GLM_CLAUDE_CODE_MODEL_CAPABILITIES;

export const findGlmClaudeCodeModelCapabilities = (
  modelId: string | null | undefined
): GlmClaudeCodeModelCapabilities | null => {
  const normalizedModelId = modelId?.trim();
  if (!normalizedModelId) {
    return null;
  }
  return (
    CAPABILITIES_BY_MODEL_ID.get(normalizedModelId as GlmClaudeCodeModelId) ??
    null
  );
};

export const isKnownGlmClaudeCodeModelId = (
  modelId: string | null | undefined
): modelId is GlmClaudeCodeModelId =>
  findGlmClaudeCodeModelCapabilities(modelId) !== null;
