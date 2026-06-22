import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type LocalizationFacade,
  resolveLocalizationPaths,
  UserGlossaryStore,
} from "@codeai-hub/localization";
import {
  type CoreConfig,
  resolveGlobalLocalizationRootPath,
} from "../../config";
import type { Logger } from "../../telemetry/logger";
import { TemplateSyncFacade } from "../../templates/template-sync-facade";
import type {
  PendingTemplateUpdate,
  TemplateUpdateResolutionRequest,
} from "../../templates/template-update-resolution-service";
import { createCoreLocalizationFacade } from "../../translation/core-localization-facade-factory";
import type { BridgeEvent } from "../types";
import {
  type KimiReconfigureRegistry,
  type KimiReconfigureSessionManager,
  reconcileKimiThinkingEnabled,
} from "./kimi-thinking-reconciler";
import {
  SettingsLoadedBroadcaster,
  toWorkspaceScopePayload,
} from "./settings-loaded-broadcaster";
import {
  type LocalModelsWarmupRunner,
  type LocalModelsWarmupScheduler,
  scheduleSettingsLocalModelsWarmup,
} from "./settings-local-models-warmup-scheduler";
import { SettingsPersistenceService } from "./settings-persistence-service";
import {
  resolveLocalizationRuntimeSettings,
  type WorkspaceSettingsScope,
} from "./settings-persistence-snapshot";
import { SettingsProviderVersionService } from "./settings-provider-version-service";
import { SettingsSavedBroadcaster } from "./settings-saved-broadcaster";

export { resolveLocalizationRuntimeSettings } from "./settings-persistence-snapshot";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const createScopedCoreLocalizationFacade = (
  config: CoreConfig,
  workspace?: WorkspaceSettingsScope
): LocalizationFacade =>
  createCoreLocalizationFacade({
    config: workspace
      ? {
          ...config,
          claudeProjectSlug: workspace.workspaceSlug,
          claudeWorkspacePath: workspace.workspaceRoot,
        }
      : config,
  });

const createGlobalUserGlossaryStore = (config: CoreConfig): UserGlossaryStore =>
  new UserGlossaryStore({
    glossaryDirectory: resolveLocalizationPaths({
      rootDirectory: resolveGlobalLocalizationRootPath(config),
    }).glossaryDirectory,
  });

const APPLE_NATIVE_TRANSLATION_ENGINE_ID = "apple-native";
const APPLE_NATIVE_PREFLIGHT_TIMEOUT_MS = 20_000;
const APPLE_NATIVE_HELPER_RELATIVE_PATH = [
  "native",
  "apple-translation-helper",
  ".build",
  "release",
  "apple-translation-helper",
] as const;
interface AppleNativePreflightTarget {
  readonly sourceLanguage: string;
  readonly targetLanguage?: string;
}

interface AppleNativePreflightResponse {
  readonly diagnostic?: string;
  readonly errorCode?: string;
  readonly message?: string;
  readonly ok?: boolean;
  readonly userMessageCode?: string;
}

type LocalizationFacadeFactory = (
  workspace?: WorkspaceSettingsScope
) => LocalizationFacade;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeSettingsString = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

const normalizeAppleNativeLanguage = (value: unknown): string => {
  const normalized = normalizeSettingsString(value, "en");
  return normalized.toLowerCase() === "source" ? "en" : normalized;
};

const isExecutableFile = (path: string): boolean => {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
};

const resolveAppleNativeHelperPath = (): string | null => {
  const candidates = [
    ...(process.env.CODEAI_APPLE_TRANSLATION_HELPER_PATH
      ? [process.env.CODEAI_APPLE_TRANSLATION_HELPER_PATH]
      : []),
    ...(process.argv[1]
      ? [
          join(
            dirname(process.argv[1]),
            "..",
            ...APPLE_NATIVE_HELPER_RELATIVE_PATH
          ),
        ]
      : []),
    join(process.cwd(), ...APPLE_NATIVE_HELPER_RELATIVE_PATH),
  ];
  return candidates.find(isExecutableFile) ?? null;
};

