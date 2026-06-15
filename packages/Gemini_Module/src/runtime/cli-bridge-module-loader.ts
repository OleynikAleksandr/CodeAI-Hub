import { existsSync, readFileSync } from "node:fs";
import nodeModule from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type GeminiStorageModule,
  patchGeminiStorageGlobalDir,
  resolveGeminiProviderGeminiDir,
} from "./cli-bridge-provider-home";
import type { GeminiCliModules } from "./cli-types";
import type {
  CompletedToolCall,
  CoreToolSchedulerModule,
  GeminiCliConfigModule,
  GeminiCliExtensionEnablementModule,
  GeminiCliExtensionModule,
  GeminiCliSettingsModule,
  ToolCallRequestInfo,
} from "./gemini-cli-compat";

const { createRequire } = nodeModule;

const toModuleUrl = (root: string, ...segments: readonly string[]): string => {
  const absolutePath = pathToFileURL(path.join(root, ...segments));
  return absolutePath.href;
};

const dynamicImportModule = <T>(specifier: string): Promise<T> =>
  Function("specifier", "return import(specifier);")(specifier) as Promise<T>;

const loadEsmModule = async <T>(
  root: string,
  ...segments: readonly string[]
): Promise<T> => {
  const url = toModuleUrl(root, ...segments);
  const loaded = await dynamicImportModule<T>(url);
  return loaded as T;
};

const formatLoadErrors = (errors: readonly unknown[]): string =>
  errors.map((error) => String(error)).join("\n");

const tryFindAndLoadModule = async <T>(
  root: string,
  candidates: readonly (readonly string[])[]
): Promise<{
  readonly module: T | null;
  readonly errors: readonly unknown[];
}> => {
  const errors: unknown[] = [];
  for (const segments of candidates) {
    try {
      const module = await loadEsmModule<T>(root, ...segments);
      return { module, errors };
    } catch (error) {
      errors.push(error);
    }
  }
  return {
    module: null,
    errors,
  };
};

const findAndLoadModule = async <T>(
  root: string,
  candidates: readonly (readonly string[])[]
): Promise<T> => {
  const { module, errors } = await tryFindAndLoadModule<T>(root, candidates);
  if (module) {
    return module;
  }
  throw new Error(
    `Failed to load module from any candidate path:\n${errors
      .map((e) => String(e))
      .join("\n")}`
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const normalized = asString(entry);
    return normalized ? [normalized] : [];
  });
};

const resolveObjectPath = (
  source: Record<string, unknown>,
  ...keys: readonly string[]
): Record<string, unknown> | undefined => {
  let current: unknown = source;
  for (const key of keys) {
    if (!isRecord(current)) {
      return;
    }
    current = current[key];
  }
  return isRecord(current) ? current : undefined;
};

const mergeObjects = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    if (isRecord(existing) && isRecord(value)) {
      merged[key] = mergeObjects(existing, value);
      continue;
    }
    merged[key] = value;
  }
  return merged;
};

const normalizeCompatSettings = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const normalized = mergeObjects({}, settings);
  const selectedAuthType = asString(normalized.selectedAuthType);
  if (selectedAuthType) {
    const security = isRecord(normalized.security) ? normalized.security : {};
    const auth = isRecord(security.auth) ? security.auth : {};
    normalized.security = {
      ...security,
      auth: {
        ...auth,
        selectedType: asString(auth.selectedType) ?? selectedAuthType,
      },
    };
  }
  return normalized;
};

const readCompatSettingsFile = (filePath: string): Record<string, unknown> => {
  if (!existsSync(filePath)) {
    return {};
  }
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? normalizeCompatSettings(parsed) : {};
  } catch {
    return {};
  }
};

