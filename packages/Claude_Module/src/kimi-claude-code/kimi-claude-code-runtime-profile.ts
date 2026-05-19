import { homedir } from "node:os";
import path from "node:path";
import {
  type KimiClaudeCodeApiKeySource,
  resolveKimiClaudeCodeApiKey,
  resolveKimiClaudeCodeConfigPath,
} from "../auth/kimi-claude-code-auth-profile";

export const KIMI_CLAUDE_CODE_PROVIDER_ID = "kimiClaudeCode";
export const KIMI_CLAUDE_CODE_MODEL_ID = "kimi-for-coding";
export const KIMI_CLAUDE_CODE_DEFAULT_BASE_URL = "https://api.kimi.com/coding";

const DEFAULT_PROVIDER_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "kimi-claude-code",
  "home"
);

export interface KimiClaudeCodeRuntimeProbeProfile {
  readonly anthropicBaseUrl: string;
  readonly configPath: string;
  readonly diagnostics: {
    readonly anthropicBaseUrl: string;
    readonly apiKeyAvailable: boolean;
    readonly apiKeySource: KimiClaudeCodeApiKeySource;
    readonly configPath: string;
    readonly home: string;
    readonly modelId: typeof KIMI_CLAUDE_CODE_MODEL_ID;
    readonly providerId: typeof KIMI_CLAUDE_CODE_PROVIDER_ID;
  };
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly modelId: typeof KIMI_CLAUDE_CODE_MODEL_ID;
  readonly providerId: typeof KIMI_CLAUDE_CODE_PROVIDER_ID;
}

export interface KimiClaudeCodeRuntimeProbeProfileOptions {
  readonly anthropicBaseUrl?: string;
  readonly configPath?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly home?: string;
}

const trimOptional = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const resolveKimiClaudeCodeProviderHome = (
  env: NodeJS.ProcessEnv = process.env
): string =>
  trimOptional(env.CODEAI_KIMI_CLAUDE_CODE_HOME) ?? DEFAULT_PROVIDER_HOME;

export const buildKimiClaudeCodeRuntimeProbeProfile = async (
  options: KimiClaudeCodeRuntimeProbeProfileOptions = {}
): Promise<KimiClaudeCodeRuntimeProbeProfile> => {
  const sourceEnv = options.env ?? process.env;
  const {
    ANTHROPIC_API_KEY: _anthropicApiKey,
    ANTHROPIC_BASE_URL: _anthropicBaseUrl,
    CLAUDE_CODE_OAUTH_TOKEN: _claudeCodeOauthToken,
    CLAUDE_SUBSCRIPTION_MODE: _claudeSubscriptionMode,
    CLAUDE_USE_CLI_AUTH: _claudeUseCliAuth,
    CLAUDECODE: _claudeCode,
    ...baseEnv
  } = sourceEnv;
  const home = options.home ?? resolveKimiClaudeCodeProviderHome(sourceEnv);
  const configPath =
    options.configPath ?? resolveKimiClaudeCodeConfigPath(sourceEnv);
  const anthropicBaseUrl =
    options.anthropicBaseUrl ??
    trimOptional(sourceEnv.KIMI_CLAUDE_CODE_ANTHROPIC_BASE_URL) ??
    KIMI_CLAUDE_CODE_DEFAULT_BASE_URL;
  const apiKey = await resolveKimiClaudeCodeApiKey({
    configPath,
    env: sourceEnv,
  });

  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    ANTHROPIC_BASE_URL: anthropicBaseUrl,
    HOME: home,
  };
  if (apiKey.apiKey) {
    env.ANTHROPIC_API_KEY = apiKey.apiKey;
  }

  return {
    anthropicBaseUrl,
    configPath,
    diagnostics: {
      anthropicBaseUrl,
      apiKeyAvailable: Boolean(apiKey.apiKey),
      apiKeySource: apiKey.source,
      configPath,
      home,
      modelId: KIMI_CLAUDE_CODE_MODEL_ID,
      providerId: KIMI_CLAUDE_CODE_PROVIDER_ID,
    },
    env,
    home,
    modelId: KIMI_CLAUDE_CODE_MODEL_ID,
    providerId: KIMI_CLAUDE_CODE_PROVIDER_ID,
  };
};

export {
  extractKimiClaudeCodeApiKeyFromConfig,
  type KimiClaudeCodeApiKeyResolution,
  type KimiClaudeCodeApiKeySource,
  resolveKimiClaudeCodeApiKey,
  resolveKimiClaudeCodeConfigPath,
} from "../auth/kimi-claude-code-auth-profile";
