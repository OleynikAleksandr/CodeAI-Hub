import { existsSync } from "node:fs";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type {
  ContinuityChain,
  ContinuityChainSummary,
  ContinuitySegment,
} from "./continuity-types";
import { normalizeContinuityStageId } from "./continuity-types";
import { ContinuityIndexRegistry } from "./index-registry";

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const CHAIN_FILE_NAME = "chain.json";
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

const buildContinuityChainPath = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stage: string | null | undefined;
  readonly rootSessionId: string;
}): string =>
  path.join(
    options.workspaceRoot,
    CONTINUITY_ROOT,
    options.workspaceSlug,
    CONTINUITY_DIR,
    normalizeContinuityStageId(options.stage),
    options.rootSessionId,
    CHAIN_FILE_NAME
  );

export const promoteContinuityChainRootIfPresent = async (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stage: string | null | undefined;
  readonly fromRootSessionId: string;
  readonly toRootSessionId: string;
}): Promise<boolean> => {
  const fromChainPath = buildContinuityChainPath({
    workspaceRoot: options.workspaceRoot,
    workspaceSlug: options.workspaceSlug,
    stage: options.stage,
    rootSessionId: options.fromRootSessionId,
  });
  const toChainPath = buildContinuityChainPath({
    workspaceRoot: options.workspaceRoot,
    workspaceSlug: options.workspaceSlug,
    stage: options.stage,
    rootSessionId: options.toRootSessionId,
  });

  const fromDir = path.dirname(fromChainPath);
  const toDir = path.dirname(toChainPath);
  if (!existsSync(fromDir) || existsSync(toDir)) {
    return false;
  }

  await mkdir(path.dirname(toDir), { recursive: true });
  await rename(fromDir, toDir);

  const migrated = await readJson<ContinuityChain>(toChainPath);
  if (!migrated) {
    return true;
  }
  if (
    migrated.rootSessionId === options.toRootSessionId &&
    migrated.dialogId === options.toRootSessionId
  ) {
    return true;
  }

  await writeJson(toChainPath, {
    ...migrated,
    rootSessionId: options.toRootSessionId,
    dialogId: options.toRootSessionId,
  } satisfies ContinuityChain);
  return true;
};

const createChain = (options: {
  readonly rootSessionId: string;
  readonly workspaceSlug: string;
  readonly stage: string | null | undefined;
  readonly timestamp: string;
}): ContinuityChain => ({
  rootSessionId: options.rootSessionId,
  // Backward compatible: dialogId is the stable UI key. For now we default it to
  // rootSessionId (legacy meaning), and let readers fall back when it's missing.
  dialogId: options.rootSessionId,
  workspaceSlug: options.workspaceSlug,
  stage: normalizeContinuityStageId(options.stage),
  segments: [],
  updatedAt: options.timestamp,
});

export class ContinuityChainStore {
  private readonly workspaceRoot: string;
  private readonly workspaceSlug: string;
  private readonly rootSessionId: string;
  private readonly stage: string | null | undefined;
  private readonly clock: () => string;
  private readonly index: ContinuityIndexRegistry;

  constructor(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly rootSessionId: string;
    readonly stage?: string | null;
    readonly clock?: () => string;
  }) {
    this.workspaceRoot = options.workspaceRoot;
    this.workspaceSlug = options.workspaceSlug;
    this.rootSessionId = options.rootSessionId;
    this.stage = options.stage;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.index = new ContinuityIndexRegistry({
      workspaceRoot: options.workspaceRoot,
      workspaceSlug: options.workspaceSlug,
      clock: this.clock,
    });
  }

  read(): Promise<ContinuityChain | null> {
    const pathValue = this.buildPath();
    return readJson<ContinuityChain>(pathValue);
  }

  async save(chain: ContinuityChain): Promise<void> {
    await writeJson(this.buildPath(), chain);
    await this.index.upsertFromChain(chain);
  }

  async appendSegment(segment: ContinuitySegment): Promise<ContinuityChain> {
    const timestamp = this.clock();
    const existing =
      (await this.read()) ??
      createChain({
        rootSessionId: this.rootSessionId,
        workspaceSlug: this.workspaceSlug,
        stage: this.stage,
        timestamp,
      });

    const next: ContinuityChain = {
      ...existing,
      segments: [...existing.segments, segment],
      updatedAt: timestamp,
    };

    await this.save(next);
    return next;
  }

  private buildPath(): string {
    return buildContinuityChainPath({
      workspaceRoot: this.workspaceRoot,
      workspaceSlug: this.workspaceSlug,
      stage: this.stage,
      rootSessionId: this.rootSessionId,
    });
  }
}

const readDirectories = async (root: string) => {
  try {
    return await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
};

const collectChainPaths = async (root: string): Promise<readonly string[]> => {
  const entries = await readDirectories(root);
  const paths: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isFile() && entry.name === CHAIN_FILE_NAME) {
      paths.push(entryPath);
      continue;
    }
    if (entry.isDirectory()) {
      paths.push(...(await collectChainPaths(entryPath)));
    }
  }
  return paths;
};

export const readContinuityChains = async (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ContinuityChainSummary[]> => {
  const baseDir = path.join(
    options.workspaceRoot,
    CONTINUITY_ROOT,
    options.workspaceSlug,
    CONTINUITY_DIR
  );
  const chains: ContinuityChainSummary[] = [];

  for (const chainPath of await collectChainPaths(baseDir)) {
    const chain = await readJson<ContinuityChainSummary>(chainPath);
    if (!chain || chain.workspaceSlug !== options.workspaceSlug) {
      continue;
    }
    chains.push(chain);
  }

  return chains.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
};