const createCompatConfigModule = async (
  cliCoreRoot: string
): Promise<GeminiCliConfigModule> => {
  const coreConfigModule = await findAndLoadModule<
    typeof import("@google/gemini-cli-core/dist/src/config/config")
  >(cliCoreRoot, [
    ["dist", "src", "config", "config.js"],
    ["dist", "config", "config.js"],
  ]);

  const compatModule = {
    loadCliConfig: async (
      settings: unknown,
      sessionId: string,
      argv: unknown,
      cwd = process.cwd()
    ) => {
      const mergedSettings = isRecord(settings) ? settings : {};
      const argvRecord = isRecord(argv) ? argv : {};
      const contextSettings = resolveObjectPath(mergedSettings, "context");
      const modelSettings = resolveObjectPath(mergedSettings, "model");
      const privacySettings = resolveObjectPath(mergedSettings, "privacy");
      const uiSettings = resolveObjectPath(mergedSettings, "ui");
      const accessibilitySettings = resolveObjectPath(
        mergedSettings,
        "ui",
        "accessibility"
      );
      const includeDirectories = Array.from(
        new Set(
          [
            ...asStringArray(contextSettings?.includeDirectories),
            ...asStringArray(argvRecord.includeDirectories),
          ].map((directory) => path.resolve(directory))
        )
      );

      const approvalMode = (asString(argvRecord.approvalMode) ??
        (argvRecord.yolo === true
          ? "yolo"
          : "default")) as ConstructorParameters<
        typeof coreConfigModule.Config
      >[0]["approvalMode"];

      const resolvedModel =
        asString(argvRecord.model) ??
        asString(modelSettings?.name) ??
        coreConfigModule.DEFAULT_GEMINI_FLASH_MODEL;
      const question =
        asString(argvRecord.promptInteractive) ??
        asString(argvRecord.prompt) ??
        "";

      return await Promise.resolve(
        new coreConfigModule.Config({
          sessionId,
          targetDir: cwd,
          cwd,
          approvalMode,
          debugMode: argvRecord.debug === true,
          includeDirectories,
          interactive: false,
          listExtensions: argvRecord.listExtensions === true,
          listSessions: argvRecord.listSessions === true,
          deleteSession: asString(argvRecord.deleteSession),
          allowedTools: asStringArray(argvRecord.allowedTools),
          allowedMcpServers: asStringArray(argvRecord.allowedMcpServerNames),
          blockedMcpServers: [],
          question,
          model: resolvedModel,
          showMemoryUsage: asBoolean(uiSettings?.showMemoryUsage) ?? false,
          accessibility: accessibilitySettings,
          usageStatisticsEnabled:
            asBoolean(privacySettings?.usageStatisticsEnabled) ?? true,
        })
      );
    },
  };

  return compatModule as GeminiCliConfigModule;
};

const createCompatSettingsModule = (
  _cliRoot: string
): GeminiCliSettingsModule => {
  return {
    loadSettings: (workspaceDir = process.cwd()) => {
      const userSettingsPath = path.join(
        resolveGeminiProviderGeminiDir(),
        "settings.json"
      );
      const workspaceSettingsPath = path.join(
        workspaceDir,
        ".gemini",
        "settings.json"
      );
      const userSettings = readCompatSettingsFile(userSettingsPath);
      const workspaceSettings = readCompatSettingsFile(workspaceSettingsPath);
      return {
        merged: mergeObjects(userSettings, workspaceSettings),
      };
    },
    migrateDeprecatedSettings: () => {
      // Bundle-only Gemini CLI no longer exposes the old migrator API.
    },
  } as GeminiCliSettingsModule;
};

const loadAndPatchGeminiStorageModule = async (
  cliCoreRoot: string
): Promise<void> => {
  const storage = await tryFindAndLoadModule<GeminiStorageModule>(cliCoreRoot, [
    ["dist", "src", "config", "storage.js"],
    ["dist", "config", "storage.js"],
  ]);
  if (storage.module) {
    patchGeminiStorageGlobalDir(storage.module);
  }
};

interface LegacySchedulerOptions {
  readonly context: Record<string, unknown>;
  readonly getPreferredEditor: () => undefined;
  readonly onAllToolCallsComplete?: (
    completedToolCalls: readonly CompletedToolCall[]
  ) => void | Promise<void>;
}

interface ModernSchedulerInstanceLike {
  schedule(
    request: ToolCallRequestInfo | readonly ToolCallRequestInfo[],
    signal: AbortSignal
  ): Promise<readonly CompletedToolCall[]>;
}

interface ModernSchedulerConstructorLike {
  new (options: {
    readonly context: Record<string, unknown>;
    readonly getPreferredEditor: () => undefined;
    readonly messageBus?: unknown;
  }): ModernSchedulerInstanceLike;
}

