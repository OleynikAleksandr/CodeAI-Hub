import { homedir } from "node:os";
import path from "node:path";
import {
  type GlmClaudeCodeApiKeySource,
  resolveGlmClaudeCodeApiKey,
  resolveGlmClaudeCodeConfigPath,
} from "../auth/glm-claude-code-auth-profile";
import type { ClaudeCodeRuntimeProfile } from "../sdk/claude-runtime-profile";
import { CODEAI_CLAUDE_WORKFLOW_TOOLS } from "../sdk/claude-workflow-system-prompt";

export const GLM_CLAUDE_CODE_PROVIDER_ID = "glmClaudeCode";
export const GLM_CLAUDE_CODE_MODEL_ID = "glm-5.1";
const GLM_CLAUDE_CODE_DEFAULT_SONNET_MODEL_ID = "glm-5-turbo";
const GLM_CLAUDE_CODE_DEFAULT_HAIKU_MODEL_ID = "glm-4.5-air";
export const GLM_CLAUDE_CODE_DEFAULT_BASE_URL =
  "https://api.z.ai/api/anthropic";
export const GLM_CLAUDE_CODE_DEFAULT_PROJECT_SLUG = "glm-claude-code";
export const GLM_CLAUDE_CODE_SESSION_TITLE = "CodeAI GLM Claude Code";
const GLM_CLAUDE_CODE_DEFAULT_TIMEOUT_MS = 3_000_000;

const DEFAULT_PROVIDER_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "glm-claude-code",
  "home"
);

export interface GlmClaudeCodeRuntimeProbeProfile {
  readonly anthropicBaseUrl: string;
  readonly configPath: string;
  readonly diagnostics: {
    readonly anthropicBaseUrl: string;
    readonly apiKeyAvailable: boolean;
    readonly apiKeySource: GlmClaudeCodeApiKeySource;
    readonly configPath: string;
    readonly haikuModelId: string;
    readonly home: string;
    readonly modelId: typeof GLM_CLAUDE_CODE_MODEL_ID;
    readonly providerId: typeof GLM_CLAUDE_CODE_PROVIDER_ID;
    readonly sonnetModelId: string;
    readonly timeoutMs: number;
  };
  readonly env: NodeJS.ProcessEnv;
  readonly home: string;
  readonly modelId: typeof GLM_CLAUDE_CODE_MODEL_ID;
  readonly providerId: typeof GLM_CLAUDE_CODE_PROVIDER_ID;
}

export interface GlmClaudeCodeRuntimeProbeProfileOptions {
  readonly anthropicBaseUrl?: string;
  readonly configPath?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly home?: string;
}

export interface GlmClaudeCodeRuntimeProfileOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly home?: string;
  readonly projectSlug?: string;
  readonly sessionTitle?: string;
}

const trimOptional = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const resolveGlmClaudeCodeProviderHome = (
  env: NodeJS.ProcessEnv = process.env
): string =>
  trimOptional(env.CODEAI_GLM_CLAUDE_CODE_HOME) ?? DEFAULT_PROVIDER_HOME;

export const resolveGlmClaudeCodeProjectPath = (
  options: GlmClaudeCodeRuntimeProfileOptions = {}
): string =>
  path.join(
    options.home ??
      resolveGlmClaudeCodeProviderHome(options.env ?? process.env),
    ".claude",
    "projects",
    options.projectSlug ?? GLM_CLAUDE_CODE_DEFAULT_PROJECT_SLUG
  );

export const buildGlmClaudeCodeRuntimeProfile = (
  options: GlmClaudeCodeRuntimeProfileOptions = {}
): ClaudeCodeRuntimeProfile => {
  const home =
    options.home ??
    resolveGlmClaudeCodeProviderHome(options.env ?? process.env);
  return {
    authMode: "anthropic-api-key",
    id: "glmClaudeCode",
    projectPath: resolveGlmClaudeCodeProjectPath({
      env: options.env,
      home,
      projectSlug: options.projectSlug,
    }),
    providerHome: home,
    sessionTitle: options.sessionTitle ?? GLM_CLAUDE_CODE_SESSION_TITLE,
    settingSources: [],
    toolNames: [...CODEAI_CLAUDE_WORKFLOW_TOOLS],
  };
};