const collectAppleNativePreflightTargets = (
  settings: unknown
): readonly AppleNativePreflightTarget[] => {
  if (!(isRecord(settings) && isRecord(settings.general))) {
    return [];
  }
  const localization = isRecord(settings.general.localization)
    ? settings.general.localization
    : {};
  const categories = isRecord(localization.categories)
    ? localization.categories
    : {};
  const uiEngineId =
    normalizeSettingsString(localization.uiEngineId) ||
    normalizeSettingsString(localization.engineId);
  const targets = new Set<string>();

  if (uiEngineId === APPLE_NATIVE_TRANSLATION_ENGINE_ID) {
    for (const key of [
      "artifactsForTheUser",
      "interactiveTemplates",
      "messagesForTheUser",
      "systemFeedback",
      "uiHelperText",
      "uiInterface",
      "uiLabels",
      "userGuidance",
      "workflowTerms",
    ]) {
      const language = normalizeAppleNativeLanguage(categories[key]);
      if (language.toLowerCase() !== "en") {
        targets.add(language);
      }
    }
  }
  if (uiEngineId === APPLE_NATIVE_TRANSLATION_ENGINE_ID) {
    return targets.size > 0
      ? [...targets].map((targetLanguage) => ({
          sourceLanguage: "en",
          targetLanguage,
        }))
      : [{ sourceLanguage: "en" }];
  }
  return [];
};

const parseAppleNativePreflightResponse = (
  stdout: string
): AppleNativePreflightResponse | null => {
  for (const line of stdout.split("\n").reverse()) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) {
      continue;
    }
    try {
      return JSON.parse(trimmed) as AppleNativePreflightResponse;
    } catch {
      return null;
    }
  }
  return null;
};

const resolveAppleNativeReadinessMessage = (
  response: AppleNativePreflightResponse
): string => {
  if (response.userMessageCode === "apple_native_language_pack_missing") {
    return "Download the selected languages in System Settings -> General -> Language & Region -> Translation Languages, enable On-Device Mode, then recheck.";
  }
  if (response.userMessageCode === "apple_native_language_pair_unsupported") {
    return "Apple Translation does not support this source and target language pair. Choose another language or engine.";
  }
  if (response.userMessageCode === "apple_native_requires_xcode") {
    return "Install Xcode 26 or newer, open it once to finish setup, then recheck Apple Native Translation.";
  }
  if (response.userMessageCode === "apple_native_helper_failed") {
    return response.diagnostic ?? "Apple Native Translation helper failed.";
  }
  return response.message ?? "Apple Native Translation is not ready.";
};

const runAppleNativePreflight = (
  helperPath: string,
  target: AppleNativePreflightTarget
): Promise<AppleNativePreflightResponse> =>
  new Promise<AppleNativePreflightResponse>((resolveResult, reject) => {
    const child = spawn(helperPath, { stdio: ["pipe", "pipe", "pipe"] });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Apple Native Translation helper timed out."));
    }, APPLE_NATIVE_PREFLIGHT_TIMEOUT_MS);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", () => {
      clearTimeout(timeout);
      const parsed = parseAppleNativePreflightResponse(stdout);
      if (parsed) {
        resolveResult(parsed);
        return;
      }
      reject(
        new Error(
          `Apple Native Translation helper did not return JSON: ${stderr.trim()}`
        )
      );
    });
    child.stdin.end(
      JSON.stringify({
        command: "preflight",
        sourceLanguage: target.sourceLanguage,
        targetLanguage: target.targetLanguage,
      })
    );
  });

const assertAppleNativeSettingsReady = async (
  settings: unknown
): Promise<void> => {
  const targets = collectAppleNativePreflightTargets(settings);
  if (targets.length === 0) {
    return;
  }
  if (process.platform !== "darwin") {
    throw new Error(
      "Apple Native Translation is available only on macOS. Choose another translation engine on this device."
    );
  }

  const helperPath = resolveAppleNativeHelperPath();
  if (!helperPath) {
    throw new Error(
      "Build or install the Apple Native Translation helper, then recheck this engine."
    );
  }
  for (const target of targets) {
    const response = await runAppleNativePreflight(helperPath, target);
    if (response.ok !== true) {
      throw new Error(resolveAppleNativeReadinessMessage(response));
    }
  }
};

