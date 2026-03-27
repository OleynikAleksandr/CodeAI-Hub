import { readFile } from "node:fs/promises";
import { resolveRolloutFilePath } from "./codex-token-usage-resolver";
import {
  extractLatestSnapshotFromRollout,
  type TokenUsageSnapshot,
} from "./codex-token-usage-snapshot";

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

export interface TokenUsageReaderOptions {
  readonly codexHome?: string;
}

export class CodexTokenUsageReader {
  private readonly options: TokenUsageReaderOptions;
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly lastAttemptAt = new Map<string, number>();
  private readonly lastKnownSnapshots = new Map<string, TokenUsageSnapshot>();

  constructor(options?: TokenUsageReaderOptions) {
    this.options = options ?? {};
  }

  async read(payload: {
    readonly providerSessionId: string;
  }): Promise<TokenUsageSnapshot | null> {
    const { providerSessionId } = payload;

    // Throttling check
    const now = Date.now();
    const lastAttempt = this.lastAttemptAt.get(providerSessionId);
    if (lastAttempt && now - lastAttempt < MIN_REFRESH_INTERVAL_MS) {
      return null;
    }
    this.lastAttemptAt.set(providerSessionId, now);

    // In-flight lock check
    if (this.inFlight.has(providerSessionId)) {
      return null;
    }

    const readPromise = this.performRead(providerSessionId);
    this.inFlight.set(providerSessionId, readPromise);

    try {
      await readPromise;
      return this.getLastKnownSnapshot(providerSessionId);
    } catch {
      return null;
    }
  }

  private getLastKnownSnapshot(
    providerSessionId: string
  ): TokenUsageSnapshot | null {
    return this.lastKnownSnapshots.get(providerSessionId) ?? null;
  }

  private async performRead(providerSessionId: string): Promise<void> {
    try {
      const filePath = await resolveRolloutFilePath(providerSessionId, {
        codexHome: this.options.codexHome,
      });

      if (!filePath) {
        return;
      }

      const events = await readJsonlFile(filePath);
      const snapshot = extractLatestSnapshotFromRollout(events);

      if (snapshot) {
        this.lastKnownSnapshots.set(providerSessionId, snapshot);
      }
    } finally {
      this.inFlight.delete(providerSessionId);
    }
  }

  getCachedSnapshot(providerSessionId: string): TokenUsageSnapshot | null {
    return this.lastKnownSnapshots.get(providerSessionId) ?? null;
  }

  clearCache(providerSessionId: string): void {
    this.lastKnownSnapshots.delete(providerSessionId);
    this.lastAttemptAt.delete(providerSessionId);
  }
}
