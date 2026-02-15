import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContinuityChain, ContinuityStageId } from "./continuity-types";

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const INDEX_FILE_NAME = "index.json";

export type ContinuityIndexEntry = {
  readonly stage: ContinuityStageId;
  readonly rootSessionId: string;
  readonly dialogId: string;
  readonly updatedAt: string;
  /**
   * Core session id of the latest continuity segment (best-effort).
   * Used by clients to bind runtime status/lock/usage to the correct session id,
   * while loading messages by `dialogId`.
   */
  readonly latestSessionId?: string | null;
  readonly providerId: string | null;
  readonly providerSessionId: string | null;
};

export type ContinuityIndex = {
  readonly version: 1;
  readonly workspaceSlug: string;
  readonly updatedAt: string;
  readonly entries: readonly ContinuityIndexEntry[];
};

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

export class ContinuityIndexRegistry {
  private readonly workspaceRoot: string;
  private readonly workspaceSlug: string;
  private readonly clock: () => string;

  constructor(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly clock?: () => string;
  }) {
    this.workspaceRoot = options.workspaceRoot;
    this.workspaceSlug = options.workspaceSlug;
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  async upsertFromChain(chain: ContinuityChain): Promise<void> {
    const indexPath = buildIndexPath({
      workspaceRoot: this.workspaceRoot,
      workspaceSlug: this.workspaceSlug,
    });

    const existing = await readJson<ContinuityIndex>(indexPath);
    const entry = this.buildEntry(chain);
    const nextEntries = this.mergeEntry(existing?.entries ?? [], entry);

    const next: ContinuityIndex = {
      version: 1,
      workspaceSlug: this.workspaceSlug,
      updatedAt: this.clock(),
      entries: nextEntries,
    };

    await writeJson(indexPath, next);
  }

  private buildEntry(chain: ContinuityChain): ContinuityIndexEntry {
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
  }

  private mergeEntry(
    existing: readonly ContinuityIndexEntry[],
    entry: ContinuityIndexEntry
  ): ContinuityIndexEntry[] {
    const merged: ContinuityIndexEntry[] = [];
    let replaced = false;
    for (const current of existing) {
      if (
        current.stage === entry.stage &&
        current.rootSessionId === entry.rootSessionId
      ) {
        merged.push(entry);
        replaced = true;
      } else {
        merged.push(current);
      }
    }
    if (!replaced) {
      merged.push(entry);
    }
    merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return merged;
  }
}