export class SettingsRequestHandler {
  private readonly broadcaster: (event: BridgeEvent) => void;
  private readonly config: CoreConfig;
  private readonly createLocalizationFacade: LocalizationFacadeFactory;
  private readonly defaultWorkspace: WorkspaceSettingsScope;
  private readonly logger: Logger;
  private readonly providerRegistry?: KimiReconfigureRegistry;
  private readonly scheduleLocalModelsWarmup?: LocalModelsWarmupScheduler;
  private readonly sessionManager?: KimiReconfigureSessionManager;
  private readonly settingsPersistenceService: SettingsPersistenceService;
  private readonly settingsProviderVersionService: SettingsProviderVersionService;
  private readonly templateSyncFacade: TemplateSyncFacade;
  private readonly warmSelectedLocalModels?: LocalModelsWarmupRunner;

  constructor(options: {
    readonly broadcaster: (event: BridgeEvent) => void;
    readonly config: CoreConfig;
    readonly createLocalizationFacade?: LocalizationFacadeFactory;
    readonly logger: Logger;
    readonly providerRegistry?: KimiReconfigureRegistry;
    readonly scheduleLocalModelsWarmup?: LocalModelsWarmupScheduler;
    readonly sessionManager?: KimiReconfigureSessionManager;
    readonly warmSelectedLocalModels?: LocalModelsWarmupRunner;
  }) {
    this.broadcaster = options.broadcaster;
    this.config = options.config;
    this.createLocalizationFacade =
      options.createLocalizationFacade ??
      ((workspace) =>
        createScopedCoreLocalizationFacade(options.config, workspace));
    this.defaultWorkspace = {
      workspaceRoot: options.config.claudeWorkspacePath ?? process.cwd(),
      workspaceSlug: options.config.claudeProjectSlug,
    };
    this.logger = options.logger;
    this.providerRegistry = options.providerRegistry;
    this.scheduleLocalModelsWarmup = options.scheduleLocalModelsWarmup;
    this.sessionManager = options.sessionManager;
    this.settingsPersistenceService = new SettingsPersistenceService({
      config: options.config,
      logger: options.logger,
    });
    this.settingsProviderVersionService = new SettingsProviderVersionService();
    this.templateSyncFacade = new TemplateSyncFacade(options.logger);
    this.warmSelectedLocalModels = options.warmSelectedLocalModels;
  }

  async handleSave(
    settings: unknown,
    workspace?: WorkspaceSettingsScope
  ): Promise<void> {
    try {
      const result = await this.settingsPersistenceService.save(settings, {
        workspace,
      });
      let syncFailureMessage: string | null = null;
      try {
        await assertAppleNativeSettingsReady(settings);
      } catch (error) {
        syncFailureMessage = toErrorMessage(error);
        this.logger.warn("Settings saved but localization preflight failed", {
          error: syncFailureMessage,
        });
      }
      await new SettingsSavedBroadcaster({
        broadcaster: this.broadcaster,
        localizationFacade: this.createLocalizationFacade(workspace),
      }).publish(result, workspace, { syncFailureMessage });
      await reconcileKimiThinkingEnabled(
        settings,
        this.providerRegistry,
        this.sessionManager
      );
      scheduleSettingsLocalModelsWarmup({
        config: this.config,
        logger: this.logger,
        scheduleLocalModelsWarmup: this.scheduleLocalModelsWarmup,
        warmSelectedLocalModels: this.warmSelectedLocalModels,
        workspace,
      });
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to save settings", { error: reason });
      this.broadcastSaveError(reason, workspace);
    }
  }

  async handleReset(workspace?: WorkspaceSettingsScope): Promise<void> {
    try {
      const result = await this.settingsPersistenceService.reset({
        workspace,
      });
      await new SettingsSavedBroadcaster({
        broadcaster: this.broadcaster,
        localizationFacade: this.createLocalizationFacade(workspace),
      }).publish(result, workspace);
      await reconcileKimiThinkingEnabled(
        result.settings,
        this.providerRegistry,
        this.sessionManager
      );
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to reset settings", { error: reason });
      this.broadcastSaveError(reason, workspace);
    }
  }

