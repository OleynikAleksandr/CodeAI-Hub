import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SessionModelBinding } from "../session-model-binding";
import type { ContinuityChain, ContinuityStageId } from "./continuity-types";

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const INDEX_FILE_NAME = "index.json";
const TEMP_FILE_SUFFIX = ".tmp";
const NON_WHITESPACE_PATTERN = /\S/u;

const writeQueues = new Map<string, Promise<void>>();

interface JsonScanState {
  depth: number;
  escaped: boolean;
  inString: boolean;
}

const parseJson = <T>(content: string): T | null => {
  try {
    return JSON.parse(content) as T;
  } catch {
    const recovered = recoverJsonObjectPrefix(content);
    if (!recovered) {
      return null;
    }
    try {
      return JSON.parse(recovered) as T;
    } catch {
      return null;
    }
  }
};

const consumeJsonStringChar = (state: JsonScanState, char: string): void => {
  if (state.escaped) {
    state.escaped = false;
    return;
  }
  if (char === "\\") {
    state.escaped = true;
    return;
  }
  if (char === '"') {
    state.inString = false;
  }
};

const consumeJsonChar = (state: JsonScanState, char: string): void => {
  if (state.inString) {
    consumeJsonStringChar(state, char);
    return;
  }
  if (char === '"') {
    state.inString = true;
    return;
  }
  if (char === "{") {
    state.depth += 1;
    return;
  }
  if (char === "}") {
    state.depth -= 1;
  }
};

const recoverJsonObjectPrefix = (content: string): string | null => {
  const start = content.search(NON_WHITESPACE_PATTERN);
  if (start < 0 || content[start] !== "{") {
    return null;
  }

  const state: JsonScanState = {
    depth: 0,
    escaped: false,
    inString: false,
  };

  for (let index = start; index < content.length; index += 1) {
    consumeJsonChar(state, content[index]);
    if (state.depth === 0 && !state.inString) {
      return content.slice(start, index + 1);
    }
    if (state.depth < 0) {
      return null;
    }
  }

  return null;
};

export interface ContinuityIndexEntry {
  readonly dialogId: string;
  /**
   * Core session id of the latest continuity segment (best-effort).
   * Used by clients to bind runtime status/lock/usage to the correct session id,
   * while loading messages by `dialogId`.
   */
  readonly latestSessionId?: string | null;
  readonly modelBinding?: SessionModelBinding | null;
  readonly providerId: string | null;
  readonly providerSessionId: string | null;
  readonly rootSessionId: string;
  readonly stage: ContinuityStageId;
  readonly updatedAt: string;
}

export interface ContinuityIndex {
  readonly entries: readonly ContinuityIndexEntry[];
  readonly updatedAt: string;
  readonly version: 1;
  readonly workspaceSlug: string;
}

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return parseJson<T>(content);
  } catch {
    return null;
  }
};

const createTempPath = (filePath: string): string =>
  path.join(
    path.dirname(filePath),
    `${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}${TEMP_FILE_SUFFIX}`
  );

const writeJsonAtomic = async (
  filePath: string,
  value: unknown
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = createTempPath(filePath);
  try {
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
};

const writeJson = (filePath: string, value: unknown): Promise<void> => {
  const previous = writeQueues.get(filePath) ?? Promise.resolve();
  const next = previous.then(
    () => writeJsonAtomic(filePath, value),
    () => writeJsonAtomic(filePath, value)
  );
  let queued: Promise<void>;
  queued = next.finally(() => {
    if (writeQueues.get(filePath) === queued) {
      writeQueues.delete(filePath);
    }
  });
  writeQueues.set(filePath, queued);
  return next;
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
      modelBinding: last?.modelBinding ?? null,
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
