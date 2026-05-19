import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const KIMI_CLAUDE_CODE_PROVIDER_ID = "kimiClaudeCode";
export const KIMI_CLAUDE_CODE_MODEL_ID = "kimi-for-coding";
export const KIMI_CLAUDE_CODE_DEFAULT_BASE_URL = "https://api.kimi.com/coding";

const KIMI_PROVIDER_SECTION = "providers.kimi-for-coding";
const DEFAULT_PROVIDER_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "kimi-claude-code",
  "home"
);
const DEFAULT_KIMI_CONFIG_PATH = path.join(homedir(), ".kimi", "config.toml");
const COMMENT_PATTERN = /#.*$/u;
const LINE_SPLIT_PATTERN = /\r?\n/u;
const SECTION_PATTERN = /^\[([^\]]+)\]$/u;
const API_KEY_PATTERN = /^api_key\s*=\s*(.+)$/u;

export type KimiClaudeCodeApiKeySource =
  | "codeai_env"
  | "kimi_config"
  | "kimi_env"
  | "missing";

export interface KimiClaudeCodeApiKeyResolution {
  readonly apiKey: string | null;
  readonly source: KimiClaudeCodeApiKeySource;
}

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

const unquoteTomlValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const extractKimiClaudeCodeApiKeyFromConfig = (
  configText: string
): string | null => {
  let activeSection: string | null = null;
  for (const rawLine of configText.split(LINE_SPLIT_PATTERN)) {
    const line = rawLine.replace(COMMENT_PATTERN, "").trim();
    if (!line) {
      continue;
    }

    const sectionMatch = line.match(SECTION_PATTERN);
    if (sectionMatch) {
      activeSection = sectionMatch[1]?.trim() ?? null;
      continue;
    }
    if (activeSection !== KIMI_PROVIDER_SECTION) {
      continue;
    }

    const keyMatch = line.match(API_KEY_PATTERN);
    if (!keyMatch?.[1]) {
      continue;
    }
    const apiKey = unquoteTomlValue(keyMatch[1]).trim();
    return apiKey ? apiKey : null;
  }
  return null;
};

export const resolveKimiClaudeCodeProviderHome = (
  env: NodeJS.ProcessEnv = process.env
): string =>
  trimOptional(env.CODEAI_KIMI_CLAUDE_CODE_HOME) ?? DEFAULT_PROVIDER_HOME;

export const resolveKimiClaudeCodeConfigPath = (
  env: NodeJS.ProcessEnv = process.env
): string => trimOptional(env.KIMI_CONFIG_PATH) ?? DEFAULT_KIMI_CONFIG_PATH;

export const resolveKimiClaudeCodeApiKey = async (
  options: KimiClaudeCodeRuntimeProbeProfileOptions = {}
): Promise<KimiClaudeCodeApiKeyResolution> => {
  const env = options.env ?? process.env;
  const codeaiApiKey = trimOptional(env.CODEAI_KIMI_CLAUDE_CODE_API_KEY);
  if (codeaiApiKey) {
    return { apiKey: codeaiApiKey, source: "codeai_env" };
  }

  const kimiApiKey = trimOptional(env.KIMI_API_KEY);
  if (kimiApiKey) {
    return { apiKey: kimiApiKey, source: "kimi_env" };
  }

  const configPath = options.configPath ?? resolveKimiClaudeCodeConfigPath(env);
  const configText = await readFile(configPath, "utf8").catch(() => "");
  const configApiKey = extractKimiClaudeCodeApiKeyFromConfig(configText);
  return configApiKey
    ? { apiKey: configApiKey, source: "kimi_config" }
    : { apiKey: null, source: "missing" };
};

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