  async handleLoad(workspace?: WorkspaceSettingsScope): Promise<void> {
    const settings = await this.settingsPersistenceService.load({ workspace });
    await new SettingsLoadedBroadcaster({
      broadcaster: this.broadcaster,
      localizationFacade: this.createLocalizationFacade(workspace),
      resolveRuntimeSettings: resolveLocalizationRuntimeSettings,
    }).publish(settings, workspace);
    scheduleSettingsLocalModelsWarmup({
      config: this.config,
      logger: this.logger,
      scheduleLocalModelsWarmup: this.scheduleLocalModelsWarmup,
      warmSelectedLocalModels: this.warmSelectedLocalModels,
      workspace,
    });
  }

  async handleLoadVersions(): Promise<void> {
    try {
      this.broadcastVersions(
        await this.settingsProviderVersionService.loadSnapshot()
      );
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to load provider versions", { error: reason });
      this.broadcastVersionsError(reason);
    }
  }

  private broadcastSaveError(
    error: string,
    workspace?: WorkspaceSettingsScope
  ): void {
    this.broadcaster({
      type: "settings:save-error",
      payload: { error, ...toWorkspaceScopePayload(workspace) },
    });
  }

  private broadcastVersionsError(error: string): void {
    this.broadcaster({
      type: "settings:versions",
      payload: { error, versions: undefined },
    });
  }

  async handleUpdateProvider(
    provider: "claude" | "codex" | "gemini",
    target: "cli" | "core" | "sdk"
  ): Promise<void> {
    try {
      this.broadcastVersions(
        await this.settingsProviderVersionService.updateTarget(provider, target)
      );
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to update provider target", {
        error: reason,
        provider,
        target,
      });
      this.broadcastVersionsError(reason);
    }
  }

  async handleOpenUserGlossaryFile(
    _workspace: WorkspaceSettingsScope = this.defaultWorkspace
  ): Promise<void> {
    try {
      this.broadcastUserGlossaryFile(
        await createGlobalUserGlossaryStore(
          this.config
        ).ensureEditableGlossaryFile()
      );
    } catch (error) {
      this.broadcastUserGlossaryFileError(toErrorMessage(error));
    }
  }

  async handleListTemplateUpdates(): Promise<void> {
    try {
      this.broadcastTemplateUpdates(
        await this.templateSyncFacade.listPendingUpdates()
      );
    } catch (error) {
      this.broadcastTemplateUpdatesError(toErrorMessage(error));
    }
  }

  async handleResolveTemplateUpdate(
    request: TemplateUpdateResolutionRequest
  ): Promise<void> {
    try {
      this.broadcaster({
        type: "settings:template-update:resolve:result",
        payload: await this.templateSyncFacade.resolvePendingUpdate(request),
      });
    } catch (error) {
      this.broadcaster({
        type: "settings:template-update:resolve:result",
        payload: {
          action: request.action,
          id: request.id,
          pendingUpdates: [],
          status: "error",
          error: toErrorMessage(error),
        },
      });
    }
  }

  private broadcastVersions(versions: unknown): void {
    this.broadcaster({
      type: "settings:versions",
      payload: { versions },
    });
  }

  private broadcastUserGlossaryFile(path: string): void {
    this.broadcaster({
      type: "settings:user-glossary-file",
      payload: { path },
    });
  }

  private broadcastUserGlossaryFileError(error: string): void {
    this.broadcaster({
      type: "settings:user-glossary-file",
      payload: { error, path: null },
    });
  }

  private broadcastTemplateUpdates(
    updates: readonly PendingTemplateUpdate[]
  ): void {
    this.broadcaster({
      type: "settings:template-updates:result",
      payload: { updates },
    });
  }

  private broadcastTemplateUpdatesError(error: string): void {
    this.broadcaster({
      type: "settings:template-updates:result",
      payload: { error, updates: [] },
    });
  }
}