const createCompatToolSchedulerModule = async (
  cliCoreRoot: string
): Promise<CoreToolSchedulerModule> => {
  const legacyScheduler = await tryFindAndLoadModule<CoreToolSchedulerModule>(
    cliCoreRoot,
    [
      ["dist", "src", "core", "coreToolScheduler.js"],
      ["dist", "core", "coreToolScheduler.js"],
    ]
  );
  if (legacyScheduler.module) {
    return legacyScheduler.module;
  }

  const modernScheduler = await tryFindAndLoadModule<{
    readonly Scheduler?: ModernSchedulerConstructorLike;
  }>(cliCoreRoot, [
    ["dist", "src", "scheduler", "scheduler.js"],
    ["dist", "scheduler", "scheduler.js"],
  ]);
  if (!modernScheduler.module?.Scheduler) {
    throw new Error(
      `Failed to load module from any candidate path:\n${formatLoadErrors([
        ...legacyScheduler.errors,
        ...modernScheduler.errors,
      ])}`
    );
  }

  const Scheduler = modernScheduler.module.Scheduler;
  class CoreToolSchedulerCompat {
    private readonly scheduler: ModernSchedulerInstanceLike;

    private readonly onAllToolCallsComplete?:
      | ((
          completedToolCalls: readonly CompletedToolCall[]
        ) => void | Promise<void>)
      | undefined;

    constructor(options: LegacySchedulerOptions) {
      this.onAllToolCallsComplete = options.onAllToolCallsComplete;
      this.scheduler = new Scheduler({
        context: options.context,
        getPreferredEditor: options.getPreferredEditor,
        messageBus: options.context.messageBus,
      });
    }

    async schedule(
      request: ToolCallRequestInfo | readonly ToolCallRequestInfo[],
      signal: AbortSignal
    ): Promise<void> {
      const completedToolCalls = await this.scheduler.schedule(request, signal);
      await this.onAllToolCallsComplete?.(completedToolCalls);
    }
  }

  return {
    CoreToolScheduler: CoreToolSchedulerCompat,
  } as CoreToolSchedulerModule;
};

export const loadGeminiModules = async (
  cliRoot: string,
  cliCoreRoot: string
): Promise<GeminiCliModules> => {
  await loadAndPatchGeminiStorageModule(cliCoreRoot);

  const [
    legacyConfig,
    contentGenerator,
    toolScheduler,
    turn,
    thoughtUtils,
    sessionUtils,
  ] = await Promise.all([
    tryFindAndLoadModule<GeminiCliConfigModule>(cliRoot, [
      ["dist", "src", "config", "config.js"],
      ["dist", "config", "config.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli-core/dist/src/core/contentGenerator")
    >(cliCoreRoot, [
      ["dist", "src", "core", "contentGenerator.js"],
      ["dist", "core", "contentGenerator.js"],
    ]),
    createCompatToolSchedulerModule(cliCoreRoot),
    findAndLoadModule<
      typeof import("@google/gemini-cli-core/dist/src/core/turn")
    >(cliCoreRoot, [
      ["dist", "src", "core", "turn.js"],
      ["dist", "core", "turn.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli-core/dist/src/utils/thoughtUtils")
    >(cliCoreRoot, [
      ["dist", "src", "utils", "thoughtUtils.js"],
      ["dist", "utils", "thoughtUtils.js"],
    ]),
    tryFindAndLoadModule<NonNullable<GeminiCliModules["sessionUtils"]>>(
      cliCoreRoot,
      [
        ["dist", "src", "utils", "sessionUtils.js"],
        ["dist", "utils", "sessionUtils.js"],
      ]
    ),
  ]);

  const config =
    legacyConfig.module ?? (await createCompatConfigModule(cliCoreRoot));
  const settings = createCompatSettingsModule(cliRoot);

  return {
    config,
    settings,
    extension: {} as GeminiCliExtensionModule,
    extensionEnablement: {} as GeminiCliExtensionEnablementModule,
    contentGenerator,
    toolScheduler,
    turn,
    thoughtUtils,
    sessionUtils: sessionUtils.module,
  };
};

export const validateGeminiCliCoreDependencyGraph = (
  cliCoreRoot: string,
  label: string
): void => {
  const requireFromCliCore = createRequire(
    path.join(cliCoreRoot, "package.json")
  );
  try {
    requireFromCliCore("fast-uri");
  } catch (error) {
    const baseMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label} runtime dependency check failed for fast-uri: ${baseMessage}`
    );
  }
};
