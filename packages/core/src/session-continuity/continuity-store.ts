import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ContinuityChain,
  ContinuitySegment,
  ContinuityStageId,
} from "./continuity-types";

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
    trimmed === "diagram_modules" ||
    trimmed === "diagram_facades"
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

export const buildContinuityChainPath = (options: {
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

const createChain = (options: {
  readonly rootSessionId: string;
  readonly workspaceSlug: string;
  readonly stage: string | null | undefined;
  readonly timestamp: string;
}): ContinuityChain => ({
  rootSessionId: options.rootSessionId,
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
  }

  read(): Promise<ContinuityChain | null> {
    const pathValue = this.buildPath();
    return readJson<ContinuityChain>(pathValue);
  }

  async save(chain: ContinuityChain): Promise<void> {
    await writeJson(this.buildPath(), chain);
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
