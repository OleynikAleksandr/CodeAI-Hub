import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

export const GLM_OPENCODE_MODEL_ID = "glm-5.2";
const GLM_OPENCODE_PROVIDER_KEY = "zai-coding-plan";
export const GLM_OPENCODE_DEFAULT_MODEL_SELECTOR = `${GLM_OPENCODE_PROVIDER_KEY}/${GLM_OPENCODE_MODEL_ID}`;
const GLM_OPENCODE_BASE_URL = "https://api.z.ai/api/coding/paas/v4";
export const DEFAULT_GLM_OPENCODE_CONFIG_PATH =
  "~/.codeai-hub/providers/glm-opencode/config.json";
export const DEFAULT_GLM_OPENCODE_PROVIDER_HOME_PATH =
  "~/.codeai-hub/providers/glm-opencode/home";

interface GlmOpenCodeConfigFile {
  readonly api_key?: unknown;
  readonly apiKey?: unknown;
  readonly defaultModel?: unknown;
  readonly glmApiKey?: unknown;
  readonly model?: unknown;
  readonly modelId?: unknown;
  readonly openCodeCommand?: unknown;
  readonly opencodeCommand?: unknown;
  readonly opencodePath?: unknown;
  readonly providerHomePath?: unknown;
  readonly zAiApiKey?: unknown;
  readonly zaiApiKey?: unknown;
}

interface GlmOpenCodeWorkspaceSettings {
  readonly apiKey?: unknown;
  readonly configPath?: unknown;
  readonly defaultModel?: unknown;
  readonly model?: unknown;
  readonly modelId?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly zAiApiKey?: unknown;
  readonly zaiApiKey?: unknown;
}

export interface GlmOpenCodeRuntimeProfile {
  readonly apiKey: string;
  readonly command: string;
  readonly configPath: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly modelSelector: string;
  readonly providerHomePath: string;
  readonly workspacePath?: string;
}

export interface GlmOpenCodeRuntimeProfileOptions {
  readonly configPath?: string;
  readonly defaultModel?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly providerHomePath?: string;
  readonly settingsPath?: string;
  readonly workspacePath?: string;
}

const expandHomePath = (value: string): string =>
  value === "~" || value.startsWith("~/")
    ? path.join(os.homedir(), value.slice(2))
    : value;

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readConfig = (configPath: string): GlmOpenCodeConfigFile => {
  if (!existsSync(configPath)) {
    return {};
  }
  const raw = readFileSync(configPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as GlmOpenCodeConfigFile)
    : {};
};

