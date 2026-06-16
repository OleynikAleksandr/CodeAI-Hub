import {
  accessSync,
  constants,
  copyFileSync,
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
export const KIMI_OPENCODE_MODEL_ID = "k2p7";
const KIMI_OPENCODE_PROVIDER_KEY = "kimi-for-coding";
export const KIMI_OPENCODE_DEFAULT_MODEL_SELECTOR = `${KIMI_OPENCODE_PROVIDER_KEY}/${KIMI_OPENCODE_MODEL_ID}`;
const OPENCODE_WRAPPER_AGENT_NAME = "codeai-hub";
export const DEFAULT_GLM_OPENCODE_CONFIG_PATH =
  "~/.codeai-hub/providers/opencode/config.json";
export const DEFAULT_GLM_OPENCODE_PROVIDER_HOME_PATH =
  "~/.codeai-hub/providers/opencode/home";
const LEGACY_GLM_OPENCODE_CONFIG_PATH =
  "~/.codeai-hub/providers/glm-opencode/config.json";
const LEGACY_GLM_OPENCODE_PROVIDER_HOME_PATH =
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
  readonly apiKey?: string;
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

const expandHomePath = (
  value: string,
  homeDirectory: string = process.env.HOME ?? os.homedir()
): string =>
  value === "~" || value.startsWith("~/")
    ? path.join(homeDirectory, value.slice(2))
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

const resolvePreferredPath = (
  explicitPath: string | null,
  defaultPath: string,
  legacyPath: string,
  homeDirectory?: string
): string => {
  if (explicitPath) {
    return expandHomePath(explicitPath, homeDirectory);
  }
  const expandedDefault = expandHomePath(defaultPath, homeDirectory);
  if (existsSync(expandedDefault)) {
    return expandedDefault;
  }
  const expandedLegacy = expandHomePath(legacyPath, homeDirectory);
  return existsSync(expandedLegacy) ? expandedLegacy : expandedDefault;
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

const getOpenCodeAuthPathCandidates = (
  environment: NodeJS.ProcessEnv
): string[] => {
  const xdgDataHome = readString(environment.XDG_DATA_HOME);
  return [
    ...(xdgDataHome
      ? [path.join(expandHomePath(xdgDataHome), "opencode", "auth.json")]
      : []),
    path.join(os.homedir(), ".local", "share", "opencode", "auth.json"),
  ];
};

const findReadableOpenCodeAuthPath = (
  environment: NodeJS.ProcessEnv
): string | null => {
  for (const authPath of new Set(getOpenCodeAuthPathCandidates(environment))) {
    if (!existsSync(authPath)) {
      continue;
    }
    try {
      accessSync(authPath, constants.R_OK);
      return authPath;
    } catch {
      // Ignore unreadable auth candidates and continue scanning.
    }
  }
  return null;
};

const normalizeModelSelector = (model: string | null): string => {
  if (!model || model === GLM_OPENCODE_MODEL_ID) {
    return GLM_OPENCODE_DEFAULT_MODEL_SELECTOR;
  }
  if (model === "kimi-k2.7-code" || model === KIMI_OPENCODE_MODEL_ID) {
    return KIMI_OPENCODE_DEFAULT_MODEL_SELECTOR;
  }
  return model;
};

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
  ].map((candidate) => expandHomePath(candidate));
  for (const candidate of homeCandidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return findExecutableOnPath("opencode", environment) ?? "opencode";
};

const resolveZaiApiKey = (
  config: GlmOpenCodeConfigFile,
  environment: NodeJS.ProcessEnv,
  workspaceSettings: GlmOpenCodeWorkspaceSettings
): string | null =>
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

const buildRuntimeEnvironment = (params: {
  readonly baseEnvironment: NodeJS.ProcessEnv;
  readonly modelSelector: string;
  readonly providerHomePath: string;
  readonly zaiApiKey: string | null;
}): NodeJS.ProcessEnv => {
  const runtimeHome = path.join(params.providerHomePath, "home");
  const cacheHome = path.join(params.providerHomePath, "cache");
  const configHome = path.join(params.providerHomePath, "config");
  const dataHome = path.join(params.providerHomePath, "data");
  materializeOpenCodeRuntimeFiles({
    baseEnvironment: params.baseEnvironment,
    cacheHome,
    configHome,
    dataHome,
    modelSelector: params.modelSelector,
    runtimeHome,
    zaiApiKey: params.zaiApiKey,
  });
  const optionalZaiKeyEnvironment = params.zaiApiKey
    ? {
        GLM_API_KEY: params.zaiApiKey,
        ZAI_API_KEY: params.zaiApiKey,
        ZHIPU_API_KEY: params.zaiApiKey,
        Z_AI_API_KEY: params.zaiApiKey,
      }
    : {};
  return {
    ...params.baseEnvironment,
    ...optionalZaiKeyEnvironment,
    HOME: runtimeHome,
    OPENCODE_DISABLE_CLAUDE_CODE: "1",
    OPENCODE_DISABLE_EXTERNAL_SKILLS: "1",
    OPENCODE_DISABLE_PROJECT_CONFIG: "1",
    XDG_CACHE_HOME: cacheHome,
    XDG_CONFIG_HOME: configHome,
    XDG_DATA_HOME: dataHome,
  };
};

const materializeOpenCodeRuntimeFiles = (params: {
  readonly baseEnvironment: NodeJS.ProcessEnv;
  readonly cacheHome: string;
  readonly configHome: string;
  readonly dataHome: string;
  readonly modelSelector: string;
  readonly runtimeHome: string;
  readonly zaiApiKey: string | null;
}): void => {
  const configDir = path.join(params.configHome, "opencode");
  const dataDir = path.join(params.dataHome, "opencode");
  mkdirSync(params.runtimeHome, { recursive: true });
  mkdirSync(params.cacheHome, { recursive: true });
  mkdirSync(configDir, { recursive: true });
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(
    path.join(configDir, "opencode.json"),
    `${JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        agent: {
          [OPENCODE_WRAPPER_AGENT_NAME]: {
            mode: "primary",
            prompt:
              "You are a CodeAI Hub managed OpenCode agent. Follow the user task exactly, use the user's language for visible answers, and avoid extra commentary.",
          },
        },
        model: params.modelSelector,
        small_model: params.modelSelector,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  const isolatedAuthPath = path.join(dataDir, "auth.json");
  const sourceAuthPath = findReadableOpenCodeAuthPath(params.baseEnvironment);
  if (sourceAuthPath) {
    copyFileSync(sourceAuthPath, isolatedAuthPath);
  }
  if (params.zaiApiKey) {
    const existingAuth = existsSync(isolatedAuthPath)
      ? JSON.parse(readFileSync(isolatedAuthPath, "utf8"))
      : {};
    writeFileSync(
      isolatedAuthPath,
      `${JSON.stringify(
        {
          ...(existingAuth && typeof existingAuth === "object"
            ? existingAuth
            : {}),
          [GLM_OPENCODE_PROVIDER_KEY]: {
            key: params.zaiApiKey,
            type: "api",
          },
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }
};

export const buildGlmOpenCodeRuntimeProfile = (
  options: GlmOpenCodeRuntimeProfileOptions = {}
): GlmOpenCodeRuntimeProfile => {
  const environment = options.environment ?? process.env;
  const workspaceSettings = readWorkspaceSettings(options.settingsPath);
  const homeDirectory = environment.HOME ?? os.homedir();
  const configPath = resolvePreferredPath(
    options.configPath ?? readString(workspaceSettings.configPath),
    DEFAULT_GLM_OPENCODE_CONFIG_PATH,
    LEGACY_GLM_OPENCODE_CONFIG_PATH,
    homeDirectory
  );
  const config = readConfig(configPath);
  const providerHomePath = resolvePreferredPath(
    options.providerHomePath ?? readString(config.providerHomePath),
    DEFAULT_GLM_OPENCODE_PROVIDER_HOME_PATH,
    LEGACY_GLM_OPENCODE_PROVIDER_HOME_PATH,
    homeDirectory
  );
  const modelSelector = normalizeModelSelector(
    options.defaultModel ??
      readString(config.defaultModel) ??
      readString(config.modelId) ??
      readString(config.model) ??
      readString(workspaceSettings.defaultModel) ??
      readString(workspaceSettings.modelId) ??
      readString(workspaceSettings.model)
  );
  const zaiApiKey = resolveZaiApiKey(config, environment, workspaceSettings);
  return {
    ...(zaiApiKey ? { apiKey: zaiApiKey } : {}),
    command: resolveOpenCodeCommand(config, environment),
    configPath,
    environment: buildRuntimeEnvironment({
      baseEnvironment: environment,
      modelSelector,
      providerHomePath,
      zaiApiKey,
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