export const buildGlmClaudeCodeRuntimeProbeProfile = async (
  options: GlmClaudeCodeRuntimeProbeProfileOptions = {}
): Promise<GlmClaudeCodeRuntimeProbeProfile> => {
  const sourceEnv = options.env ?? process.env;
  const {
    ANTHROPIC_API_KEY: _anthropicApiKey,
    ANTHROPIC_AUTH_TOKEN: _anthropicAuthToken,
    ANTHROPIC_BASE_URL: _anthropicBaseUrl,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: _anthropicDefaultHaikuModel,
    ANTHROPIC_DEFAULT_OPUS_MODEL: _anthropicDefaultOpusModel,
    ANTHROPIC_DEFAULT_SONNET_MODEL: _anthropicDefaultSonnetModel,
    CLAUDE_CODE_OAUTH_TOKEN: _claudeCodeOauthToken,
    CLAUDE_SUBSCRIPTION_MODE: _claudeSubscriptionMode,
    CLAUDE_USE_CLI_AUTH: _claudeUseCliAuth,
    CLAUDECODE: _claudeCode,
    ...baseEnv
  } = sourceEnv;
  const home = options.home ?? resolveGlmClaudeCodeProviderHome(sourceEnv);
  const configPath =
    options.configPath ?? resolveGlmClaudeCodeConfigPath(sourceEnv);
  const apiKey = await resolveGlmClaudeCodeApiKey({
    configPath,
    env: sourceEnv,
  });
  const anthropicBaseUrl =
    options.anthropicBaseUrl ??
    trimOptional(sourceEnv.GLM_CLAUDE_CODE_ANTHROPIC_BASE_URL) ??
    apiKey.config.baseUrl ??
    GLM_CLAUDE_CODE_DEFAULT_BASE_URL;
  const opusModelId = apiKey.config.opusModel ?? GLM_CLAUDE_CODE_MODEL_ID;
  const sonnetModelId =
    apiKey.config.sonnetModel ?? GLM_CLAUDE_CODE_DEFAULT_SONNET_MODEL_ID;
  const haikuModelId =
    apiKey.config.haikuModel ?? GLM_CLAUDE_CODE_DEFAULT_HAIKU_MODEL_ID;
  const timeoutMs =
    apiKey.config.timeoutMs ?? GLM_CLAUDE_CODE_DEFAULT_TIMEOUT_MS;

  const env: NodeJS.ProcessEnv = {
    ...baseEnv,
    ANTHROPIC_BASE_URL: anthropicBaseUrl,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: haikuModelId,
    ANTHROPIC_DEFAULT_OPUS_MODEL: opusModelId,
    ANTHROPIC_DEFAULT_SONNET_MODEL: sonnetModelId,
    API_TIMEOUT_MS: String(timeoutMs),
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    HOME: home,
  };
  if (apiKey.apiKey) {
    env.ANTHROPIC_API_KEY = apiKey.apiKey;
    env.ANTHROPIC_AUTH_TOKEN = apiKey.apiKey;
  }

  return {
    anthropicBaseUrl,
    configPath,
    diagnostics: {
      anthropicBaseUrl,
      apiKeyAvailable: Boolean(apiKey.apiKey),
      apiKeySource: apiKey.source,
      configPath,
      haikuModelId,
      home,
      modelId: GLM_CLAUDE_CODE_MODEL_ID,
      providerId: GLM_CLAUDE_CODE_PROVIDER_ID,
      sonnetModelId,
      timeoutMs,
    },
    env,
    home,
    modelId: GLM_CLAUDE_CODE_MODEL_ID,
    providerId: GLM_CLAUDE_CODE_PROVIDER_ID,
  };
};

export {
  extractGlmClaudeCodeApiKeyFromConfig,
  type GlmClaudeCodeApiKeyResolution,
  type GlmClaudeCodeApiKeySource,
  resolveGlmClaudeCodeApiKey,
  resolveGlmClaudeCodeConfigPath,
} from "../auth/glm-claude-code-auth-profile";
