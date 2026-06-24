import { readFile, stat } from "node:fs/promises";
import type { CoreConfig } from "../../config";
import type { Session } from "../../session-manager";

const DEFAULT_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 30;
const MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 5;
const MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD = 80;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeContinuityThresholdPercent = (options: {
  readonly fallback: number;
  readonly raw: unknown;
}): number => {
  const numeric =
    typeof options.raw === "number" ? options.raw : Number(options.raw);
  if (!Number.isFinite(numeric)) {
    return clampNumber(
      options.fallback,
      MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
      MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD
    );
  }
  return clampNumber(
    numeric,
    MIN_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    MAX_CONTINUITY_REMAINING_PERCENT_THRESHOLD
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractContinuityThresholdPercentFromSettings = (options: {
  readonly fallback: number;
  readonly providerKey: "claude" | "codex";
  readonly settings: unknown;
}): number => {
  if (!isRecord(options.settings)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const providers = options.settings.providers;
  if (!isRecord(providers)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const provider = providers[options.providerKey];
  if (!isRecord(provider)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  const sessionContinuity = provider.sessionContinuity;
  if (!isRecord(sessionContinuity)) {
    return normalizeContinuityThresholdPercent({
      raw: undefined,
      fallback: options.fallback,
    });
  }
  return normalizeContinuityThresholdPercent({
    raw: sessionContinuity.remainingPercentThreshold,
    fallback: options.fallback,
  });
};

export class SessionRequestHandlerTurnThresholdResolver {
  private readonly config: CoreConfig;
  private settingsCache: {
    readonly mtimeMs: number;
    readonly settingsPath: string;
    readonly settings: unknown;
  } | null = null;

  constructor(config: CoreConfig) {
    this.config = config;
  }

  async resolveLiveContinuityRemainingPercentThreshold(
    session: Session
  ): Promise<number> {
    const providerKey = this.resolveSettingsProviderKey(session.providerId);
    const settings = await this.loadContinuitySettingsSnapshot(
      session.modelBinding?.settingsPath
    );
    return extractContinuityThresholdPercentFromSettings({
      settings,
      providerKey,
      fallback:
        this.config.claudeContinuityRemainingPercentThreshold ??
        DEFAULT_CONTINUITY_REMAINING_PERCENT_THRESHOLD,
    });
  }

  private resolveSettingsProviderKey(providerId: string): "claude" | "codex" {
    if (providerId.startsWith("codex")) {
      return "codex";
    }
    return "claude";
  }

  private async loadContinuitySettingsSnapshot(
    settingsPath: string | undefined
  ): Promise<unknown> {
    if (!settingsPath) {
      return null;
    }

    try {
      const fileStat = await stat(settingsPath);
      const mtimeMs = fileStat.mtimeMs;
      if (
        this.settingsCache &&
        this.settingsCache.settingsPath === settingsPath &&
        this.settingsCache.mtimeMs === mtimeMs
      ) {
        return this.settingsCache.settings;
      }

      const raw = await readFile(settingsPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      this.settingsCache = { mtimeMs, settings: parsed, settingsPath };
      return parsed;
    } catch {
      return null;
    }
  }
}
