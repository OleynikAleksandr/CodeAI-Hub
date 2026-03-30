import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ContinuityChain,
  ContinuityChainSummary,
  ContinuitySegment,
  ContinuityStageId,
} from "./continuity-types";
import { ContinuityIndexRegistry } from "./index-registry";

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const CHAIN_FILE_NAME = "chain.json";

const normalizeStage = (
  value: string | null | undefined
): ContinuityStageId => {
  if (!value || value.trim().length === 0) {
    return "unknown";
  }
  const trimmed = value.trim();
  if (
    trimmed === "description" ||
    trimmed === "virtual_simulation" ||
    trimmed === "diagram_modules"
  ) {
    return trimmed;
  }
  return "unknown";
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
    normalizeStage(options.stage),
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
  stage: normalizeStage(options.stage),
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
  const stageEntries = await readDirectories(baseDir);
  const chains: ContinuityChainSummary[] = [];

  for (const stageEntry of stageEntries) {
    if (!stageEntry.isDirectory()) {
      continue;
    }
    const stageDir = path.join(baseDir, stageEntry.name);
    const rootEntries = await readDirectories(stageDir);
    for (const rootEntry of rootEntries) {
      if (!rootEntry.isDirectory()) {
        continue;
      }
      const chainPath = path.join(stageDir, rootEntry.name, CHAIN_FILE_NAME);
      const chain = await readJson<ContinuityChainSummary>(chainPath);
      if (!chain || chain.workspaceSlug !== options.workspaceSlug) {
        continue;
      }
      chains.push(chain);
    }
  }

  return chains.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
};
