import { readFile } from "node:fs/promises";
import {
  type RolloutResolverOptions,
  resolveRolloutFilePath,
} from "../token-usage/codex-token-usage-resolver";
import {
  type CodexUsageLimitsSnapshot,
  extractLatestUsageLimitsFromRollout,
} from "./codex-usage-limits-snapshot";

const MIN_REFRESH_INTERVAL_MS = 1500;

const readJsonlFile = async (filePath: string): Promise<unknown[]> => {
  try {
    const content = await readFile(filePath, "utf8");
    return content
      .split(/\r?\n/g)
      .filter((line) => line.trim().startsWith("{"))
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter((item): item is unknown => item !== null);
  } catch {
    return [];
  }
};

export type CodexUsageLimitsReaderOptions = RolloutResolverOptions & {
  readonly minRefreshIntervalMs?: number;
};

export class CodexUsageLimitsReader {
  private readonly options: CodexUsageLimitsReaderOptions;
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly lastAttemptAt = new Map<string, number>();
  private readonly lastKnownSnapshots = new Map<
    string,
    CodexUsageLimitsSnapshot
  >();

  constructor(options?: CodexUsageLimitsReaderOptions) {
    this.options = options ?? {};
  }

  async read(payload: {
    readonly providerSessionId: string;
    readonly force?: boolean;
  }): Promise<CodexUsageLimitsSnapshot | null> {
    const { providerSessionId, force = false } = payload;
    const minRefreshIntervalMs =
      this.options.minRefreshIntervalMs ?? MIN_REFRESH_INTERVAL_MS;

    if (!force) {
      const lastAttempt = this.lastAttemptAt.get(providerSessionId);
      const now = Date.now();
      if (lastAttempt && now - lastAttempt < minRefreshIntervalMs) {
        return this.getCachedSnapshot(providerSessionId);
      }
      this.lastAttemptAt.set(providerSessionId, now);
    }

    const existingRead = this.inFlight.get(providerSessionId);
    if (existingRead) {
      if (force) {
        await existingRead;
      }
      return this.getCachedSnapshot(providerSessionId);
    }

    const readPromise = this.performRead(providerSessionId);
    this.inFlight.set(providerSessionId, readPromise);
    try {
      await readPromise;
      return this.getCachedSnapshot(providerSessionId);
    } finally {
      this.inFlight.delete(providerSessionId);
    }
  }

  getCachedSnapshot(
    providerSessionId: string
  ): CodexUsageLimitsSnapshot | null {
    return this.lastKnownSnapshots.get(providerSessionId) ?? null;
  }

  clearCache(providerSessionId: string): void {
    this.lastKnownSnapshots.delete(providerSessionId);
    this.lastAttemptAt.delete(providerSessionId);
  }

  private async performRead(providerSessionId: string): Promise<void> {
    const filePath = await resolveRolloutFilePath(providerSessionId, {
      codexHome: this.options.codexHome,
    });
    if (!filePath) {
      return;
    }

    const events = await readJsonlFile(filePath);
    const snapshot = extractLatestUsageLimitsFromRollout(events);
    if (snapshot) {
      this.lastKnownSnapshots.set(providerSessionId, snapshot);
    }
  }
}
