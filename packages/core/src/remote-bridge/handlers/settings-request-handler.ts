import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const LEGACY_CODEX_GENERAL_MODEL_ID = "gpt-5.2";
const CURRENT_CODEX_GENERAL_MODEL_ID = "gpt-5.4";

const DEFAULT_SETTINGS_SNAPSHOT = {
  general: {
    coreControls: {
      allowRestart: true,
    },
  },
  providers: {
    claude: {
      thinking: {
        enabled: false,
        maxTokens: 4000,
      },
      autoUpdate: { enabled: true },
      defaultModel: "sonnet",
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    codex: {
      autoUpdate: { enabled: true },
      defaultModel: "gpt-5.3-codex",
      reasoningByModel: {
        "gpt-5.3-codex": "medium",
      },
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    gemini: {
      autoUpdate: { enabled: true },
      defaultModel: "gemini-3-pro-preview",
      thinkingLevelByModel: {},
      sessionContinuity: {
        remainingPercentThreshold: 30,
        contextWindowTokenLimit: 300_000,
      },
    },
  },
} as const;

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const resolveErrorCode = (error: unknown): string | null => {
  if (!isRecord(error)) {
    return null;
  }
  const code = error.code;
  return typeof code === "string" ? code : null;
};

const buildDefaultSettingsSnapshot = (
  config: CoreConfig
): Record<string, unknown> => {
  const codexDefaultModel =
    config.codexDefaultModel ??
    DEFAULT_SETTINGS_SNAPSHOT.providers.codex.defaultModel;
  const codexDefaultReasoning =
    config.codexDefaultReasoningEffort ??
    (DEFAULT_SETTINGS_SNAPSHOT.providers.codex.reasoningByModel[
      DEFAULT_SETTINGS_SNAPSHOT.providers.codex.defaultModel
    ] as string);
  const remainingPercentThreshold =
    Number.isFinite(config.claudeContinuityRemainingPercentThreshold) &&
    config.claudeContinuityRemainingPercentThreshold > 0
      ? config.claudeContinuityRemainingPercentThreshold
      : DEFAULT_SETTINGS_SNAPSHOT.providers.claude.sessionContinuity
          .remainingPercentThreshold;
  const geminiDefaultModel =
    config.geminiDefaultModel ??
    DEFAULT_SETTINGS_SNAPSHOT.providers.gemini.defaultModel;

  return {
    ...DEFAULT_SETTINGS_SNAPSHOT,
    providers: {
      ...DEFAULT_SETTINGS_SNAPSHOT.providers,
      claude: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers.claude,
        defaultModel: config.claudeDefaultModel,
        sessionContinuity: { remainingPercentThreshold },
      },
      codex: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers.codex,
        defaultModel: codexDefaultModel,
        reasoningByModel: {
          ...DEFAULT_SETTINGS_SNAPSHOT.providers.codex.reasoningByModel,
          [codexDefaultModel]: codexDefaultReasoning,
        },
        sessionContinuity: { remainingPercentThreshold },
      },
      gemini: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers.gemini,
        defaultModel: geminiDefaultModel,
        sessionContinuity: {
          ...DEFAULT_SETTINGS_SNAPSHOT.providers.gemini.sessionContinuity,
          remainingPercentThreshold,
        },
      },
    },
  };
};

const migrateLegacyClaudeDefaultModel = (
  settings: Record<string, unknown>
): {
  readonly migrated: boolean;
  readonly settings: Record<string, unknown>;
} => {
  const providers = settings.providers;
  if (!isRecord(providers)) {
    return { migrated: false, settings };
  }

  const claude = providers.claude;
  if (!isRecord(claude)) {
    return { migrated: false, settings };
  }

  // We no longer persist "default". Migrate legacy configs to "sonnet".
  if (claude.defaultModel !== "default") {
    return { migrated: false, settings };
  }

  return {
    migrated: true,
    settings: {
      ...settings,
      providers: {
        ...providers,
        claude: {
          ...claude,
          defaultModel: "sonnet",
        },
      },
    },
  };
};

