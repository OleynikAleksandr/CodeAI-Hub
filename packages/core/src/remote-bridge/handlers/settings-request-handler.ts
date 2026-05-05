import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  type LocalizationFacade,
  UserGlossaryStore,
} from "@codeai-hub/localization";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import { TemplateSyncFacade } from "../../templates/template-sync-facade";
import type {
  PendingTemplateUpdate,
  TemplateUpdateResolutionRequest,
} from "../../templates/template-update-resolution-service";
import { createCoreLocalizationFacade } from "../../translation/core-localization-facade-factory";
import type { BridgeEvent } from "../types";
import { SettingsLoadedBroadcaster } from "./settings-loaded-broadcaster";
import {
  SettingsPersistenceService,
  type SettingsWriteResult,
} from "./settings-persistence-service";
import { resolveLocalizationRuntimeSettings } from "./settings-persistence-snapshot";
import { SettingsProviderVersionService } from "./settings-provider-version-service";

export { resolveLocalizationRuntimeSettings } from "./settings-persistence-snapshot";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
  const reasoningEngineId = normalizeSettingsString(
    localization.reasoningEngineId
  );
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
  if (reasoningEngineId === APPLE_NATIVE_TRANSLATION_ENGINE_ID) {
    const language = normalizeAppleNativeLanguage(categories.reasoning);
    if (language.toLowerCase() !== "en") {
      targets.add(language);
    }
  }
  if (
    uiEngineId === APPLE_NATIVE_TRANSLATION_ENGINE_ID ||
    reasoningEngineId === APPLE_NATIVE_TRANSLATION_ENGINE_ID
  ) {
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
  private readonly localizationFacade: LocalizationFacade;
  private readonly logger: Logger;
  private readonly settingsLoadedBroadcaster: SettingsLoadedBroadcaster;
  private readonly settingsPersistenceService: SettingsPersistenceService;
  private readonly settingsProviderVersionService: SettingsProviderVersionService;
  private readonly templateSyncFacade: TemplateSyncFacade;

  constructor(options: {
    readonly broadcaster: (event: BridgeEvent) => void;
    readonly config: CoreConfig;
    readonly logger: Logger;
  }) {
    this.broadcaster = options.broadcaster;
    this.localizationFacade = createCoreLocalizationFacade({
      config: options.config,
    });
    this.logger = options.logger;
    this.settingsLoadedBroadcaster = new SettingsLoadedBroadcaster({
      broadcaster: options.broadcaster,
      localizationFacade: this.localizationFacade,
      resolveRuntimeSettings: resolveLocalizationRuntimeSettings,
    });
    this.settingsPersistenceService = new SettingsPersistenceService({
      config: options.config,
      logger: options.logger,
    });
    this.settingsProviderVersionService = new SettingsProviderVersionService();
    this.templateSyncFacade = new TemplateSyncFacade(options.logger);
  }

  async handleSave(settings: unknown): Promise<void> {
    try {
      await assertAppleNativeSettingsReady(settings);
      await this.publishSaved(
        await this.settingsPersistenceService.save(settings)
      );
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to save settings", { error: reason });
      this.broadcastSaveError(reason);
    }
  }

  async handleReset(): Promise<void> {
    try {
      await this.publishSaved(await this.settingsPersistenceService.reset());
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to reset settings", { error: reason });
      this.broadcastSaveError(reason);
    }
  }

  async handleLoad(): Promise<void> {
    await this.settingsLoadedBroadcaster.publish(
      await this.settingsPersistenceService.load()
    );
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

  private broadcastLocalizationSyncStatus(payload: {
    readonly busy: boolean;
    readonly message: string;
  }): void {
    this.broadcaster({
      type: "settings:localization-sync-status",
      payload,
    });
  }

  private broadcastSaveError(error: string): void {
    this.broadcaster({ type: "settings:save-error", payload: { error } });
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

  async handleOpenUserGlossaryFile(): Promise<void> {
    try {
      this.broadcastUserGlossaryFile(
        await new UserGlossaryStore().ensureEditableGlossaryFile()
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

  private async publishSaved(result: SettingsWriteResult): Promise<void> {
    if (result.syncMode === "strict") {
      this.broadcastLocalizationSyncStatus({
        busy: true,
        message:
          "Localization sync is running. Project Manager and new sessions stay blocked until translated interface bundles are ready.",
      });
    }

    try {
      const localizationRuntime =
        result.syncMode === "strict"
          ? await this.localizationFacade.synchronizeRuntimePayload(
              resolveLocalizationRuntimeSettings(result.settings),
              { affectedRuntimeBundleIds: result.affectedRuntimeBundleIds }
            )
          : await this.localizationFacade.resolveRuntimePayload(
              resolveLocalizationRuntimeSettings(result.settings)
            );

      this.broadcaster({
        type: "settings:saved",
        payload: {
          localizationRuntime,
          settings: result.settings,
        },
      });

      if (result.syncMode === "strict") {
        this.broadcastLocalizationSyncStatus({
          busy: false,
          message: "Localization sync completed.",
        });
      }
    } catch (error) {
      if (result.syncMode === "strict") {
        this.broadcastLocalizationSyncStatus({
          busy: false,
          message: `Localization sync failed: ${toErrorMessage(error)}`,
        });
      }
      throw error;
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