const readWorkspaceSettings = (
  settingsPath: string | undefined
): GlmOpenCodeWorkspaceSettings => {
  if (!(settingsPath && existsSync(settingsPath))) {
    return {};
  }
  const parsed: unknown = JSON.parse(readFileSync(settingsPath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  const providers = (parsed as { readonly providers?: unknown }).providers;
  if (!providers || typeof providers !== "object" || Array.isArray(providers)) {
    return {};
  }
  const settings = (providers as { readonly glmOpenCode?: unknown })
    .glmOpenCode;
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as GlmOpenCodeWorkspaceSettings)
    : {};
};

const normalizeModelSelector = (model: string | null): string =>
  !model || model === GLM_OPENCODE_MODEL_ID
    ? GLM_OPENCODE_DEFAULT_MODEL_SELECTOR
    : model;

const hasPathSeparator = (command: string): boolean =>
  command.includes("/") || command.includes("\\");

const isExecutable = (candidate: string): boolean => {
  try {
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const findExecutableOnPath = (
  command: string,
  environment: NodeJS.ProcessEnv
): string | null => {
  for (const directory of (environment.PATH ?? "").split(path.delimiter)) {
    if (directory.trim().length === 0) {
      continue;
    }
    const candidate = path.join(directory, command);
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return null;
};

const resolveOpenCodeCommand = (
  config: GlmOpenCodeConfigFile,
  environment: NodeJS.ProcessEnv
): string => {
  const explicit =
    readString(environment.CODEAI_GLM_OPENCODE_COMMAND) ??
    readString(environment.OPENCODE_COMMAND) ??
    readString(config.openCodeCommand) ??
    readString(config.opencodeCommand) ??
    readString(config.opencodePath);
  if (explicit) {
    const command = expandHomePath(explicit);
    if (!hasPathSeparator(command) || isExecutable(command)) {
      return command;
    }
  }
  const homeCandidates = [
    "~/.opencode/bin/opencode",
    "~/.npm-global/bin/opencode",
  ].map(expandHomePath);
  for (const candidate of homeCandidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return findExecutableOnPath("opencode", environment) ?? "opencode";
};

const resolveApiKey = (
  config: GlmOpenCodeConfigFile,
  environment: NodeJS.ProcessEnv,
  workspaceSettings: GlmOpenCodeWorkspaceSettings
): string => {
  const apiKey =
    readString(environment.ZAI_API_KEY) ??
    readString(environment.ZHIPU_API_KEY) ??
    readString(environment.Z_AI_API_KEY) ??
    readString(environment.GLM_API_KEY) ??
    readString(config.zaiApiKey) ??
    readString(config.zAiApiKey) ??
    readString(config.glmApiKey) ??
    readString(config.apiKey) ??
    readString(config.api_key) ??
    readString(workspaceSettings.zaiApiKey) ??
    readString(workspaceSettings.zAiApiKey) ??
    readString(workspaceSettings.apiKey);
  if (!apiKey) {
    throw new Error(
      "GLM-OpenCode API key is missing. Set ZAI_API_KEY or configure apiKey in the provider config."
    );
  }
  return apiKey;
};

const buildRuntimeEnvironment = (params: {
  readonly apiKey: string;
  readonly baseEnvironment: NodeJS.ProcessEnv;
  readonly providerHomePath: string;
}): NodeJS.ProcessEnv => {
  const runtimeHome = path.join(params.providerHomePath, "home");
  const configHome = path.join(params.providerHomePath, "config");
  const dataHome = path.join(params.providerHomePath, "data");
  materializeOpenCodeRuntimeFiles({
    apiKey: params.apiKey,
    configHome,
    dataHome,
  });
  return {
    ...params.baseEnvironment,
    GLM_API_KEY: params.apiKey,
    HOME: runtimeHome,
    XDG_CACHE_HOME: path.join(params.providerHomePath, "cache"),
    XDG_CONFIG_HOME: configHome,
    XDG_DATA_HOME: dataHome,
    ZAI_API_KEY: params.apiKey,
    ZHIPU_API_KEY: params.apiKey,
    Z_AI_API_KEY: params.apiKey,
  };
};

const materializeOpenCodeRuntimeFiles = (params: {
  readonly apiKey: string;
  readonly configHome: string;
  readonly dataHome: string;
}): void => {
  const configDir = path.join(params.configHome, "opencode");
  const dataDir = path.join(params.dataHome, "opencode");
  mkdirSync(configDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    path.join(configDir, "opencode.json"),
    `${JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        enabled_providers: [GLM_OPENCODE_PROVIDER_KEY],
        model: GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
        provider: {
          [GLM_OPENCODE_PROVIDER_KEY]: {
            models: {
              [GLM_OPENCODE_MODEL_ID]: {
                name: "GLM 5.2",
              },
            },
            name: "Z.AI Coding Plan",
            npm: "@ai-sdk/openai-compatible",
            options: {
              baseURL: GLM_OPENCODE_BASE_URL,
              chunkTimeout: 60_000,
              timeout: 120_000,
            },
          },
        },
        small_model: GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  writeFileSync(
    path.join(dataDir, "auth.json"),
    `${JSON.stringify(
      {
        [GLM_OPENCODE_PROVIDER_KEY]: {
          key: params.apiKey,
          type: "api",
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

export const buildGlmOpenCodeRuntimeProfile = (
  options: GlmOpenCodeRuntimeProfileOptions = {}
): GlmOpenCodeRuntimeProfile => {
  const environment = options.environment ?? process.env;
  const workspaceSettings = readWorkspaceSettings(options.settingsPath);
  const configPath = expandHomePath(
    options.configPath ??
      readString(workspaceSettings.configPath) ??
      DEFAULT_GLM_OPENCODE_CONFIG_PATH
  );
  const config = readConfig(configPath);
  const providerHomePath = expandHomePath(
    options.providerHomePath ??
      readString(config.providerHomePath) ??
      DEFAULT_GLM_OPENCODE_PROVIDER_HOME_PATH
  );
  const apiKey = resolveApiKey(config, environment, workspaceSettings);
  const modelSelector = normalizeModelSelector(
    options.defaultModel ??
      readString(config.defaultModel) ??
      readString(config.modelId) ??
      readString(config.model) ??
      readString(workspaceSettings.defaultModel) ??
      readString(workspaceSettings.modelId) ??
      readString(workspaceSettings.model)
  );
  return {
    apiKey,
    command: resolveOpenCodeCommand(config, environment),
    configPath,
    environment: buildRuntimeEnvironment({
      apiKey,
      baseEnvironment: environment,
      providerHomePath,
    }),
    modelSelector,
    providerHomePath,
    workspacePath: options.workspacePath,
  };
};

export const ensureGlmOpenCodeRuntimeProfile = (
  profile: GlmOpenCodeRuntimeProfile
): void => {
  for (const directory of [
    profile.providerHomePath,
    profile.environment.HOME,
    profile.environment.XDG_CACHE_HOME,
    profile.environment.XDG_CONFIG_HOME,
    profile.environment.XDG_DATA_HOME,
  ]) {
    if (directory) {
      mkdirSync(directory, { recursive: true });
    }
  }
};
