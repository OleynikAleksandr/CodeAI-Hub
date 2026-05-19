import { GlmClaudeCodeProviderAdapter as GlmClaudeCodeProviderAdapterImpl } from "./glm-claude-code/glm-claude-code-provider-adapter";
import { ClaudeProviderAdapter as ClaudeProviderAdapterImpl } from "./provider/claude-provider-adapter";

export {
  type KimiClaudeCodeProbeFailureCategory,
  type KimiClaudeCodeProbeStatus,
  type KimiClaudeCodeRuntimeProbeResult,
  KimiClaudeCodeRuntimeProbeRunner,
  type KimiClaudeCodeRuntimeProbeRunnerOptions,
} from "./diagnostics/kimi-claude-code-runtime-probe-runner";
export type {
  GlmClaudeCodeProviderAdapterOptions,
  GlmClaudeCodeSessionListener,
  GlmClaudeCodeUsageLimitsFacadeBridge,
  GlmClaudeCodeWorkspaceOptions,
} from "./glm-claude-code/glm-claude-code-provider-adapter";
export {
  buildGlmClaudeCodeRuntimeProbeProfile,
  buildGlmClaudeCodeRuntimeProfile,
  extractGlmClaudeCodeApiKeyFromConfig,
  GLM_CLAUDE_CODE_DEFAULT_BASE_URL,
  GLM_CLAUDE_CODE_DEFAULT_PROJECT_SLUG,
  GLM_CLAUDE_CODE_MODEL_ID,
  GLM_CLAUDE_CODE_PROVIDER_ID,
  GLM_CLAUDE_CODE_SESSION_TITLE,
  type GlmClaudeCodeApiKeyResolution,
  type GlmClaudeCodeApiKeySource,
  type GlmClaudeCodeRuntimeProbeProfile,
  type GlmClaudeCodeRuntimeProbeProfileOptions,
  type GlmClaudeCodeRuntimeProfileOptions,
  resolveGlmClaudeCodeApiKey,
  resolveGlmClaudeCodeConfigPath,
  resolveGlmClaudeCodeProjectPath,
  resolveGlmClaudeCodeProviderHome,
} from "./glm-claude-code/glm-claude-code-runtime-profile";
export {
  GlmClaudeCodeSDKAuthManager,
  type GlmClaudeCodeSDKAuthManagerOptions,
} from "./glm-claude-code/glm-claude-code-sdk-auth-manager";
export {
  CLAUDE_MODEL_CAPABILITIES,
  type ClaudeModelAliasId,
  type ClaudeModelCapabilities,
  type ClaudeThinkingEffort,
  DEFAULT_KIMI_CLAUDE_CODE_MODEL_ID,
  findClaudeModelCapabilities,
  findKimiClaudeCodeModelCapabilities,
  isClaudeModelAliasId,
  isKnownKimiClaudeCodeModelId,
  KIMI_CLAUDE_CODE_MODEL_CAPABILITIES,
  type KimiClaudeCodeModelCapabilities,
  type KimiClaudeCodeModelId,
  type KimiClaudeCodeTelemetrySupport,
  listKimiClaudeCodeModelCapabilities,
} from "./types";

import type {
  ClaudeInstallerPaths as ClaudeInstallerPathsType,
  ClaudeModuleOptions as ClaudeModuleOptionsType,
  ClaudeUsageLimitsFacadeBridge as ClaudeUsageLimitsFacadeBridgeType,
  ClaudeUsageLimitsStreamPayload as ClaudeUsageLimitsStreamPayloadType,
  ClaudeWorkspaceOptions as ClaudeWorkspaceOptionsType,
  ModuleReporter as ModuleReporterType,
} from "./types";

const ClaudeProviderAdapter = ClaudeProviderAdapterImpl;
const GlmClaudeCodeProviderAdapter = GlmClaudeCodeProviderAdapterImpl;
type ClaudeInstallerPaths = ClaudeInstallerPathsType;
type ClaudeModuleOptions = ClaudeModuleOptionsType;
type ClaudeUsageLimitsFacadeBridge = ClaudeUsageLimitsFacadeBridgeType;
type ClaudeUsageLimitsStreamPayload = ClaudeUsageLimitsStreamPayloadType;
type ClaudeWorkspaceOptions = ClaudeWorkspaceOptionsType;
type ModuleReporter = ModuleReporterType;

export {
  CLAUDE_HAIKU_TRANSLATION_ENGINE_ID,
  CLAUDE_HAIKU_TRANSLATION_MODEL_ID,
  CLAUDE_HAIKU_TRANSLATION_PROJECT_SLUG,
  CLAUDE_HAIKU_TRANSLATION_PROVIDER_ID,
  type ClaudeHaikuTranslationQueryFunction,
  ClaudeHaikuTranslationService,
  type ClaudeHaikuTranslationServiceOptions,
  type ClaudeHaikuTranslationServiceResult,
} from "./translation/claude-haiku-translation-service";
export { buildClaudeHaikuTranslatorInstruction } from "./translation/claude-haiku-translator-instruction";
export type {
  ClaudeInstallerPaths,
  ClaudeModuleOptions,
  ClaudeUsageLimitsFacadeBridge,
  ClaudeUsageLimitsStreamPayload,
  ClaudeWorkspaceOptions,
  ModuleReporter,
};
export { ClaudeProviderAdapter, GlmClaudeCodeProviderAdapter };
