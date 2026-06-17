import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const GLM_DEFAULT_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
export const GLM_DEFAULT_MODEL = "glm-5.2";
export const GLM_CONTEXT_WINDOW_TOKEN_LIMIT = 1_000_000;

const TRAILING_SLASH_PATTERN = /\/+$/u;

export interface GlmRuntimeProfileInput {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly defaultModel?: string;
  readonly providerHomePath?: string;
  readonly reasoningEffort?: string;
  readonly settingsPath?: string;
  readonly thinkingEnabled?: boolean;
  readonly workspacePath?: string;
}

export interface GlmRuntimeProfile {
  readonly apiKey: string | null;
  readonly baseUrl: string;
  readonly chatCompletionsUrl: string;
  readonly model: string;
  readonly providerHomePath: string;
  readonly reasoningEffort: string;
  readonly settingsPath?: string;
  readonly thinkingEnabled: boolean;
  readonly workspacePath?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const readSettingsProvider = (
  settingsPath: string | undefined
): Record<string, unknown> | null => {
  if (!settingsPath) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as unknown;
    if (!(isRecord(parsed) && isRecord(parsed.providers))) {
      return null;
    }
    const provider = parsed.providers.glmNative;
    return isRecord(provider) ? provider : null;
  } catch {
    return null;
  }
};

const stripTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASH_PATTERN, "");

const resolveProviderHomePath = (
  providerHomePath: string | undefined
): string =>
  providerHomePath ??
  path.join(os.homedir(), ".codeai-hub", "providers", "glm-native", "home");

export const buildGlmRuntimeProfile = (
  input: GlmRuntimeProfileInput
): GlmRuntimeProfile => {
  const settings = readSettingsProvider(input.settingsPath);
  const apiKey =
    readString(input.apiKey) ??
    readString(settings?.apiKey) ??
    readString(process.env.ZAI_API_KEY) ??
    readString(process.env.ZHIPU_API_KEY) ??
    readString(process.env.Z_AI_API_KEY);
  const baseUrl = stripTrailingSlash(
    readString(input.baseUrl) ??
      readString(settings?.baseUrl) ??
      GLM_DEFAULT_BASE_URL
  );
  const model =
    readString(input.defaultModel) ??
    readString(settings?.defaultModel) ??
    readString(settings?.model) ??
    GLM_DEFAULT_MODEL;
  const reasoningEffort =
    readString(input.reasoningEffort) ??
    readString(settings?.reasoningEffort) ??
    readString(process.env.GLM_REASONING_EFFORT) ??
    "max";
  const thinkingEnabled =
    readBoolean(input.thinkingEnabled) ??
    readBoolean(settings?.thinkingEnabled) ??
    true;
  const providerHomePath = resolveProviderHomePath(input.providerHomePath);
  return {
    apiKey,
    baseUrl,
    chatCompletionsUrl: `${baseUrl}/chat/completions`,
    model,
    providerHomePath,
    reasoningEffort,
    thinkingEnabled,
    ...(input.settingsPath ? { settingsPath: input.settingsPath } : {}),
    ...(input.workspacePath ? { workspacePath: input.workspacePath } : {}),
  };
};

export const ensureGlmRuntimeProfile = (profile: GlmRuntimeProfile): void => {
  mkdirSync(profile.providerHomePath, { recursive: true });
  if (!profile.apiKey) {
    throw new Error(
      "GLM API key is missing. Set it in Settings or export ZAI_API_KEY."
    );
  }
};
