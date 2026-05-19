import { ClaudeProviderAdapter as ClaudeProviderAdapterImpl } from "./provider/claude-provider-adapter";

export {
  type KimiClaudeCodeProbeFailureCategory,
  type KimiClaudeCodeProbeStatus,
  type KimiClaudeCodeRuntimeProbeResult,
  KimiClaudeCodeRuntimeProbeRunner,
  type KimiClaudeCodeRuntimeProbeRunnerOptions,
} from "./diagnostics/kimi-claude-code-runtime-probe-runner";
export {
  buildKimiClaudeCodeRuntimeProbeProfile,
  extractKimiClaudeCodeApiKeyFromConfig,
  KIMI_CLAUDE_CODE_DEFAULT_BASE_URL,
  KIMI_CLAUDE_CODE_MODEL_ID,
  KIMI_CLAUDE_CODE_PROVIDER_ID,
  type KimiClaudeCodeApiKeyResolution,
  type KimiClaudeCodeApiKeySource,
  type KimiClaudeCodeRuntimeProbeProfile,
  type KimiClaudeCodeRuntimeProbeProfileOptions,
  resolveKimiClaudeCodeApiKey,
  resolveKimiClaudeCodeConfigPath,
  resolveKimiClaudeCodeProviderHome,
} from "./kimi-claude-code/kimi-claude-code-runtime-profile";
export {
  CLAUDE_MODEL_CAPABILITIES,
  type ClaudeModelAliasId,
  type ClaudeModelCapabilities,
  type ClaudeThinkingEffort,
  findClaudeModelCapabilities,
  isClaudeModelAliasId,
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
export { ClaudeProviderAdapter };
