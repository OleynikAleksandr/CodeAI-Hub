import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { CliArgs } from "@google/gemini-cli/dist/src/config/config";
import type { AuthType as AuthTypeEnum } from "@google/gemini-cli-core/dist/src/core/contentGenerator";
import type { GeminiCliModules } from "../runtime/cli-types";
import type { SessionCreationOptions } from "./types";

const DEFAULT_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 300_000;
const MIN_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 10_000;
const MAX_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT = 1_000_000;

export interface GeminiSettingsSnapshot {
  readonly providers?: {
    readonly gemini?: {
      readonly defaultModel?: unknown;
      readonly thinkingLevelByModel?: Record<string, unknown>;
      readonly sessionContinuity?: {
        readonly contextWindowTokenLimit?: unknown;
        readonly remainingPercentThreshold?: unknown;
      };
    };
  };
}

type LoadedGeminiSettings = ReturnType<
  GeminiCliModules["settings"]["loadSettings"]
>;

export interface ResolvedGeminiSessionSettings {
  readonly argv: CliArgs;
  readonly authType: AuthTypeEnum;
  readonly contextWindowTokenLimit: number;
  readonly resolvedModel?: string;
  readonly resolvedThinkingLevel?: string;
  readonly settings: LoadedGeminiSettings;
}

export class GeminiSessionSettingsResolver {
  private readonly modules: GeminiCliModules;

  constructor(modules: GeminiCliModules) {
    this.modules = modules;
  }

  resolve(
    options: SessionCreationOptions,
    requestedResumeSessionId?: string
  ): ResolvedGeminiSessionSettings {
    const settings = this.modules.settings.loadSettings(options.workspacePath);
    const migrateDeprecatedSettings = this.modules.settings
      .migrateDeprecatedSettings as unknown;
    if (typeof migrateDeprecatedSettings === "function") {
      (
        migrateDeprecatedSettings as (
          loadedSettings: unknown,
          extensionManager?: unknown
        ) => void
      )(settings, {
        disableExtension: async () => {
          /* noop */
        },
      });
    }

    const settingsSnapshot = this.loadSettingsSnapshot(options.settingsPath);
    const defaultModelOverride =
      this.resolveDefaultModelFromSnapshot(settingsSnapshot);
    const resolvedModel = defaultModelOverride ?? options.defaultModel;
    const thinkingLevelOverride = resolvedModel
      ? this.resolveThinkingLevelFromSnapshot(settingsSnapshot, resolvedModel)
      : undefined;
    const resolvedThinkingLevel =
      thinkingLevelOverride ?? options.thinkingLevel;

    return {
      argv: this.createArgv({
        ...options,
        resumeSessionId: requestedResumeSessionId,
        defaultModel: resolvedModel,
        thinkingLevel: resolvedThinkingLevel,
      }),
      authType: this.resolveAuthType(
        settings.merged?.security?.auth?.selectedType
      ),
      contextWindowTokenLimit:
        this.resolveContextWindowTokenLimitFromSnapshot(settingsSnapshot),
      resolvedModel,
      resolvedThinkingLevel,
      settings,
    };
  }

  private clampContextWindowTokenLimit(value: number): number {
    return Math.min(
      MAX_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT,
      Math.max(MIN_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT, value)
    );
  }

  private createArgv(options: SessionCreationOptions): CliArgs {
    const includeDirectories = Array.from(
      new Set(
        [
          path.join(homedir(), ".codeai-hub", "templates"),
          options.workspacePath,
        ].map((directory) => path.resolve(directory))
      )
    );
    return {
      query: undefined,
      model: options.defaultModel,
      sandbox: undefined,
      debug: options.logger !== undefined,
      prompt: undefined,
      promptInteractive: undefined,
      yolo: true,
      approvalMode: "yolo",
      allowedMcpServerNames: undefined,
      allowedTools: undefined,
      experimentalAcp: false,
      extensions: undefined,
      listExtensions: false,
      resume: options.resumeSessionId,
      listSessions: false,
      deleteSession: undefined,
      includeDirectories,
      screenReader: undefined,
      useSmartEdit: undefined,
      useWriteTodos: undefined,
      outputFormat: "json",
      fakeResponses: undefined,
      recordResponses: undefined,
      thinkingLevel: options.thinkingLevel,
      // biome-ignore lint/suspicious/noExplicitAny: custom property thinkingLevel
    } as any as CliArgs;
  }

  private loadSettingsSnapshot(
    settingsPath?: string
  ): GeminiSettingsSnapshot | null {
    if (!settingsPath) {
      return null;
    }
    try {
      const raw = readFileSync(settingsPath, "utf8");
      return JSON.parse(raw) as GeminiSettingsSnapshot;
    } catch {
      return null;
    }
  }

  private resolveAuthType(selected?: string): AuthTypeEnum {
    const { AuthType } = this.modules.contentGenerator;
    switch (selected) {
      case AuthType.LOGIN_WITH_GOOGLE:
      case "oauth-personal":
      case "login_with_google":
        return AuthType.LOGIN_WITH_GOOGLE;
      case AuthType.USE_GEMINI:
      case "gemini-api-key":
        return AuthType.USE_GEMINI;
      case AuthType.USE_VERTEX_AI:
      case "vertex-ai":
        return AuthType.USE_VERTEX_AI;
      case AuthType.LEGACY_CLOUD_SHELL:
      case "cloud-shell":
        return AuthType.LEGACY_CLOUD_SHELL;
      default:
        return AuthType.LOGIN_WITH_GOOGLE;
    }
  }

  private resolveContextWindowTokenLimitFromSnapshot(
    snapshot: GeminiSettingsSnapshot | null
  ): number {
    const raw =
      snapshot?.providers?.gemini?.sessionContinuity?.contextWindowTokenLimit;
    const numeric = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_GEMINI_CONTEXT_WINDOW_TOKEN_LIMIT;
    }
    return this.clampContextWindowTokenLimit(numeric);
  }

  private resolveDefaultModelFromSnapshot(
    snapshot: GeminiSettingsSnapshot | null
  ): string | undefined {
    const candidate = snapshot?.providers?.gemini?.defaultModel;

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }

    return;
  }

  private resolveThinkingLevelFromSnapshot(
    snapshot: GeminiSettingsSnapshot | null,
    modelId: string
  ): string | undefined {
    const candidate =
      snapshot?.providers?.gemini?.thinkingLevelByModel?.[modelId];

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }

    return;
  }
}
