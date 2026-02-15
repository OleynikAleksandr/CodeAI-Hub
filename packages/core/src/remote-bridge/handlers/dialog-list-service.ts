import { readFile } from "node:fs/promises";
import path from "node:path";
import { readContinuityChains } from "../../session-continuity/continuity-store";
import type {
  ContinuityIndex,
  ContinuityIndexEntry,
} from "../../session-continuity/index-registry";
import type { Logger } from "../../telemetry/logger";

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const INDEX_FILE_NAME = "index.json";

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const buildIndexPath = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    options.workspaceRoot,
    CONTINUITY_ROOT,
    options.workspaceSlug,
    CONTINUITY_DIR,
    INDEX_FILE_NAME
  );

export class DialogListService {
  private readonly logger: Logger;

  constructor(options: { readonly logger: Logger }) {
    this.logger = options.logger;
  }

  async listDialogs(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<readonly ContinuityIndexEntry[]> {
    const indexPath = buildIndexPath(options);
    const index = await readJson<ContinuityIndex>(indexPath);
    if (index && index.workspaceSlug === options.workspaceSlug) {
      const needsLatestSessionIdBackfill = index.entries.some((entry) => {
        const record = entry as unknown as Record<string, unknown>;
        return !("latestSessionId" in record);
      });
      if (!needsLatestSessionIdBackfill) {
        return index.entries;
      }
    }

    // Fallback: derive entries by scanning chain.json files.
    try {
      const chains = await readContinuityChains(options);
      return chains.map((chain) => {
        const last = chain.segments.at(-1) ?? null;
        return {
          stage: chain.stage,
          rootSessionId: chain.rootSessionId,
          dialogId: chain.dialogId ?? chain.rootSessionId,
          updatedAt: chain.updatedAt,
          latestSessionId: last?.sessionId ?? null,
          providerId: last?.providerId ?? null,
          providerSessionId: last?.providerSessionId ?? null,
        };
      });
    } catch (error: unknown) {
      this.logger.warn("Failed to derive continuity dialog index", {
        workspaceSlug: options.workspaceSlug,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
