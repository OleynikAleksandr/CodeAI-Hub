import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_CONFIG_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "glm-claude-code",
  "config.json"
);

export type GlmClaudeCodeApiKeySource =
  | "codeai_env"
  | "glm_config"
  | "glm_env"
  | "missing";

export interface GlmClaudeCodeConfig {
  readonly apiKey: string | null;
  readonly baseUrl: string | null;
  readonly haikuModel: string | null;
  readonly opusModel: string | null;
  readonly sonnetModel: string | null;
  readonly timeoutMs: number | null;
}

export interface GlmClaudeCodeApiKeyResolution {
  readonly apiKey: string | null;
  readonly config: GlmClaudeCodeConfig;
  readonly source: GlmClaudeCodeApiKeySource;
}

export interface GlmClaudeCodeApiKeyOptions {
  readonly configPath?: string;
  readonly env?: NodeJS.ProcessEnv;
}

const EMPTY_CONFIG: GlmClaudeCodeConfig = {
  apiKey: null,
  baseUrl: null,
  haikuModel: null,
  opusModel: null,
  sonnetModel: null,
  timeoutMs: null,
};

const trimOptional = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const readString = (value: unknown): string | null =>
  typeof value === "string" ? trimOptional(value) : null;

const readPositiveInteger = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;

const parseGlmClaudeCodeConfig = (configText: string): GlmClaudeCodeConfig => {
  if (!configText.trim()) {
    return EMPTY_CONFIG;
  }

  try {
    const parsed: unknown = JSON.parse(configText);
    if (!parsed || typeof parsed !== "object") {
      return EMPTY_CONFIG;
    }
    const record = parsed as Record<string, unknown>;
    return {
      apiKey: readString(record.apiKey),
      baseUrl: readString(record.baseUrl),
      haikuModel: readString(record.haikuModel),
      opusModel: readString(record.opusModel),
      sonnetModel: readString(record.sonnetModel),
      timeoutMs: readPositiveInteger(record.timeoutMs),
    };
  } catch {
    return EMPTY_CONFIG;
  }
};

export const resolveGlmClaudeCodeConfigPath = (
  env: NodeJS.ProcessEnv = process.env
): string =>
  trimOptional(env.CODEAI_GLM_CLAUDE_CODE_CONFIG_PATH) ?? DEFAULT_CONFIG_PATH;

const buildGlmClaudeCodeConfigTemplate = (): string =>
  `${JSON.stringify(
    {
      apiKey: "",
    },
    null,
    2
  )}\n`;

const isFileAlreadyExistsError = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { readonly code?: unknown }).code === "EEXIST"
  );

export const ensureGlmClaudeCodeConfigFile = async (
  options: GlmClaudeCodeApiKeyOptions = {}
): Promise<string> => {
  const env = options.env ?? process.env;
  const configPath = options.configPath ?? resolveGlmClaudeCodeConfigPath(env);
  await mkdir(path.dirname(configPath), { recursive: true });
  try {
    await writeFile(configPath, buildGlmClaudeCodeConfigTemplate(), {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (!isFileAlreadyExistsError(error)) {
      throw error;
    }
  }
  return configPath;
};

export const resolveGlmClaudeCodeApiKey = async (
  options: GlmClaudeCodeApiKeyOptions = {}
): Promise<GlmClaudeCodeApiKeyResolution> => {
  const env = options.env ?? process.env;
  const configPath = options.configPath ?? resolveGlmClaudeCodeConfigPath(env);
  await ensureGlmClaudeCodeConfigFile({ configPath, env }).catch(() => {
    // Auth can still come from env/workspace settings even if the template path
    // is not writable, so template creation is best-effort during resolution.
  });
  const configText = await readFile(configPath, "utf8").catch(() => "");
  const config = parseGlmClaudeCodeConfig(configText);

  const codeaiApiKey = trimOptional(env.CODEAI_GLM_CLAUDE_CODE_API_KEY);
  if (codeaiApiKey) {
    return { apiKey: codeaiApiKey, config, source: "codeai_env" };
  }

  const glmApiKey =
    trimOptional(env.GLM_CLAUDE_CODE_API_KEY) ??
    trimOptional(env.ZAI_API_KEY) ??
    trimOptional(env.Z_AI_API_KEY);
  if (glmApiKey) {
    return { apiKey: glmApiKey, config, source: "glm_env" };
  }

  return config.apiKey
    ? { apiKey: config.apiKey, config, source: "glm_config" }
    : { apiKey: null, config, source: "missing" };
};

export const extractGlmClaudeCodeApiKeyFromConfig = (
  configText: string
): string | null => parseGlmClaudeCodeConfig(configText).apiKey;