const migrateLegacyCodexGeneralModel = (
  settings: Record<string, unknown>
): {
  readonly migrated: boolean;
  readonly settings: Record<string, unknown>;
} => {
  const providers = settings.providers;
  if (!isRecord(providers)) {
    return { migrated: false, settings };
  }

  const codex = providers.codex;
  if (!isRecord(codex)) {
    return { migrated: false, settings };
  }

  let migrated = false;
  const nextCodex: Record<string, unknown> = { ...codex };

  if (codex.defaultModel === LEGACY_CODEX_GENERAL_MODEL_ID) {
    nextCodex.defaultModel = CURRENT_CODEX_GENERAL_MODEL_ID;
    migrated = true;
  }

  if (isRecord(codex.reasoningByModel)) {
    const nextReasoningByModel = {
      ...codex.reasoningByModel,
    } as Record<string, unknown>;

    if (
      !(CURRENT_CODEX_GENERAL_MODEL_ID in nextReasoningByModel) &&
      LEGACY_CODEX_GENERAL_MODEL_ID in nextReasoningByModel
    ) {
      nextReasoningByModel[CURRENT_CODEX_GENERAL_MODEL_ID] =
        nextReasoningByModel[LEGACY_CODEX_GENERAL_MODEL_ID];
      migrated = true;
    }

    if (LEGACY_CODEX_GENERAL_MODEL_ID in nextReasoningByModel) {
      delete nextReasoningByModel[LEGACY_CODEX_GENERAL_MODEL_ID];
      migrated = true;
    }

    nextCodex.reasoningByModel = nextReasoningByModel;
  }

  if (!migrated) {
    return { migrated: false, settings };
  }

  return {
    migrated: true,
    settings: {
      ...settings,
      providers: {
        ...providers,
        codex: nextCodex,
      },
    },
  };
};

const persistDefaultSettingsSnapshot = async (
  settingsPath: string,
  snapshot: Record<string, unknown>
): Promise<void> => {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8"
  );
};

export class SettingsRequestHandler {
  private readonly config: CoreConfig;
  private readonly logger: Logger;
  private readonly broadcaster: (event: BridgeEvent) => void;

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
    readonly broadcaster: (event: BridgeEvent) => void;
  }) {
    this.config = options.config;
    this.logger = options.logger;
    this.broadcaster = options.broadcaster;
  }

  async handleLoad(): Promise<void> {
    const settingsPath = this.config.claudeSettingsPath;
    try {
      const raw = await readFile(settingsPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const baseSettings = isRecord(parsed)
        ? parsed
        : buildDefaultSettingsSnapshot(this.config);
      const { migrated: migratedClaude, settings: afterClaudeMigration } =
        migrateLegacyClaudeDefaultModel(baseSettings);
      const { migrated: migratedCodex, settings } =
        migrateLegacyCodexGeneralModel(afterClaudeMigration);

      if (migratedClaude || migratedCodex) {
        try {
          await persistDefaultSettingsSnapshot(settingsPath, settings);
        } catch (persistError) {
          this.logger.warn("Failed to persist settings migration", {
            settingsPath,
            error: toErrorMessage(persistError),
          });
        }
      }

      this.broadcaster({
        type: "settings:loaded",
        payload: {
          settings,
          error: null,
        },
      });
    } catch (error: unknown) {
      const code = resolveErrorCode(error);
      const message = toErrorMessage(error);
      const label = code ? `${code}: ${message}` : message;

      this.logger.warn("Failed to load settings", {
        settingsPath,
        error: label,
      });

      const snapshot = buildDefaultSettingsSnapshot(this.config);
      if (code === "ENOENT") {
        try {
          await persistDefaultSettingsSnapshot(settingsPath, snapshot);
        } catch (persistError) {
          this.logger.warn("Failed to persist default settings", {
            settingsPath,
            error: toErrorMessage(persistError),
          });
        }
      }

      this.broadcaster({
        type: "settings:loaded",
        payload: {
          settings: snapshot,
          error: null,
        },
      });
    }
  }
}
